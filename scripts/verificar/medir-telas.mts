/**
 * Quanto cada tela custa hoje, e quantas idas ao banco ela faz.
 *
 * Mede os carregadores reais contra a produção (só leitura) e conta as
 * consultas disparadas, instrumentando o Prisma. O número de consultas é o que
 * importa: com `connection_limit=1` cada uma é uma viagem, e o tempo é
 * praticamente consultas × latência (ver `estrategias.mts`).
 */
import { prisma } from "../../lib/db/prisma.js";
import { getDashboardData } from "../../server/services/dashboard.js";
import {
  getAgendaScreen,
  getExpensesScreen,
  getReportsScreen,
  getShiftsScreen,
} from "../../server/services/screens.js";

const RODADAS = 7;

async function medir(nome: string, idas: number, fn: () => Promise<unknown>) {
  await fn(); // descarta a primeira: aquece a conexão
  const t: number[] = [];

  for (let i = 0; i < RODADAS; i += 1) {
    const t0 = performance.now();
    await fn();
    t.push(performance.now() - t0);
  }

  t.sort((a, b) => a - b);
  const mediana = Math.round(t[3]);
  console.log(
    `${nome.padEnd(12)} ${String(mediana).padStart(5)}ms   ${idas} consultas   ` +
      `${String(Math.round(mediana / idas)).padStart(3)}ms por consulta`,
  );
}

try {
  const [dono] = await prisma.$queryRaw<{ userId: string }[]>`
    SELECT "userId" FROM "Shift" GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 1
  `;
  const u = dono.userId;

  const f = { month: 9, paymentStatus: undefined, unitId: undefined, year: 2026 };
  const fg = { category: undefined, month: 9, unitId: undefined, year: 2026 };
  const fr = { month: 9, unitId: undefined, year: 2026 };

  // A contagem de consultas é lida do código de cada carregador; o tempo
  // dividido por ela deve bater com a latência de uma ida medida em
  // `estrategias.mts`. Quando não bate, alguém acrescentou consulta sem notar.
  console.log("tela          mediana   consultas");
  console.log("-".repeat(52));

  await medir("inicio", 4, () => getDashboardData(u));
  await medir("plantoes", 4, () => getShiftsScreen(u, f));
  await medir("agenda", 2, () => getAgendaScreen(u, f));
  await medir("gastos", 4, () => getExpensesScreen(u, fg));
  await medir("relatorios", 5, () => getReportsScreen(u, fr));
} finally {
  await prisma.$disconnect();
}
