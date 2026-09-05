import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { auth } from "@/auth";
import { createRequestId, logger, serializeError } from "@/lib/logger";
import type { Logger } from "@/lib/logger";
import { describePrismaError } from "@/server/prisma-error";

/**
 * Equivalente de `runAuthenticatedAction` para Route Handlers.
 *
 * As mutações novas do MVP usam Server Actions, mas as rotas REST de unidades
 * continuam existindo (consumidas pela UI atual e úteis como superfície de
 * integração). Elas precisam das mesmas garantias — sessão verificada,
 * `requestId` correlacionado, nenhum detalhe interno vazando no corpo da
 * resposta — então compartilham este envelope em vez de repetir o bloco de
 * `if (!session?.user?.id)` em cada handler.
 */

export type ApiContext = {
  logger: Logger;
  requestId: string;
  userId: string;
};

type RouteHandler<TRouteArg> = (
  context: ApiContext,
  request: Request,
  routeArg: TRouteArg,
) => Promise<Response>;

// O default é `unknown` (e não `undefined`) porque o validador de rotas do
// Next 16 tipa o segundo argumento como `{ params: Promise<{}> }` mesmo em
// rotas sem segmento dinâmico. Parâmetro `unknown` aceita qualquer forma na
// checagem contravariante; `undefined` não aceitaria.
export function withApiAuth<TRouteArg = unknown>(
  routeName: string,
  handler: RouteHandler<TRouteArg>,
) {
  return async (request: Request, routeArg: TRouteArg): Promise<Response> => {
    const requestId = createRequestId();
    const startedAt = Date.now();

    let routeLogger = logger.child({ requestId, route: routeName });

    try {
      // Dentro do try pelo mesmo motivo do runner de actions: `auth()` lança
      // quando o cookie não descriptografa (segredo rotacionado, por exemplo),
      // e essa falha precisa virar log estruturado, não um 500 mudo.
      const session = await auth();
      const userId = session?.user?.id;

      if (!userId) {
        routeLogger.warn("api.unauthorized");

        return NextResponse.json(
          { message: "Não autenticado.", requestId },
          { status: 401 },
        );
      }

      routeLogger = routeLogger.child({ userId });

      const response = await handler(
        { logger: routeLogger, requestId, userId },
        request,
        routeArg,
      );

      routeLogger.info("api.handled", {
        durationMs: Date.now() - startedAt,
        status: response.status,
      });

      return response;
    } catch (error) {
      unstable_rethrow(error);

      const durationMs = Date.now() - startedAt;
      const known = describePrismaError(error);

      if (known) {
        routeLogger.warn("api.known_db_error", {
          durationMs,
          error: serializeError(error),
          status: known.status,
        });

        return NextResponse.json(
          { message: known.message, requestId },
          { status: known.status },
        );
      }

      routeLogger.error("api.failed", {
        durationMs,
        error: serializeError(error),
      });

      return NextResponse.json(
        { message: "Erro inesperado. Tente novamente.", requestId },
        { status: 500 },
      );
    }
  };
}

/** Resposta padrão de payload inválido, com erros no formato do Zod. */
export function validationResponse(
  errors: Record<string, string[] | undefined>,
  message = "Revise os campos informados.",
) {
  return NextResponse.json({ errors, message }, { status: 400 });
}

/**
 * Fábrica, não constante.
 *
 * Uma `Response` guarda o corpo num stream de uso único: compartilhar a mesma
 * instância entre requisições faz a segunda falhar com "Body is unusable", e
 * como isso acontece durante a serialização — já fora do try acima — vira um
 * 500 sem log. Cada 404 precisa de um objeto novo.
 */
export function notFoundResponse(message: string) {
  return NextResponse.json({ message }, { status: 404 });
}
