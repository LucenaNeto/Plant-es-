/** Quantas contas existem no banco de producao. So leitura, sem PII no log. */
import { prisma } from "../../lib/db/prisma.js";

try {
  const contas = await prisma.$queryRaw<
    { id: string; criadaEm: Date; plantoes: bigint; dominio: string }[]
  >`SELECT u.id,
           u."createdAt" AS "criadaEm",
           COUNT(s.id) AS plantoes,
           split_part(u.email, '@', 2) AS dominio
    FROM "User" u LEFT JOIN "Shift" s ON s."userId" = u.id
    GROUP BY 1, 2, 4 ORDER BY 3 DESC`;

  console.log(`${contas.length} conta(s) no banco:\n`);
  for (const c of contas) {
    console.log(
      `  ${c.id.slice(0, 10)}…  ${String(c.plantoes).padStart(3)} plantoes  ` +
        `criada em ${c.criadaEm.toISOString().slice(0, 10)}  @${c.dominio}`,
    );
  }
} finally {
  await prisma.$disconnect();
}
