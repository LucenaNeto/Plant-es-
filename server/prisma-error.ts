import { Prisma } from "@prisma/client";
import type { ActionErrorCode } from "@/lib/action-result";

/**
 * Tradução única de erro do Prisma para linguagem de aplicação.
 *
 * Antes existiam duas: `mapPrismaError` no runner de actions distinguia
 * P2002/P2025/P2003, e o catch de `withApiAuth` respondia 409 para qualquer
 * erro conhecido. A mesma condição no banco produzia respostas diferentes
 * conforme a superfície — REST ou Server Action — que o cliente usasse.
 */

export type PrismaErrorInfo = {
  actionCode: ActionErrorCode;
  message: string;
  status: number;
};

const BY_CODE: Record<string, PrismaErrorInfo> = {
  // Violação de restrição única.
  P2002: {
    actionCode: "conflict",
    message: "Já existe um registro com esses dados.",
    status: 409,
  },
  // Violação de chave estrangeira.
  P2003: {
    actionCode: "conflict",
    message: "Este registro está vinculado a outros e não pode ser alterado.",
    status: 409,
  },
  // Registro exigido pela operação não foi encontrado.
  P2025: {
    actionCode: "not_found",
    message: "Registro não encontrado.",
    status: 404,
  },
};

/** Retorna `null` para erro não reconhecido, que deve virar "erro inesperado". */
export function describePrismaError(error: unknown): PrismaErrorInfo | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  return BY_CODE[error.code] ?? null;
}
