"use client";

import { useActionState } from "react";
import { deleteExpenseAction } from "@/app/(private)/gastos/actions";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_STYLES,
} from "@/lib/expenses/labels";
import type { SerializedExpense } from "@/lib/expenses/serializer";
import { formatCurrency } from "@/lib/format";

export function ExpenseCard({
  expense,
  onEdit,
}: {
  expense: SerializedExpense;
  onEdit: (expense: SerializedExpense) => void;
}) {
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteExpenseAction.bind(null, expense.id),
    null,
  );

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{expense.description}</h3>
          <p className="mt-1 text-sm text-zinc-500">{expense.dateLabel}</p>
        </div>
        <strong className="whitespace-nowrap">
          {formatCurrency(expense.amount)}
        </strong>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span
          className={`rounded-md px-2.5 py-1 ${EXPENSE_CATEGORY_STYLES[expense.category]}`}
        >
          {EXPENSE_CATEGORY_LABELS[expense.category]}
        </span>
        <span className="rounded-md bg-zinc-100 px-2.5 py-1 font-medium text-zinc-600">
          {expense.linkLabel}
        </span>
      </div>

      {deleteState && !deleteState.ok ? (
        <p
          className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700"
          role="alert"
        >
          {deleteState.message}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-medium">
        <button
          className="min-h-10 rounded-md border border-zinc-200 text-zinc-700"
          onClick={() => onEdit(expense)}
          type="button"
        >
          Editar
        </button>

        <form action={deleteAction}>
          <button
            className="min-h-10 w-full rounded-md border border-rose-200 text-rose-700 disabled:opacity-60"
            disabled={isDeleting}
            onClick={(event) => {
              if (!window.confirm(`Excluir "${expense.description}"?`)) {
                event.preventDefault();
              }
            }}
            type="submit"
          >
            {isDeleting ? "Excluindo..." : "Excluir"}
          </button>
        </form>
      </div>
    </article>
  );
}
