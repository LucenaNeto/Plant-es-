import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { createRequestId, logger, serializeError } from "@/lib/logger";
import type { Logger } from "@/lib/logger";

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
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      logger.warn("api.unauthorized", { requestId, route: routeName });

      return NextResponse.json(
        { message: "Não autenticado.", requestId },
        { status: 401 },
      );
    }

    const routeLogger = logger.child({ requestId, route: routeName, userId });

    try {
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
      const durationMs = Date.now() - startedAt;

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        routeLogger.warn("api.known_db_error", {
          code: error.code,
          durationMs,
          error: serializeError(error),
        });

        return NextResponse.json(
          { message: "Não foi possível concluir a operação.", requestId },
          { status: 409 },
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
