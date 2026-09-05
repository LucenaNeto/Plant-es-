/**
 * Logger estruturado (JSON) para diagnóstico em produção.
 *
 * Decisões de projeto:
 * - Zero dependências: funciona igual no runtime Node e no Edge (`proxy.ts`).
 * - Saída em JSON de uma linha, que a Vercel indexa nativamente e permite
 *   filtrar por campo (`event`, `userId`, `requestId`) e exportar via drain.
 * - Nunca emite PII. Campos sensíveis são redigidos automaticamente, mesmo
 *   que alguém passe um objeto inteiro por engano.
 * - `child()` propaga contexto (requestId, userId) para que todos os logs de
 *   uma mesma operação sejam correlacionáveis.
 *
 * Para plugar Sentry/Axiom depois, basta alterar `emit()` — nenhum ponto de
 * chamada precisa mudar.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  error: 40,
  info: 20,
  warn: 30,
};

function resolveMinLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL?.toLowerCase();

  if (configured && configured in LEVEL_WEIGHT) {
    return configured as LogLevel;
  }

  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

const MIN_LEVEL = resolveMinLevel();

/**
 * Chaves cujo valor nunca deve chegar ao log. Comparadas em minúsculas para
 * pegar variações de escrita (passwordHash, contactPhone, etc.).
 */
const SENSITIVE_KEYS = new Set([
  "apikey",
  "authorization",
  "confirmpassword",
  "contactphone",
  "cookie",
  "email",
  "password",
  "passwordhash",
  "phone",
  "secret",
  "session",
  "token",
]);

const REDACTED = "[redacted]";
const MAX_DEPTH = 4;

function isSensitiveKey(key: string) {
  const normalized = key.toLowerCase();

  if (SENSITIVE_KEYS.has(normalized)) {
    return true;
  }

  return (
    normalized.endsWith("password") ||
    normalized.endsWith("token") ||
    normalized.endsWith("secret")
  );
}

function redact(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (depth >= MAX_DEPTH) {
    return "[depth-limit]";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redact(item, depth + 1));
  }

  const output: Record<string, unknown> = {};

  for (const [key, entryValue] of Object.entries(value)) {
    output[key] = isSensitiveKey(key) ? REDACTED : redact(entryValue, depth + 1);
  }

  return output;
}

/**
 * Converte um `unknown` de bloco catch em algo serializável e útil.
 * Preserva o código do Prisma, que é o que costuma explicar a falha.
 */
export function serializeError(error: unknown) {
  if (error instanceof Error) {
    const { code } = error as Error & { code?: unknown };

    return {
      code: typeof code === "string" ? code : undefined,
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  return { message: String(error), name: "NonError" };
}

function emit(level: LogLevel, event: string, context: LogContext) {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[MIN_LEVEL]) {
    return;
  }

  const entry = {
    level,
    event,
    time: new Date().toISOString(),
    ...(redact(context) as LogContext),
  };

  // `JSON.stringify` pode falhar com referência circular; o log nunca deve
  // derrubar a requisição que ele está observando.
  let line: string;

  try {
    line = JSON.stringify(entry);
  } catch {
    line = JSON.stringify({
      level,
      event,
      time: entry.time,
      serializationError: true,
    });
  }

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export type Logger = {
  child: (context: LogContext) => Logger;
  debug: (event: string, context?: LogContext) => void;
  error: (event: string, context?: LogContext) => void;
  info: (event: string, context?: LogContext) => void;
  warn: (event: string, context?: LogContext) => void;
};

function createLogger(boundContext: LogContext = {}): Logger {
  const log =
    (level: LogLevel) =>
    (event: string, context: LogContext = {}) =>
      emit(level, event, { ...boundContext, ...context });

  return {
    child: (context) => createLogger({ ...boundContext, ...context }),
    debug: log("debug"),
    error: log("error"),
    info: log("info"),
    warn: log("warn"),
  };
}

export const logger = createLogger();

/**
 * Id curto para correlacionar todos os logs de uma mesma operação.
 * `crypto.randomUUID` existe nos runtimes Node e Edge do Next 16.
 */
export function createRequestId() {
  return crypto.randomUUID().slice(0, 8);
}
