import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRequestId, logger, serializeError } from "@/lib/logger";

/**
 * A redação de PII do logger é uma rede de segurança, não um enfeite: o
 * CLAUDE.md proíbe logar e-mail, telefone e senha, e estes testes são o que
 * impede a proibição de virar só uma frase num arquivo. Um log vai para a
 * Vercel, de onde não se apaga seletivamente — o campo vazado fica lá.
 */

/** Captura o que o logger escreveu, já desserializado. */
function capturar(fn: () => void) {
  const linhas: Record<string, unknown>[] = [];
  // `emit` usa console.error e console.warn nos níveis correspondentes e
  // console.log no resto — por isso os quatro são capturados.
  const originais = {
    error: console.error,
    log: console.log,
    warn: console.warn,
  };

  const coletar = (linha: unknown) => {
    linhas.push(JSON.parse(String(linha)));
  };

  console.error = coletar;
  console.log = coletar;
  console.warn = coletar;

  try {
    fn();
  } finally {
    Object.assign(console, originais);
  }

  return linhas;
}

describe("redação de PII", () => {
  it("apaga e-mail, telefone e senha do contexto", () => {
    const [linha] = capturar(() =>
      logger.info("user.registered", {
        contactPhone: "+55 82 99999-0000",
        email: "medico@exemplo.com",
        password: "segredo-em-claro",
        userId: "usr_123",
      }),
    );

    assert.equal(linha.email, "[redacted]");
    assert.equal(linha.contactPhone, "[redacted]");
    assert.equal(linha.password, "[redacted]");
    // userId é justamente o que PODE ser logado: identifica sem expor.
    assert.equal(linha.userId, "usr_123");
  });

  it("apaga também os campos aninhados", () => {
    const [linha] = capturar(() =>
      logger.warn("auth.failed", {
        payload: { credenciais: { email: "a@b.com", password: "x" } },
      }),
    );

    const payload = linha.payload as Record<string, Record<string, unknown>>;

    assert.equal(payload.credenciais.email, "[redacted]");
    assert.equal(payload.credenciais.password, "[redacted]");
  });

  it("pega sufixos, não só nomes exatos", () => {
    const [linha] = capturar(() =>
      logger.info("teste", {
        accessToken: "a",
        authSecret: "b",
        userPassword: "c",
      }),
    );

    assert.equal(linha.accessToken, "[redacted]");
    assert.equal(linha.authSecret, "[redacted]");
    assert.equal(linha.userPassword, "[redacted]");
  });

  it("não se perde num objeto que referencia a si mesmo", () => {
    const circular: Record<string, unknown> = { nome: "raiz" };
    circular.eu = circular;

    assert.doesNotThrow(() => capturar(() => logger.info("teste", { circular })));
  });

  it("corta array longo em vez de despejar tudo", () => {
    const [linha] = capturar(() =>
      logger.info("teste", { ids: Array.from({ length: 500 }, (_, i) => i) }),
    );

    assert.equal((linha.ids as unknown[]).length, 20);
  });
});

describe("formato da linha", () => {
  it("sempre traz level, event e time", () => {
    const [linha] = capturar(() => logger.info("unit.created", {}));

    assert.equal(linha.level, "info");
    assert.equal(linha.event, "unit.created");
    assert.match(String(linha.time), /^\d{4}-\d{2}-\d{2}T/);
  });

  it("escreve uma linha de JSON válido, que é como a Vercel indexa", () => {
    const linhas = capturar(() => {
      logger.info("a", {});
      logger.error("b", {});
    });

    assert.equal(linhas.length, 2);
    assert.equal(linhas[1].level, "error");
  });
});

describe("serializeError", () => {
  it("preserva o código do Prisma, que é o que explica a falha", () => {
    const erro = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
    });

    const saida = serializeError(erro) as Record<string, unknown>;

    assert.equal(saida.code, "P2002");
    assert.match(String(saida.message), /Unique constraint/);
  });

  it("aguenta o que não é Error", () => {
    assert.doesNotThrow(() => serializeError("string solta"));
    assert.doesNotThrow(() => serializeError(null));
    assert.doesNotThrow(() => serializeError({ qualquer: "coisa" }));
  });
});

describe("createRequestId", () => {
  it("não repete", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createRequestId()));

    assert.equal(ids.size, 1000);
  });

  it("devolve string não vazia, que serve de chave de busca no log", () => {
    const id = createRequestId();

    assert.equal(typeof id, "string");
    assert.ok(id.length > 0);
  });
});
