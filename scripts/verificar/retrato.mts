/** Retrato dos dados hoje, para embasar o backlog. So leitura. */
import { prisma } from "../../lib/db/prisma.js";

try {
  const [dono] = await prisma.$queryRaw<{ userId: string }[]>`
    SELECT "userId" FROM "Shift" GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 1
  `;
  const u = dono.userId;

  const porStatus = await prisma.$queryRaw<
    { paymentStatus: string; total: number; n: bigint }[]
  >`SELECT "paymentStatus", SUM("value")::float AS total, COUNT(*) AS n
    FROM "Shift" WHERE "userId" = ${u} AND "handoffTo" IS NULL
    GROUP BY 1 ORDER BY 2 DESC`;

  console.log("por situacao de pagamento:");
  for (const l of porStatus) {
    console.log(`  ${l.paymentStatus.padEnd(10)} ${l.n} plantoes  R$ ${l.total.toLocaleString("pt-BR")}`);
  }

  const [{ gastos, plantoes, unidades, regras, repassados }] =
    await prisma.$queryRaw<
      { gastos: bigint; plantoes: bigint; unidades: bigint; regras: bigint; repassados: bigint }[]
    >`SELECT
        (SELECT COUNT(*) FROM "Expense" WHERE "userId" = ${u}) AS gastos,
        (SELECT COUNT(*) FROM "Shift" WHERE "userId" = ${u}) AS plantoes,
        (SELECT COUNT(*) FROM "Unit" WHERE "userId" = ${u}) AS unidades,
        (SELECT COUNT(*) FROM "RecurringRule" WHERE "userId" = ${u}) AS regras,
        (SELECT COUNT(*) FROM "Shift" WHERE "userId" = ${u} AND "handoffTo" IS NOT NULL) AS repassados`;

  console.log(`\n${plantoes} plantoes · ${repassados} repassados · ${gastos} gastos · ${unidades} unidades · ${regras} regras`);

  const unidadesLista = await prisma.$queryRaw<
    { name: string; city: string; active: boolean; n: bigint }[]
  >`SELECT u."name", u."city", u."active", COUNT(s.id) AS n
    FROM "Unit" u LEFT JOIN "Shift" s ON s."unitId" = u.id
    WHERE u."userId" = ${u} GROUP BY 1,2,3 ORDER BY 4 DESC`;

  console.log("\nunidades:");
  for (const l of unidadesLista) {
    console.log(`  ${String(l.n).padStart(3)} plantoes  ${l.active ? " " : "x"} ${l.name}  (${l.city})`);
  }

  const horas = await prisma.$queryRaw<{ total: number }[]>`
    SELECT SUM("hours")::float AS total FROM "Shift"
    WHERE "userId" = ${u} AND "handoffTo" IS NULL`;
  console.log(`\n${horas[0].total}h trabalhadas no total`);
} finally {
  await prisma.$disconnect();
}
