import { PrismaClient } from "@prisma/client";
import { logger, serializeError } from "@/lib/logger";

const DEFAULT_SLOW_QUERY_MS = 500;

/**
 * Limite acima do qual uma consulta é considerada lenta e vira `warn`.
 * O plano gratuito de Postgres serverless costuma ter latência de rede alta,
 * então o alvo aqui é pegar N+1 e falta de índice, não microssegundos.
 *
 * A validação existe porque `Number("500ms")` é `NaN` e toda comparação com
 * `NaN` é falsa: um valor mal digitado no painel da Vercel desligaria a
 * detecção inteira em silêncio, e o time concluiria que não há consulta lenta
 * quando na verdade o detector estaria morto.
 */
function resolveSlowQueryMs() {
  const raw = process.env.SLOW_QUERY_MS;

  if (!raw) {
    return DEFAULT_SLOW_QUERY_MS;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    logger.warn("config.invalid_slow_query_ms", {
      fallback: DEFAULT_SLOW_QUERY_MS,
      received: raw,
    });

    return DEFAULT_SLOW_QUERY_MS;
  }

  return parsed;
}

const SLOW_QUERY_MS = resolveSlowQueryMs();

function createPrismaClient() {
  const client = new PrismaClient({
    log: [
      { emit: "event", level: "error" },
      { emit: "event", level: "warn" },
    ],
  });

  client.$on("error", (event) => {
    logger.error("prisma.error", { message: event.message, target: event.target });
  });

  client.$on("warn", (event) => {
    logger.warn("prisma.warn", { message: event.message, target: event.target });
  });

  /**
   * Instrumenta toda operação para medir duração. Diferente de ligar o log de
   * `query` do Prisma, isto não despeja SQL (que pode conter dados pessoais nos
   * parâmetros) — registra só modelo, operação e tempo.
   */
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, model, operation, query }) {
          const startedAt = Date.now();

          try {
            const result = await query(args);
            const durationMs = Date.now() - startedAt;

            if (durationMs >= SLOW_QUERY_MS) {
              logger.warn("prisma.slow_query", { durationMs, model, operation });
            }

            return result;
          } catch (error) {
            logger.error("prisma.query_failed", {
              durationMs: Date.now() - startedAt,
              error: serializeError(error),
              model,
              operation,
            });

            throw error;
          }
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma?: ExtendedPrismaClient;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
