import { Prisma, type ExpenseCategory } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { monthRange, parseCalendarDate } from "@/lib/dates/calendar-date";
import {
  serializeExpense,
  type SerializedExpense,
} from "@/lib/expenses/serializer";
import type { ExpenseFilters, ExpensePayload } from "@/lib/validators/expenses";

/**
 * Regras de negócio de Gasto.
 *
 * Segue a convenção da camada: `userId` primeiro, sempre no `where`, retorno já
 * serializado, e nenhum conhecimento de HTTP.
 */

const WITH_LINKS = {
  shift: {
    select: {
      id: true,
      shiftDate: true,
      startTime: true,
      unit: { select: { name: true } },
    },
  },
  unit: { select: { name: true } },
} satisfies Prisma.ExpenseInclude;

export type ExpenseServiceError =
  | { reason: "unit_not_found" }
  | { reason: "shift_not_found" };

/**
 * Resolve o vínculo do gasto a partir do `linkType`.
 *
 * Duas garantias:
 *
 * 1. **A unidade de um gasto vinculado a plantão é derivada do plantão**, nunca
 *    aceita do cliente. Do contrário seria possível gravar um gasto apontando
 *    para o plantão do Hospital A e para a unidade B ao mesmo tempo, e o
 *    relatório de gasto por unidade do Bloco 4 sairia errado sem nenhum sinal.
 * 2. **Propriedade verificada**: `unitId` e `shiftId` chegam do formulário, e
 *    sem a checagem seria possível pendurar um gasto em registro de outra
 *    conta.
 */
async function resolveLink(
  userId: string,
  payload: ExpensePayload,
): Promise<
  { link: { shiftId: string | null; unitId: string | null } } | ExpenseServiceError
> {
  if (payload.linkType === "shift" && payload.shiftId) {
    const shift = await prisma.shift.findFirst({
      select: { unitId: true },
      where: { id: payload.shiftId, userId },
    });

    if (!shift) {
      return { reason: "shift_not_found" };
    }

    return { link: { shiftId: payload.shiftId, unitId: shift.unitId } };
  }

  if (payload.linkType === "unit" && payload.unitId) {
    const unit = await prisma.unit.findFirst({
      select: { id: true },
      where: { id: payload.unitId, userId },
    });

    if (!unit) {
      return { reason: "unit_not_found" };
    }

    return { link: { shiftId: null, unitId: payload.unitId } };
  }

  return { link: { shiftId: null, unitId: null } };
}

/** Os gastos do mês filtrado, **sem executar** — para agrupar numa transação. */
export function expensesQuery(userId: string, filters: ExpenseFilters) {
  const { start, end } = monthRange(filters.year, filters.month);

  return prisma.expense.findMany({
    include: WITH_LINKS,
    orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    where: {
      expenseDate: { gte: start, lt: end },
      userId,
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.unitId ? { unitId: filters.unitId } : {}),
    },
  });
}

export async function listExpenses(userId: string, filters: ExpenseFilters) {
  const expenses = await expensesQuery(userId, filters);

  return expenses.map(serializeExpense);
}

export async function findExpense(userId: string, expenseId: string) {
  const expense = await prisma.expense.findFirst({
    include: WITH_LINKS,
    where: { id: expenseId, userId },
  });

  return expense ? serializeExpense(expense) : null;
}

type WriteResult =
  | { error: ExpenseServiceError; ok: false }
  | { expense: SerializedExpense; ok: true };

function isServiceError(
  value: Awaited<ReturnType<typeof resolveLink>>,
): value is ExpenseServiceError {
  return "reason" in value;
}

export async function createExpense(
  userId: string,
  payload: ExpensePayload,
): Promise<WriteResult> {
  const resolved = await resolveLink(userId, payload);

  if (isServiceError(resolved)) {
    return { error: resolved, ok: false };
  }

  const expense = await prisma.expense.create({
    data: {
      amount: new Prisma.Decimal(payload.amount),
      category: payload.category,
      description: payload.description,
      expenseDate: parseCalendarDate(payload.expenseDate),
      shiftId: resolved.link.shiftId,
      unitId: resolved.link.unitId,
      userId,
    },
    include: WITH_LINKS,
  });

  return { expense: serializeExpense(expense), ok: true };
}

export async function updateExpense(
  userId: string,
  expenseId: string,
  payload: ExpensePayload,
): Promise<WriteResult | null> {
  const existing = await prisma.expense.findFirst({
    select: { id: true },
    where: { id: expenseId, userId },
  });

  if (!existing) {
    return null;
  }

  const resolved = await resolveLink(userId, payload);

  if (isServiceError(resolved)) {
    return { error: resolved, ok: false };
  }

  const expense = await prisma.expense.update({
    data: {
      amount: new Prisma.Decimal(payload.amount),
      category: payload.category,
      description: payload.description,
      expenseDate: parseCalendarDate(payload.expenseDate),
      shiftId: resolved.link.shiftId,
      unitId: resolved.link.unitId,
    },
    include: WITH_LINKS,
    where: { id: expenseId },
  });

  return { expense: serializeExpense(expense), ok: true };
}

export async function deleteExpense(userId: string, expenseId: string) {
  const existing = await prisma.expense.findFirst({
    select: { id: true },
    where: { id: expenseId, userId },
  });

  if (!existing) {
    return null;
  }

  await prisma.expense.delete({ where: { id: expenseId } });

  return { id: expenseId };
}

/** Total do mês e quebra por categoria, para o cabeçalho da lista. */
/**
 * O agrupamento por categoria, **sem executar**.
 *
 * Diferente de `expensesQuery`, ignora o filtro de categoria de propósito: o
 * resumo mostra todas as categorias lado a lado, e filtrá-lo junto com a lista
 * deixaria o painel com uma barra só sempre que o usuário escolhesse uma.
 */
export function expenseSummaryQuery(userId: string, filters: ExpenseFilters) {
  const { start, end } = monthRange(filters.year, filters.month);

  return prisma.expense.groupBy({
    _count: { _all: true },
    _sum: { amount: true },
    by: ["category"],
    where: {
      expenseDate: { gte: start, lt: end },
      userId,
      ...(filters.unitId ? { unitId: filters.unitId } : {}),
    },
  });
}

/** Monta o resumo a partir do agrupamento já buscado. Puro. */
export function buildExpenseSummary(
  grouped: Awaited<ReturnType<typeof expenseSummaryQuery>>,
) {
  const byCategory = grouped
    .map((row) => ({
      amount: row._sum.amount?.toNumber() ?? 0,
      category: row.category,
      count: row._count._all,
    }))
    // Maior gasto primeiro: é a informação que o usuário procura ao abrir a
    // tela — onde o dinheiro está indo.
    .sort((a, b) => b.amount - a.amount);

  return {
    byCategory,
    count: byCategory.reduce((sum, row) => sum + row.count, 0),
    total: byCategory.reduce((sum, row) => sum + row.amount, 0),
  };
}

export async function summarizeExpenses(
  userId: string,
  filters: ExpenseFilters,
) {
  return buildExpenseSummary(await expenseSummaryQuery(userId, filters));
}

export type ExpenseSummary = ReturnType<typeof buildExpenseSummary>;

/** Total de gastos do mês, para o líquido do dashboard e das finanças. */
export async function sumExpensesForMonth(
  userId: string,
  year: number,
  month: number,
) {
  const { start, end } = monthRange(year, month);

  const result = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: { expenseDate: { gte: start, lt: end }, userId },
  });

  return result._sum.amount?.toNumber() ?? 0;
}

export type { ExpenseCategory };
