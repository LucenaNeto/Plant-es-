/**
 * Passo 3 — copiar os dados para o projeto novo.
 *
 * Pré-requisito: o schema já existe no destino, criado por
 * `prisma migrate deploy` apontando para `NEW_DATABASE_URL` (passo 2 do
 * docs/MIGRACAO-REGIAO.md).
 *
 * **Preserva os ids.** Isso não é detalhe: `Shift.unitId` e `Shift.userId`
 * apontam para os registros pais, e o id do usuário é o `sub` do JWT da sessão.
 * Gerando ids novos, as relações se perdem e todo mundo é deslogado.
 *
 * Os hashes de senha vão verbatim — nenhuma senha é lida, alterada ou
 * conhecida no processo; o hash é copiado como qualquer outra coluna, e os
 * logins existentes continuam funcionando.
 *
 * A ordem de inserção respeita as chaves estrangeiras:
 *   User -> Unit -> RecurringRule -> Shift -> Expense
 *
 *   npx tsx scripts/migracao-regiao/2-copiar-dados.mts
 */
import { PrismaClient } from "@prisma/client";

const ORIGEM = process.env.DATABASE_URL;
const DESTINO = process.env.NEW_DATABASE_URL;

if (!ORIGEM || !DESTINO) {
  console.error("Defina DATABASE_URL e NEW_DATABASE_URL no .env.");
  process.exit(1);
}

if (ORIGEM.split("?")[0] === DESTINO.split("?")[0]) {
  console.error("ORIGEM e DESTINO apontam para o mesmo banco. Abortando.");
  process.exit(1);
}

const origem = new PrismaClient({ datasourceUrl: ORIGEM });
const destino = new PrismaClient({ datasourceUrl: DESTINO });

try {
  // Recusa rodar sobre um banco que já tem dados. Uma segunda execução
  // acidental duplicaria registros ou falharia no meio, deixando o destino
  // pela metade — pior que não ter começado.
  const jaExiste =
    (await destino.user.count()) +
    (await destino.unit.count()) +
    (await destino.shift.count()) +
    (await destino.expense.count()) +
    (await destino.recurringRule.count());

  if (jaExiste > 0) {
    console.error(
      `Destino já contém ${jaExiste} registro(s). Esperava um banco vazio.\n` +
        "Se a intenção é recomeçar, limpe o destino antes.",
    );
    process.exit(1);
  }

  console.log("Lendo origem...");
  const [users, units, rules, shifts, expenses] = await Promise.all([
    origem.user.findMany({ orderBy: { createdAt: "asc" } }),
    origem.unit.findMany({ orderBy: { createdAt: "asc" } }),
    origem.recurringRule.findMany({ orderBy: { createdAt: "asc" } }),
    origem.shift.findMany({ orderBy: { createdAt: "asc" } }),
    origem.expense.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  console.log(
    `  ${users.length} usuários, ${units.length} unidades, ${rules.length} recorrências, ` +
      `${shifts.length} plantões, ${expenses.length} gastos`,
  );

  console.log("\nEscrevendo no destino, na ordem das chaves estrangeiras...");

  // `createMany` com os objetos inteiros: como vieram de `findMany` do mesmo
  // schema, todas as colunas — id, createdAt, updatedAt, Decimal, Date —
  // atravessam com o tipo e o valor originais.
  const etapas = [
    ["usuários", () => destino.user.createMany({ data: users })],
    ["unidades", () => destino.unit.createMany({ data: units })],
    ["recorrências", () => destino.recurringRule.createMany({ data: rules })],
    ["plantões", () => destino.shift.createMany({ data: shifts })],
    ["gastos", () => destino.expense.createMany({ data: expenses })],
  ] as const;

  for (const [rotulo, executar] of etapas) {
    const { count } = await executar();
    console.log(`  ${rotulo}: ${count} inserido(s)`);
  }

  console.log("\nCópia concluída. Rode o passo 4 para conferir:");
  console.log("  npx tsx scripts/migracao-regiao/3-verificar.mts");
} finally {
  await origem.$disconnect();
  await destino.$disconnect();
}
