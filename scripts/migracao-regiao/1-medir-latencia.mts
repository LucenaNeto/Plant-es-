/**
 * Passo 1 — medir antes de mover.
 *
 * Compara a latência do banco atual (`DATABASE_URL`, Canadá) com a do banco
 * novo (`NEW_DATABASE_URL`, São Paulo), nos dois modos do pooler.
 *
 * A premissa da migração inteira é que a distância é a causa da lentidão. Esta
 * medição custa dois minutos e prova — ou derruba — essa premissa antes de
 * mexermos em qualquer dado. Se São Paulo não entregar o ganho, paramos aqui.
 *
 *   npx tsx scripts/migracao-regiao/1-medir-latencia.mts
 */
import { PrismaClient } from "@prisma/client";

const ATUAL = process.env.DATABASE_URL;
const NOVO = process.env.NEW_DATABASE_URL;

if (!ATUAL) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

if (!NOVO) {
  console.error(
    "NEW_DATABASE_URL não definida.\n" +
      "Coloque a connection string do projeto novo no .env — não cole no chat.",
  );
  process.exit(1);
}

const AMOSTRAS = 8;

async function medir(rotulo: string, url: string) {
  const prisma = new PrismaClient({ datasourceUrl: url });

  try {
    // Aquece: a primeira conexão paga o handshake e distorceria a mediana.
    await prisma.$queryRaw`SELECT 1`;

    const tempos: number[] = [];

    for (let i = 0; i < AMOSTRAS; i++) {
      const inicio = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      tempos.push(Date.now() - inicio);
    }

    tempos.sort((a, b) => a - b);

    // Três consultas em paralelo é o que as páginas de fato fazem.
    const inicioParalelo = Date.now();
    await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      prisma.$queryRaw`SELECT 2`,
      prisma.$queryRaw`SELECT 3`,
    ]);
    const paralelo = Date.now() - inicioParalelo;

    console.log(
      `  ${rotulo.padEnd(40)} mediana ${String(tempos[Math.floor(AMOSTRAS / 2)]).padStart(4)}ms` +
        `  min ${String(tempos[0]).padStart(4)}ms` +
        `  3 em paralelo ${String(paralelo).padStart(4)}ms`,
    );
  } catch (error) {
    console.log(
      `  ${rotulo.padEnd(40)} FALHOU: ${(error as Error).message.split("\n")[0]}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

/** Troca a porta do pooler mantendo o resto da URL intacto. */
function comPorta(url: string, porta: number, params = "") {
  const base = url.split("?")[0].replace(/:\d+\//, `:${porta}/`);
  return params ? `${base}?${params}` : base;
}

console.log("=== ATUAL (ca-central-1, Canadá) ===");
await medir("session 5432, limit=1", comPorta(ATUAL, 5432, "connection_limit=1"));

console.log("\n=== NOVO (sa-east-1, São Paulo) ===");
await medir("session 5432, limit=1", comPorta(NOVO, 5432, "connection_limit=1"));
await medir(
  "transaction 6543, limit=1",
  comPorta(NOVO, 6543, "pgbouncer=true&connection_limit=1"),
);

console.log(
  "\nO que procurar: se o transaction mode em São Paulo ficar próximo do\n" +
    "session mode, vale adotá-lo — ele é o modo correto para serverless e\n" +
    "some com o risco de esgotar o pool.",
);
