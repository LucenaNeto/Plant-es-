import { unstable_rethrow } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import {
  actionFail,
  type ActionResult,
  type FieldErrors,
} from "@/lib/action-result";
import { createRequestId, logger, serializeError } from "@/lib/logger";
import type { Logger } from "@/lib/logger";

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

/**
 * Traduz erros conhecidos do Prisma em falhas com mensagem útil.
 * Retorna `null` quando o erro não é reconhecido, para cair no caminho
 * genérico de "erro inesperado".
 */
function mapPrismaError(error: unknown, requestId: string) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  if (error.code === "P2002") {
    return actionFail("conflict", "Já existe um registro com esses dados.", {
      requestId,
    });
  }

  if (error.code === "P2025") {
    return actionFail("not_found", "Registro não encontrado.", { requestId });
  }

  if (error.code === "P2003") {
    return actionFail(
      "conflict",
      "Este registro está vinculado a outros e não pode ser alterado.",
      { requestId },
    );
  }

  return null;
}

export async function runAuthenticatedAction<TData>(
  actionName: string,
  handler: ActionHandler<TData>,
): Promise<ActionResult<TData>> {
  const requestId = createRequestId();
  const startedAt = Date.now();
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    logger.warn("action.unauthorized", { action: actionName, requestId });

    return actionFail(
      "unauthorized",
      "Sua sessão expirou. Entre novamente para continuar.",
      { requestId },
    );
  }

  const actionLogger = logger.child({ action: actionName, requestId, userId });

  actionLogger.debug("action.start");

  try {
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
    const mapped = mapPrismaError(error, requestId);

    if (mapped) {
      actionLogger.warn("action.known_db_error", {
        code: mapped.code,
        durationMs,
        error: serializeError(error),
      });

      return mapped;
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
