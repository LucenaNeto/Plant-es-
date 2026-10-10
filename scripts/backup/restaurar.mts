/**
 * Restaura um backup gerado por `exportar.mts`.
 *
 * Pré-requisito: o schema já existe no destino — `prisma migrate deploy`
 * primeiro. Este script repõe **dados**, não estrutura.
 *
 * **Recusa banco não vazio por padrão.** Restaurar por cima de dados existentes
 * é quase sempre engano, e o engano é irreversível. Quem realmente quer
 * sobrescrever passa `--forcar`, e aí o script apaga tudo antes — explicitamente,
 * não por acidente.
 *
 *   npx tsx scripts/backup/restaurar.mts backups/plantoes-2026-10-09.json
 *   npx tsx scripts/backup/restaurar.mts arquivo.json --forcar
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const arquivo = process.argv[2];
const forcar = process.argv.includes("--forcar");

if (!arquivo) {
  console.error("Uso: restaurar.mts <arquivo.json> [--forcar]");
  process.exit(1);
}

const prisma = new PrismaClient();

/** Datas voltam do JSON como string; o Prisma exige `Date`. */
const CAMPOS_DATA = [
  "createdAt",
  "updatedAt",
  "shiftDate",
  "expenseDate",
] as const;

function reidratar<T extends Record<string, unknown>>(registro: T): T {
  const saida = { ...registro };

  for (const campo of CAMPOS_DATA) {
    if (typeof saida[campo] === "string") {
      (saida as Record<string, unknown>)[campo] = new Date(
        saida[campo] as string,
      );
    }
  }

  return saida;
}

try {
  const backup = JSON.parse(readFileSync(arquivo, "utf8"));
  const meta = backup._meta ?? {};

  console.log(`Backup de ${meta.exportadoEm ?? "data desconhecida"}`);
  console.log(`  origem: ${meta.origem ?? "desconhecida"}`);
  console.log(`  destino: ${process.env.DATABASE_URL?.match(/@([^:/]+)/)?.[1]}`);

  /**
   * Confere se o destino tem as mesmas migrations do backup. Restaurar dados
   * antigos num schema diferente falha no meio, deixando o banco pela metade —
   * pior que não ter começado.
   */
  const aplicadas = await prisma.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL
  `;
  const noDestino = new Set(aplicadas.map((l) => l.migration_name));
  const faltando = (meta.migrations ?? []).filter(
    (nome: string) => !noDestino.has(nome),
  );

  if (faltando.length > 0) {
    console.error(
      `\nERRO: o destino não tem estas migrations: ${faltando.join(", ")}.\n` +
        "Rode `prisma migrate deploy` antes de restaurar.",
    );
    process.exit(1);
  }

  const existentes =
    (await prisma.user.count()) +
    (await prisma.unit.count()) +
    (await prisma.shift.count());

  if (existentes > 0 && !forcar) {
    console.error(
      `\nERRO: o destino já tem ${existentes} registro(s).\n` +
        "Para sobrescrever, repita o comando com --forcar (apaga tudo antes).",
    );
    process.exit(1);
  }

  if (existentes > 0 && forcar) {
    console.log(`\nApagando ${existentes} registro(s) do destino...`);

    // Ordem inversa das dependências: filhos antes dos pais.
    await prisma.expense.deleteMany();
    await prisma.shift.deleteMany();
    await prisma.recurringRule.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.user.deleteMany();
  }

  console.log("\nRestaurando, na ordem das chaves estrangeiras...");

  const etapas = [
    ["users", () => prisma.user.createMany({ data: backup.users.map(reidratar) })],
    ["units", () => prisma.unit.createMany({ data: backup.units.map(reidratar) })],
    [
      "recurringRules",
      () =>
        prisma.recurringRule.createMany({
          data: backup.recurringRules.map(reidratar),
        }),
    ],
    ["shifts", () => prisma.shift.createMany({ data: backup.shifts.map(reidratar) })],
    [
      "expenses",
      () => prisma.expense.createMany({ data: backup.expenses.map(reidratar) }),
    ],
  ] as const;

  for (const [nome, executar] of etapas) {
    const { count } = await executar();
    const esperado = meta.contagem?.[nome];

    console.log(
      `  ${nome.padEnd(16)} ${count}` +
        (esperado !== undefined && esperado !== count
          ? `  ATENÇÃO: o backup tinha ${esperado}`
          : ""),
    );
  }

  console.log("\nRestauração concluída.");
} finally {
  await prisma.$disconnect();
}
