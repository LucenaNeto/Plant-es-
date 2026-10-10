/**
 * Três estratégias para o mesmo conjunto de consultas, sob a conexão real.
 *
 * O CLAUDE.md registra que agrupar em `$transaction` levou quatro consultas de
 * ~1130ms para ~630ms. Esta medição existe para confirmar se a regra continua
 * valendo depois da troca de região do banco — e se ela vale também quando a
 * alternativa é `Promise.all`, e não `await` em sequência.
 */
import { prisma } from "../../lib/db/prisma.js";

const RODADAS = 11;

function consultas(userId: string) {
  return [
    prisma.shift.findMany({ take: 50, where: { userId } }),
    prisma.unit.findMany({ where: { userId } }),
    prisma.recurringRule.findMany({ where: { userId } }),
    prisma.expense.findMany({ take: 50, where: { userId } }),
  ] as const;
}

async function medir(nome: string, fn: () => Promise<unknown>) {
  await fn();
  const t: number[] = [];

  for (let i = 0; i < RODADAS; i += 1) {
    const t0 = performance.now();
    await fn();
    t.push(performance.now() - t0);
  }

  t.sort((a, b) => a - b);
  console.log(
    `${nome.padEnd(26)} mediana ${String(Math.round(t[5])).padStart(5)}ms   ` +
      `min ${String(Math.round(t[0])).padStart(5)}ms   max ${String(Math.round(t[RODADAS - 1])).padStart(5)}ms`,
  );
  return Math.round(t[5]);
}

try {
  const [dono] = await prisma.$queryRaw<{ userId: string }[]>`
    SELECT "userId" FROM "Shift" GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 1
  `;
  const u = dono.userId;

  console.log("quatro consultas, mesmo usuário\n");

  const seq = await medir("await em sequência", async () => {
    for (const q of consultas(u)) await q;
  });
  const par = await medir("Promise.all", () => Promise.all(consultas(u)));
  const tx = await medir("$transaction", () => prisma.$transaction([...consultas(u)]));

  console.log("\numa consulta só, para ter a referência de uma ida:\n");
  const uma = await medir("1 consulta", () => prisma.unit.findMany({ where: { userId: u } }));

  console.log(
    `\numa ida ≈ ${uma}ms · sequência ≈ ${(seq / uma).toFixed(1)} idas · ` +
      `Promise.all ≈ ${(par / uma).toFixed(1)} idas · $transaction ≈ ${(tx / uma).toFixed(1)} idas`,
  );
} finally {
  await prisma.$disconnect();
}
