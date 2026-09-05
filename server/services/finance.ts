import { prisma } from "@/lib/db/prisma";
import { monthRange } from "@/lib/dates/calendar-date";
import { summarizeExpenses } from "@/server/services/expenses";

/**
 * Consolidação financeira do mês.
 *
 * **O que "líquido" significa aqui.** A palavra é ambígua e vale fixar o
 * sentido num lugar só, porque é o número em que o usuário vai confiar para
 * tomar decisão. Publicamos dois, cada um respondendo a uma pergunta diferente:
 *
 * - `netReceived` = recebido − gastos. **Dinheiro que já entrou**, descontado o
 *   que já saiu. É o caixa real do mês.
 * - `netProjected` = bruto − gastos. **O que o mês deve fechar** se tudo que
 *   está previsto e pendente for pago.
 *
 * Mostrar um só, chamado "líquido", esconderia justamente a diferença que
 * importa para quem depende de repasse: o mês pode parecer ótimo na projeção e
 * não ter entrado nada.
 *
 * As três situações de pagamento são mutuamente exclusivas (`predicted`,
 * `pending`, `received`), então `bruto = previsto + pendente + recebido`.
 */

export type UnitPerformance = {
  /** Gastos lançados com vínculo a esta unidade. */
  expenses: number;
  gross: number;
  hours: number;
  /** `gross − expenses`. Não inclui gasto geral, que não é atribuível. */
  net: number;
  received: number;
  shiftCount: number;
  unitId: string;
  unitName: string;
};

export async function getMonthlyFinance(
  userId: string,
  year: number,
  month: number,
) {
  const { start, end } = monthRange(year, month);
  const shiftWindow = { shiftDate: { gte: start, lt: end }, userId };
  const expenseWindow = { expenseDate: { gte: start, lt: end }, userId };

  const [byStatus, shiftsByUnit, expensesByUnit, expenseSummary] =
    await Promise.all([
      prisma.shift.groupBy({
        _count: { _all: true },
        _sum: { hours: true, value: true },
        by: ["paymentStatus"],
        where: shiftWindow,
      }),
      prisma.shift.groupBy({
        _count: { _all: true },
        _sum: { hours: true, value: true },
        by: ["unitId"],
        where: shiftWindow,
      }),
      prisma.expense.groupBy({
        _sum: { amount: true },
        by: ["unitId"],
        where: { ...expenseWindow, unitId: { not: null } },
      }),
      summarizeExpenses(userId, {
        category: undefined,
        month,
        unitId: undefined,
        year,
      }),
    ]);

  const totals = { pending: 0, predicted: 0, received: 0 };
  let shiftCount = 0;
  let hours = 0;

  for (const row of byStatus) {
    const value = row._sum.value?.toNumber() ?? 0;
    totals[row.paymentStatus] = value;
    shiftCount += row._count._all;
    hours += row._sum.hours?.toNumber() ?? 0;
  }

  const gross = totals.predicted + totals.pending + totals.received;
  const expenses = expenseSummary.total;

  // Recebido por unidade exige um segundo recorte: o groupBy acima agrega por
  // unidade sem separar situação de pagamento.
  const receivedByUnit = await prisma.shift.groupBy({
    _sum: { value: true },
    by: ["unitId"],
    where: { ...shiftWindow, paymentStatus: "received" },
  });

  const unitIds = shiftsByUnit.map((row) => row.unitId);
  const units = unitIds.length
    ? await prisma.unit.findMany({
        select: { id: true, name: true },
        where: { id: { in: unitIds }, userId },
      })
    : [];

  const unitNames = new Map(units.map((unit) => [unit.id, unit.name]));
  const expensesPerUnit = new Map(
    expensesByUnit.map((row) => [row.unitId, row._sum.amount?.toNumber() ?? 0]),
  );
  const receivedPerUnit = new Map(
    receivedByUnit.map((row) => [row.unitId, row._sum.value?.toNumber() ?? 0]),
  );

  const byUnit: UnitPerformance[] = shiftsByUnit
    .map((row) => {
      const unitGross = row._sum.value?.toNumber() ?? 0;
      const unitExpenses = expensesPerUnit.get(row.unitId) ?? 0;

      return {
        expenses: unitExpenses,
        gross: unitGross,
        hours: row._sum.hours?.toNumber() ?? 0,
        net: unitGross - unitExpenses,
        received: receivedPerUnit.get(row.unitId) ?? 0,
        shiftCount: row._count._all,
        unitId: row.unitId,
        unitName: unitNames.get(row.unitId) ?? "Unidade removida",
      };
    })
    .sort((a, b) => b.gross - a.gross);

  /**
   * Gasto geral (sem unidade) não é atribuível a nenhuma unidade, então fica de
   * fora do `net` por unidade e só entra no total do mês. Exposto separadamente
   * para a tela poder dizer isso ao usuário — sem esse aviso, a soma dos
   * líquidos por unidade não bate com o líquido do mês e os números perdem a
   * credibilidade.
   */
  const attributedExpenses = byUnit.reduce((sum, row) => sum + row.expenses, 0);

  return {
    byCategory: expenseSummary.byCategory,
    byUnit,
    expenseCount: expenseSummary.count,
    expenses,
    generalExpenses: Math.round((expenses - attributedExpenses) * 100) / 100,
    gross,
    hours: Math.round(hours * 100) / 100,
    netProjected: Math.round((gross - expenses) * 100) / 100,
    netReceived: Math.round((totals.received - expenses) * 100) / 100,
    pending: totals.pending,
    predicted: totals.predicted,
    received: totals.received,
    shiftCount,
    /** Ainda não pago: previsto + pendente. */
    toReceive: totals.predicted + totals.pending,
  };
}

export type MonthlyFinance = Awaited<ReturnType<typeof getMonthlyFinance>>;
