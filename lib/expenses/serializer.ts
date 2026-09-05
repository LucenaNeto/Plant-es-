import type { Expense, Shift, Unit } from "@prisma/client";
import { formatShortDate, toDateInputValue } from "@/lib/dates/calendar-date";
import type { ExpenseLinkType } from "@/lib/expenses/labels";

type ExpenseWithLinks = Expense & {
  shift: (Pick<Shift, "id" | "shiftDate" | "startTime"> & {
    unit: Pick<Unit, "name">;
  }) | null;
  unit: Pick<Unit, "name"> | null;
};

/**
 * Mesmas garantias do serializer de plantão: nenhum `Date` ou `Decimal`
 * atravessa para o cliente, e os rótulos legíveis são montados no servidor,
 * onde o fuso está sob controle.
 *
 * `linkType` é derivado aqui, e não guardado no banco, porque ele é uma leitura
 * do estado das colunas — armazená-lo criaria um terceiro dado capaz de
 * discordar de `unitId` e `shiftId`.
 */
export function serializeExpense(expense: ExpenseWithLinks) {
  const linkType: ExpenseLinkType = expense.shiftId
    ? "shift"
    : expense.unitId
      ? "unit"
      : "general";

  const linkLabel = expense.shift
    ? `Plantão de ${formatShortDate(expense.shift.shiftDate)} · ${expense.shift.unit.name}`
    : expense.unit
      ? expense.unit.name
      : "Gasto geral do mês";

  return {
    amount: expense.amount.toNumber(),
    category: expense.category,
    dateLabel: formatShortDate(expense.expenseDate),
    description: expense.description,
    expenseDate: toDateInputValue(expense.expenseDate),
    id: expense.id,
    linkLabel,
    linkType,
    shiftId: expense.shiftId,
    unitId: expense.unitId,
    unitName: expense.unit?.name ?? expense.shift?.unit.name ?? null,
  };
}

export type SerializedExpense = ReturnType<typeof serializeExpense>;
