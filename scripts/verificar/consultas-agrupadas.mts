/**
 * Confere que agrupar as consultas não mudou nenhum número.
 *
 * Compara, mês a mês, a saída dos serviços antigos (`listShifts`,
 * `summarizeShifts`, `listExpenses`, `summarizeExpenses`, `getReport`) com a
 * dos carregadores de tela novos. Só leitura; nada escreve no banco.
 */
import { prisma } from "../../lib/db/prisma.js";
import {
  listShifts,
  summarizeShifts,
} from "../../server/services/shifts.js";
import {
  listExpenses,
  summarizeExpenses,
} from "../../server/services/expenses.js";
import { listUnits } from "../../server/services/units.js";
import { listRules } from "../../server/services/recurring-rules.js";
import { getReport, listReportYears } from "../../server/services/reports.js";
import {
  getAgendaScreen,
  getExpensesScreen,
  getReportsScreen,
  getShiftsScreen,
} from "../../server/services/screens.js";

let falhas = 0;

function conferir(nome: string, antes: unknown, depois: unknown) {
  const a = JSON.stringify(antes);
  const b = JSON.stringify(depois);

  if (a === b) {
    console.log(`  ok    ${nome}`);
    return;
  }

  falhas += 1;
  console.log(`  FALHA ${nome}`);
  console.log(`        antes : ${a?.slice(0, 220)}`);
  console.log(`        depois: ${b?.slice(0, 220)}`);
}

try {
  // O usuário com mais plantões: é o que exercita todos os caminhos.
  const [dono] = await prisma.$queryRaw<{ userId: string; total: bigint }[]>`
    SELECT "userId", COUNT(*) AS total FROM "Shift"
    GROUP BY 1 ORDER BY 2 DESC LIMIT 1
  `;
  const userId = dono.userId;

  // Os meses que realmente têm dados, mais um vazio de controle.
  const meses = await prisma.$queryRaw<{ ano: number; mes: number }[]>`
    SELECT DISTINCT EXTRACT(YEAR FROM "shiftDate")::int AS ano,
                    EXTRACT(MONTH FROM "shiftDate")::int AS mes
    FROM "Shift" WHERE "userId" = ${userId} ORDER BY 1, 2
  `;
  const periodos = [...meses, { ano: 1999, mes: 1 }];

  console.log(`Usuário ${userId.slice(0, 8)}… · ${periodos.length} períodos\n`);

  const statuses = [undefined, "predicted", "pending", "received"] as const;

  for (const { ano, mes } of periodos) {
    console.log(`${ano}-${String(mes).padStart(2, "0")}`);

    for (const paymentStatus of statuses) {
      const filtros = { month: mes, paymentStatus, unitId: undefined, year: ano };
      const rotulo = paymentStatus ?? "todos";

      const [antesLista, antesResumo, tela] = [
        await listShifts(userId, filtros),
        await summarizeShifts(userId, filtros),
        await getShiftsScreen(userId, filtros),
      ];

      conferir(`plantoes lista   (${rotulo})`, antesLista, tela.shifts);
      conferir(`plantoes resumo  (${rotulo})`, antesResumo, tela.summary);
    }

    const filtrosMes = {
      month: mes,
      paymentStatus: undefined,
      unitId: undefined,
      year: ano,
    };

    const agenda = await getAgendaScreen(userId, filtrosMes);
    conferir("agenda lista", await listShifts(userId, filtrosMes), agenda.shifts);
    conferir(
      "agenda unidades",
      await listUnits(userId, { onlyActive: true }),
      agenda.units,
    );

    const filtrosGasto = {
      category: undefined,
      month: mes,
      unitId: undefined,
      year: ano,
    };
    const gastos = await getExpensesScreen(userId, filtrosGasto);
    conferir(
      "gastos lista",
      await listExpenses(userId, filtrosGasto),
      gastos.expenses,
    );
    conferir(
      "gastos resumo",
      await summarizeExpenses(userId, filtrosGasto),
      gastos.summary,
    );

    const filtrosRel = { month: mes, unitId: undefined, year: ano };
    const relatorio = await getReportsScreen(userId, filtrosRel);
    conferir(
      "relatorio",
      await getReport(userId, filtrosRel),
      relatorio.report,
    );
  }

  console.log("\nglobais");
  const tela = await getShiftsScreen(userId, {
    month: 1,
    paymentStatus: undefined,
    unitId: undefined,
    year: 1999,
  });
  conferir("regras de repeticao", await listRules(userId), tela.rules);
  conferir("unidades", await listUnits(userId), tela.units);

  const rel = await getReportsScreen(userId, { month: undefined, unitId: undefined, year: 2026 });
  conferir("anos do seletor", await listReportYears(userId), rel.years);
  conferir("relatorio anual", await getReport(userId, { month: undefined, unitId: undefined, year: 2026 }), rel.report);

  console.log(falhas === 0 ? "\nTudo idêntico." : `\n${falhas} divergência(s).`);
  process.exitCode = falhas === 0 ? 0 : 1;
} finally {
  await prisma.$disconnect();
}
