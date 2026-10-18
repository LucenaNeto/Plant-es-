/**
 * Confere que as duas conexões do `.env` respondem, e em que regime cada uma
 * está. Só leitura.
 *
 * A `DATABASE_URL` tem que estar na 6543 com `pgbouncer=true` — é o que a
 * produção usa, e medir ou desenvolver na 5432 dá respostas diferentes das
 * reais. A `DIRECT_URL` tem que continuar na 5432 sem parâmetros: migrations
 * precisam de sessão dedicada para DDL.
 */
import { PrismaClient } from "@prisma/client";

async function checar(nome: string, url: string | undefined) {
  if (!url) {
    console.log(`  ${nome.padEnd(13)} AUSENTE`);
    return false;
  }

  const u = new URL(url);
  const modo = u.port === "6543" ? "transaction (poolada)" : "session (direta)";
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  try {
    const t0 = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const ms = Math.round(performance.now() - t0);

    console.log(
      `  ${nome.padEnd(13)} ok · porta ${u.port} · ${modo} · ${ms}ms` +
        `${u.search ? ` · ${u.search.slice(1)}` : " · sem parâmetros"}`,
    );
    return true;
  } catch (erro) {
    console.log(`  ${nome.padEnd(13)} FALHOU: ${String(erro).slice(0, 120)}`);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

console.log("conexões do .env:\n");

const app = await checar("DATABASE_URL", process.env.DATABASE_URL);
const direta = await checar("DIRECT_URL", process.env.DIRECT_URL);

const urlApp = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const avisos: string[] = [];

if (urlApp?.port !== "6543") {
  avisos.push("a DATABASE_URL não está na 6543 — a produção está, e medir aqui vai mentir");
}
if (!urlApp?.searchParams.get("pgbouncer")) {
  avisos.push("falta pgbouncer=true na DATABASE_URL");
}
if (urlApp?.searchParams.get("connection_limit") !== "1") {
  avisos.push("falta connection_limit=1 na DATABASE_URL");
}

console.log(
  avisos.length === 0
    ? "\nConfiguração igual à da produção."
    : `\n${avisos.map((a) => `AVISO: ${a}`).join("\n")}`,
);

process.exitCode = app && direta && avisos.length === 0 ? 0 : 1;
