/** Tempo de execucao real das consultas quentes, sem a rede. So leitura. */
import { prisma } from "../../lib/db/prisma.js";

try {
  const [dono] = await prisma.$queryRaw<{ userId: string }[]>`
    SELECT "userId" FROM "Shift" GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 1
  `;
  const u = dono.userId;

  const consultas: [string, string][] = [
    ["plantoes do mes", `SELECT * FROM "Shift" WHERE "userId" = '${u}' AND "shiftDate" >= '2026-09-01' AND "shiftDate" < '2026-10-01'`],
    ["agregado do relatorio", `SELECT EXTRACT(YEAR FROM "shiftDate"), EXTRACT(MONTH FROM "shiftDate"), SUM("hours"), SUM("value"), COUNT(*) FROM "Shift" WHERE "userId" = '${u}' AND "handoffTo" IS NULL GROUP BY 1,2`],
    ["horizonte das regras", `SELECT "recurringRuleId", MAX("shiftDate") FROM "Shift" WHERE "userId" = '${u}' AND "recurringRuleId" IS NOT NULL GROUP BY 1`],
    ["gastos do mes", `SELECT * FROM "Expense" WHERE "userId" = '${u}' AND "expenseDate" >= '2026-09-01' AND "expenseDate" < '2026-10-01'`],
    ["unidades", `SELECT * FROM "Unit" WHERE "userId" = '${u}'`],
  ];

  console.log("consulta                   execucao   plano");
  console.log("-".repeat(72));

  for (const [nome, sql] of consultas) {
    const linhas = await prisma.$queryRawUnsafe<{ "QUERY PLAN": string }[]>(
      `EXPLAIN (ANALYZE, TIMING OFF, SUMMARY ON) ${sql}`,
    );
    const texto = linhas.map((l) => l["QUERY PLAN"]).join("\n");
    const tempo = /Execution Time: ([\d.]+) ms/.exec(texto)?.[1] ?? "?";
    const plano = /(Seq Scan|Index Scan|Bitmap Heap Scan|Index Only Scan)[^\n]*/.exec(texto)?.[0] ?? "?";

    console.log(`${nome.padEnd(26)} ${tempo.padStart(6)}ms   ${plano.slice(0, 40)}`);
  }

  const [{ count: total }] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count FROM "Shift"
  `;
  console.log(`\n${total} plantoes no banco.`);
} finally {
  await prisma.$disconnect();
}
