import { prisma } from "@/lib/db/prisma";
import { serializeExpense } from "@/lib/expenses/serializer";
import { serializeShift } from "@/lib/shifts/serializer";
import { serializeUnit } from "@/lib/units/serializer";
import type { ExpenseFilters } from "@/lib/validators/expenses";
import type { ShiftFilters } from "@/lib/validators/shifts";
import {
  buildExpenseSummary,
  expensesQuery,
  expenseSummaryQuery,
} from "@/server/services/expenses";
import {
  buildRules,
  ruleHorizonQuery,
  rulesQuery,
} from "@/server/services/recurring-rules";
import {
  buildReport,
  reportSeriesQuery,
  reportShiftsQuery,
  reportUserQuery,
  reportYearsQuery,
  type ReportFilters,
} from "@/server/services/reports";
import {
  filterByPaymentStatus,
  monthShiftsQuery,
  summarizeSerializedShifts,
} from "@/server/services/shifts";
import { unitsQuery } from "@/server/services/units";

/**
 * Carregadores de tela: cada página pede ao banco o mínimo de vezes possível,
 * e numa transação só.
 *
 * **Duas economias diferentes, e as duas importam.**
 *
 * A primeira é gastar menos consultas. A tela de plantões buscava o mesmo mês
 * duas vezes — uma para a lista, outra para os totais, mudando só o `select` —
 * e pedia as regras em dois passos encadeados. Cinco consultas viraram quatro,
 * com a lista e os totais saindo do mesmo resultado.
 *
 * A segunda é mandar as que sobraram juntas. Com o pooler em transaction mode
 * (porta 6543, `pgbouncer=true`), o custo é cobrado **por transação**, e uma
 * consulta solta é uma transação implícita: ~300ms cada. Agrupadas num
 * `$transaction`, as quatro custam ~550ms em vez de ~1200ms (medido em
 * 2026-10-10 contra a produção, `scripts/verificar/estrategias.mts`).
 *
 * **Cuidado ao remedir.** Rodar essa medição numa `DATABASE_URL` na porta 5432
 * dá a resposta oposta — lá `$transaction` só acrescenta BEGIN e COMMIT, e
 * parece custar duas viagens a mais. Eu caí nessa hoje. A medição só vale com
 * a URL que a produção usa.
 *
 * **Por que um módulo separado.** As páginas não podem falar com o Prisma: a
 * camada de página é só render. E fazer `shifts.ts` importar `units.ts` e
 * `recurring-rules.ts` só para agrupar criaria dependência entre serviços de
 * domínio que não têm nada a ver um com o outro. Aqui em cima eles continuam
 * independentes; este módulo apenas junta as consultas que cada um expõe e
 * monta o resultado pelas mesmas funções puras que eles já usam — a regra de
 * negócio continua num lugar só.
 */
/** Plantões: lista, filtros, totais do mês e regras de repetição. */
export async function getShiftsScreen(userId: string, filters: ShiftFilters) {
  const [shifts, units, rules, horizons] = await prisma.$transaction([
    monthShiftsQuery(userId, filters),
    unitsQuery(userId),
    rulesQuery(userId),
    ruleHorizonQuery(userId),
  ]);

  // O mês inteiro vem numa consulta só; o filtro de situação é aplicado aqui
  // para que os totais continuem somando o mês todo, como a tela espera.
  const doMes = shifts.map(serializeShift);

  return {
    rules: buildRules(rules, horizons),
    shifts: filterByPaymentStatus(doMes, filters.paymentStatus),
    summary: summarizeSerializedShifts(doMes),
    units: units.map(serializeUnit),
  };
}

/** Agenda: a grade do mês e as unidades ativas para o lançamento rápido. */
export async function getAgendaScreen(userId: string, filters: ShiftFilters) {
  const [shifts, units] = await prisma.$transaction([
    monthShiftsQuery(userId, filters),
    unitsQuery(userId, { onlyActive: true }),
  ]);

  const doMes = shifts.map(serializeShift);

  return {
    shifts: doMes,
    summary: summarizeSerializedShifts(doMes),
    units: units.map(serializeUnit),
  };
}

/** Gastos: lançamentos, unidades, resumo por categoria e plantões do mês. */
export async function getExpensesScreen(
  userId: string,
  filters: ExpenseFilters,
) {
  const [expenses, units, grouped, shifts] = await prisma.$transaction([
    expensesQuery(userId, filters),
    unitsQuery(userId),
    expenseSummaryQuery(userId, filters),
    // Plantões do mesmo mês alimentam o seletor de vínculo do formulário.
    monthShiftsQuery(userId, {
      month: filters.month,
      paymentStatus: undefined,
      unitId: undefined,
      year: filters.year,
    }),
  ]);

  return {
    expenses: expenses.map(serializeExpense),
    shifts: shifts.map(serializeShift),
    summary: buildExpenseSummary(grouped),
    units: units.map(serializeUnit),
  };
}

/** Relatórios: o relatório inteiro, as unidades do filtro e os anos do seletor. */
export async function getReportsScreen(
  userId: string,
  filters: ReportFilters,
) {
  const [user, shifts, serie, units, years] = await prisma.$transaction([
    reportUserQuery(userId),
    reportShiftsQuery(userId, filters),
    reportSeriesQuery(userId, filters),
    unitsQuery(userId),
    reportYearsQuery(userId),
  ]);

  return {
    report: buildReport(filters, user, shifts, serie),
    units: units.map(serializeUnit),
    years: years.map((linha) => linha.ano),
  };
}
