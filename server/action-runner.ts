import { unstable_rethrow } from "next/navigation";
import { auth } from "@/auth";
import {
  actionFail,
  type ActionResult,
  type FieldErrors,
} from "@/lib/action-result";
import { createRequestId, logger, serializeError } from "@/lib/logger";
import type { Logger } from "@/lib/logger";
import { describePrismaError } from "@/server/prisma-error";

/**
 * Envelope padrão de toda Server Action autenticada.
 *
 * Concentra num lugar só as quatro coisas que, esquecidas, viram incidente:
 *
 * 1. **Autorização.** Os docs do Next avisam que Server Actions são
 *    alcançáveis por POST direto, fora da UI. Toda action precisa verificar
 *    sessão — aqui isso é estrutural, não disciplina do desenvolvedor.
 * 2. **Correlação.** Cada execução ganha um `requestId` que acompanha todos os
 *    logs daquela operação e volta ao cliente quando dá erro, para o usuário
 *    reportar e nós acharmos a linha exata na Vercel.
 * 3. **Vazamento de erro.** Exceção inesperada nunca chega ao cliente com
 *    stack ou mensagem do banco; vira uma mensagem genérica e um log completo.
 * 4. **Exceções de controle do framework.** `redirect()` e `notFound()`
 *    funcionam lançando — `unstable_rethrow` garante que o catch aqui não as
 *    engula silenciosamente.
 */

export type ActionContext = {
  logger: Logger;
  requestId: string;
  userId: string;
};

type ActionHandler<TData> = (
  context: ActionContext,
) => Promise<ActionResult<TData>>;

export async function runAuthenticatedAction<TData>(
  actionName: string,
  handler: ActionHandler<TData>,
): Promise<ActionResult<TData>> {
  const requestId = createRequestId();
  const startedAt = Date.now();

  // Começa sem `userId` e é reatribuído assim que a sessão resolve, para que o
  // catch tenha um logger utilizável mesmo quando a falha for na própria
  // resolução da sessão.
  let actionLogger = logger.child({ action: actionName, requestId });

  try {
    // `auth()` fica DENTRO do try de propósito: com `AUTH_SECRET` rotacionado,
    // todo cookie existente falha na descriptografia e esta chamada lança. Se
    // ela estivesse fora, a exceção contornaria justamente o log e a mensagem
    // amigável que este envelope existe para garantir.
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      actionLogger.warn("action.unauthorized");

      return actionFail(
        "unauthorized",
        "Sua sessão expirou. Entre novamente para continuar.",
        { requestId },
      );
    }

    actionLogger = actionLogger.child({ userId });
    actionLogger.debug("action.start");

    const result = await handler({
      logger: actionLogger,
      requestId,
      userId,
    });

    const durationMs = Date.now() - startedAt;

    if (result.ok) {
      actionLogger.info("action.success", { durationMs });
    } else {
      // Falha esperada (validação, não encontrado). É sinal de UX, não de bug,
      // então entra como `warn` e não polui o canal de erros.
      actionLogger.warn("action.rejected", { code: result.code, durationMs });
    }

    return result;
  } catch (error) {
    unstable_rethrow(error);

    const durationMs = Date.now() - startedAt;
    const known = describePrismaError(error);

    if (known) {
      actionLogger.warn("action.known_db_error", {
        code: known.actionCode,
        durationMs,
        error: serializeError(error),
      });

      return actionFail(known.actionCode, known.message, { requestId });
    }

    actionLogger.error("action.failed", {
      durationMs,
      error: serializeError(error),
    });

    return actionFail(
      "unexpected",
      `Algo deu errado. Tente novamente. (código ${requestId})`,
      { requestId },
    );
  }
}

/**
 * Açúcar para o caso mais comum: validar com Zod antes de executar.
 * Mantém a forma dos erros idêntica em todas as actions, o que permite que os
 * formulários compartilhem o mesmo componente de exibição de erro por campo.
 */
export function validationFailure(
  errors: FieldErrors,
  message = "Revise os campos destacados.",
) {
  return actionFail("validation", message, { errors });
}
