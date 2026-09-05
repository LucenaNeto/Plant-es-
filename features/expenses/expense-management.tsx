"use client";

import { useCallback, useState } from "react";
import { ExpenseCard } from "@/features/expenses/expense-card";
import { ExpenseForm } from "@/features/expenses/expense-form";
import type { SerializedExpense } from "@/lib/expenses/serializer";
import type { SerializedShift } from "@/lib/shifts/serializer";
import type { SerializedUnit } from "@/lib/units/serializer";

/**
 * Orquestra qual formulário está aberto. Os dados vêm do Server Component e as
 * actions chamam `revalidatePath`, então a lista se atualiza sozinha — guardar
 * uma cópia em estado local só criaria uma segunda fonte de verdade.
 */
type FormMode = { kind: "closed" } | { kind: "create" } | { kind: "edit"; expense: SerializedExpense };

export function ExpenseManagement({
  expenses,
  shifts,
  units,
}: {
  expenses: SerializedExpense[];
  shifts: SerializedShift[];
  units: SerializedUnit[];
}) {
  const [mode, setMode] = useState<FormMode>({ kind: "closed" });
  const close = useCallback(() => setMode({ kind: "closed" }), []);

  return (
    <div className="space-y-4">
      {mode.kind === "closed" ? (
        <button
          className="min-h-12 w-full rounded-md bg-zinc-950 px-4 font-semibold text-white"
          onClick={() => setMode({ kind: "create" })}
          type="button"
        >
          Novo gasto
        </button>
      ) : (
        <ExpenseForm
          expense={mode.kind === "edit" ? mode.expense : undefined}
          key={mode.kind === "edit" ? mode.expense.id : "create"}
          onCancel={close}
          onSaved={close}
          shifts={shifts}
          units={units}
        />
      )}

      {expenses.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center">
          <p className="font-medium">Nenhum gasto neste período</p>
          <p className="mt-1 text-sm text-zinc-500">
            Combustível, alimentação e estacionamento lançados aqui entram no
            cálculo do líquido do mês.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <ExpenseCard
              expense={expense}
              key={expense.id}
              onEdit={(selected) => setMode({ kind: "edit", expense: selected })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
