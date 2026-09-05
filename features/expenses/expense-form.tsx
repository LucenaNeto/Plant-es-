"use client";

import { useActionState, useEffect, useState } from "react";
import { saveExpenseAction } from "@/app/(private)/gastos/actions";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_OPTIONS,
  EXPENSE_LINK_LABELS,
  EXPENSE_LINK_OPTIONS,
  type ExpenseLinkType,
} from "@/lib/expenses/labels";
import type { SerializedExpense } from "@/lib/expenses/serializer";
import type { SerializedShift } from "@/lib/shifts/serializer";
import type { SerializedUnit } from "@/lib/units/serializer";

const inputClass =
  "min-h-12 w-full rounded-md border border-zinc-200 bg-white px-3 text-base outline-none focus:border-teal-500";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-600";

export function ExpenseForm({
  expense,
  onCancel,
  onSaved,
  shifts,
  units,
}: {
  expense?: SerializedExpense;
  onCancel?: () => void;
  onSaved?: () => void;
  /** Plantões do mês em exibição, para vincular o gasto. */
  shifts: SerializedShift[];
  units: SerializedUnit[];
}) {
  const [values, setValues] = useState(() => ({
    amount: expense ? String(expense.amount) : "",
    category: expense?.category ?? "fuel",
    description: expense?.description ?? "",
    expenseDate: expense?.expenseDate ?? "",
    linkType: (expense?.linkType ?? "general") as ExpenseLinkType,
    shiftId: expense?.shiftId ?? "",
    unitId: expense?.unitId ?? "",
  }));

  const [state, formAction, isPending] = useActionState(
    saveExpenseAction.bind(null, expense?.id ?? null),
    null,
  );

  const errors = state && !state.ok ? (state.errors ?? {}) : {};

  useEffect(() => {
    if (state?.ok) {
      onSaved?.();
    }
  }, [onSaved, state]);

  function update(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  /**
   * Unidades ofertadas: as ativas, mais a já vinculada ao gasto mesmo que
   * inativada depois — senão a edição abriria com o vínculo em branco e o
   * usuário o perderia sem perceber.
   */
  const selectableUnits = units.filter(
    (unit) => unit.active || unit.id === expense?.unitId,
  );

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <div>
        <label className={labelClass} htmlFor="description">
          Descrição
        </label>
        <input
          className={inputClass}
          id="description"
          name="description"
          onChange={(event) => update("description", event.target.value)}
          placeholder="Abastecimento, refeição no plantão..."
          required
          value={values.description}
        />
        <FieldErrors messages={errors.description} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="category">
            Categoria
          </label>
          <select
            className={inputClass}
            id="category"
            name="category"
            onChange={(event) => update("category", event.target.value)}
            value={values.category}
          >
            {EXPENSE_CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {EXPENSE_CATEGORY_LABELS[option]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="expenseDate">
            Data
          </label>
          <input
            className={inputClass}
            id="expenseDate"
            name="expenseDate"
            onChange={(event) => update("expenseDate", event.target.value)}
            required
            type="date"
            value={values.expenseDate}
          />
          <FieldErrors messages={errors.expenseDate} />
        </div>

        <div>
          <label className={labelClass} htmlFor="amount">
            Valor (R$)
          </label>
          <input
            className={inputClass}
            id="amount"
            min="0.01"
            name="amount"
            onChange={(event) => update("amount", event.target.value)}
            required
            step="0.01"
            type="number"
            value={values.amount}
          />
          <FieldErrors messages={errors.amount} />
        </div>
      </div>

      <fieldset>
        <legend className={labelClass}>Vínculo</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {EXPENSE_LINK_OPTIONS.map((option) => (
            <label
              className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm ${
                values.linkType === option
                  ? "border-teal-500 bg-teal-50 font-medium text-teal-800"
                  : "border-zinc-200"
              }`}
              key={option}
            >
              <input
                checked={values.linkType === option}
                className="h-4 w-4 accent-teal-600"
                name="linkType"
                onChange={() => update("linkType", option)}
                type="radio"
                value={option}
              />
              {EXPENSE_LINK_LABELS[option]}
            </label>
          ))}
        </div>
      </fieldset>

      {values.linkType === "unit" ? (
        <div>
          <label className={labelClass} htmlFor="unitId">
            Unidade
          </label>
          <select
            className={inputClass}
            id="unitId"
            name="unitId"
            onChange={(event) => update("unitId", event.target.value)}
            value={values.unitId}
          >
            <option value="">Selecione a unidade</option>
            {selectableUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
                {unit.active ? "" : " (inativa)"}
              </option>
            ))}
          </select>
          <FieldErrors messages={errors.unitId} />
        </div>
      ) : null}

      {values.linkType === "shift" ? (
        <div>
          <label className={labelClass} htmlFor="shiftId">
            Plantão
          </label>
          <select
            className={inputClass}
            id="shiftId"
            name="shiftId"
            onChange={(event) => update("shiftId", event.target.value)}
            value={values.shiftId}
          >
            <option value="">Selecione o plantão</option>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.dateLabel} · {shift.unitName} · {shift.startTime}-
                {shift.endTime}
              </option>
            ))}
          </select>
          <FieldErrors messages={errors.shiftId} />
          {shifts.length === 0 ? (
            <p className="mt-1.5 text-sm text-amber-700">
              Nenhum plantão neste mês para vincular. Troque o mês no filtro ou
              lance o gasto como geral.
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-zinc-500">
              A unidade é herdada do plantão automaticamente.
            </p>
          )}
        </div>
      ) : null}

      {state && !state.ok ? (
        <p
          className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-2 sm:flex sm:justify-end">
        {onCancel ? (
          <button
            className="min-h-11 rounded-md border border-zinc-200 px-4 font-semibold text-zinc-700"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
        ) : null}
        <button
          className="min-h-11 rounded-md bg-zinc-950 px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Salvando..." : expense ? "Salvar gasto" : "Lançar gasto"}
        </button>
      </div>
    </form>
  );
}

function FieldErrors({ messages }: { messages?: string[] }) {
  if (!messages?.length) {
    return null;
  }

  return (
    <>
      {messages.map((message) => (
        <span className="mt-1 block text-sm text-rose-700" key={message}>
          {message}
        </span>
      ))}
    </>
  );
}
