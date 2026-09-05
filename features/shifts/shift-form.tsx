"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { saveShiftAction } from "@/app/(private)/plantoes/actions";
import { addHoursToTime, calculateShiftHours } from "@/lib/dates/calendar-date";
import { formatCurrency } from "@/lib/format";
import {
  MODALITY_LABELS,
  MODALITY_OPTIONS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
  SHIFT_TYPE_LABELS,
  SHIFT_TYPE_OPTIONS,
} from "@/lib/shifts/labels";
import type { SerializedShift } from "@/lib/shifts/serializer";
import type { SerializedUnit } from "@/lib/units/serializer";

const inputClass =
  "min-h-12 w-full rounded-md border border-zinc-200 bg-white px-3 text-base outline-none focus:border-teal-500";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-600";

/**
 * Estado inicial do formulário.
 *
 * `shift` cobre dois casos: editar (com `shiftId`) e duplicar (sem `shiftId`,
 * mas com os dados copiados). Na duplicação a data vem vazia de propósito —
 * copiar um plantão quase sempre significa repeti-lo em outro dia, e deixar a
 * data antiga preenchida convida ao engano de salvar duas vezes o mesmo dia.
 */
function initialValues(shift: SerializedShift | undefined, isDuplicate: boolean) {
  return {
    category: shift?.category ?? "green",
    endTime: shift?.endTime ?? "",
    notes: shift?.notes ?? "",
    paymentStatus: shift?.paymentStatus ?? "predicted",
    shiftDate: isDuplicate ? "" : (shift?.shiftDate ?? ""),
    shiftType: shift?.shiftType ?? "fixed",
    startTime: shift?.startTime ?? "",
    unitId: shift?.unitId ?? "",
    value: shift ? String(shift.value) : "",
  };
}

export function ShiftForm({
  onCancel,
  onSaved,
  shift,
  shiftId,
  units,
}: {
  onCancel?: () => void;
  onSaved?: () => void;
  /** Dados de origem: o plantão em edição, ou o duplicado. */
  shift?: SerializedShift;
  /** `null` cria um plantão novo; com id, edita o existente. */
  shiftId: string | null;
  units: SerializedUnit[];
}) {
  const isDuplicate = Boolean(shift) && shiftId === null;
  const [values, setValues] = useState(() => initialValues(shift, isDuplicate));

  const [state, formAction, isPending] = useActionState(
    saveShiftAction.bind(null, shiftId),
    null,
  );

  /**
   * Unidades oferecidas no select: as ativas, mais a do plantão em edição
   * mesmo que tenha sido inativada depois — do contrário o formulário abriria
   * com a unidade em branco e o usuário perderia o vínculo sem perceber.
   */
  const selectableUnits = useMemo(() => {
    const active = units.filter((unit) => unit.active);
    const current = units.find((unit) => unit.id === shift?.unitId);

    return current && !current.active ? [current, ...active] : active;
  }, [shift?.unitId, units]);

  const errors = state && !state.ok ? (state.errors ?? {}) : {};
  const needsConfirmation = state?.ok === false && state.code === "confirmation_required";

  // Fecha o formulário quando o salvamento dá certo. Fica em efeito porque o
  // resultado chega pelo estado da action, não pelo handler de submit.
  useEffect(() => {
    if (state?.ok) {
      onSaved?.();
    }
  }, [onSaved, state]);

  function update(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  /**
   * Ao escolher a unidade, herda os padrões cadastrados nela — o que a tela de
   * unidades promete ao pedir "valores padrão para agilizar os próximos
   * plantões". Só preenche campo vazio: uma escolha já feita pelo usuário
   * nunca é sobrescrita.
   */
  function handleUnitChange(unitId: string) {
    const unit = units.find((candidate) => candidate.id === unitId);

    setValues((current) => {
      const next = { ...current, unitId };

      if (!unit) {
        return next;
      }

      if (!current.value && unit.defaultShiftValue !== null) {
        next.value = String(unit.defaultShiftValue);
      }

      if (!current.category && unit.defaultCategory) {
        next.category = unit.defaultCategory;
      }

      if (!current.endTime && current.startTime && unit.defaultShiftHours) {
        next.endTime =
          addHoursToTime(current.startTime, unit.defaultShiftHours) ?? "";
      }

      return next;
    });
  }

  /** Prévia da duração, para o usuário conferir antes de salvar. */
  const previewHours =
    values.startTime && values.endTime
      ? calculateShiftHours(values.startTime, values.endTime)
      : null;

  const numericValue = Number(values.value);
  const hourlyRate =
    previewHours && previewHours > 0 && Number.isFinite(numericValue) && numericValue > 0
      ? numericValue / previewHours
      : null;

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
      <div>
        <label className={labelClass} htmlFor="unitId">
          Unidade
        </label>
        <select
          className={inputClass}
          id="unitId"
          name="unitId"
          onChange={(event) => handleUnitChange(event.target.value)}
          required
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
        {selectableUnits.length === 0 ? (
          <p className="mt-1.5 text-sm text-amber-700">
            Cadastre uma unidade antes de lançar plantões.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="shiftDate">
            Data
          </label>
          <input
            className={inputClass}
            id="shiftDate"
            name="shiftDate"
            onChange={(event) => update("shiftDate", event.target.value)}
            required
            type="date"
            value={values.shiftDate}
          />
          <FieldErrors messages={errors.shiftDate} />
        </div>

        <div>
          <label className={labelClass} htmlFor="startTime">
            Início
          </label>
          <input
            className={inputClass}
            id="startTime"
            name="startTime"
            onChange={(event) => update("startTime", event.target.value)}
            required
            type="time"
            value={values.startTime}
          />
          <FieldErrors messages={errors.startTime} />
        </div>

        <div>
          <label className={labelClass} htmlFor="endTime">
            Término
          </label>
          <input
            className={inputClass}
            id="endTime"
            name="endTime"
            onChange={(event) => update("endTime", event.target.value)}
            required
            type="time"
            value={values.endTime}
          />
          <FieldErrors messages={errors.endTime} />
        </div>
      </div>

      {previewHours !== null ? (
        <p className="rounded-md bg-stone-100 px-3 py-2 text-sm text-zinc-600">
          Duração: <strong>{previewHours}h</strong>
          {hourlyRate
            ? ` · ${formatCurrency(hourlyRate)} por hora`
            : ""}
          {values.startTime > values.endTime
            ? " · atravessa a meia-noite"
            : ""}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="category">
            Modalidade
          </label>
          <select
            className={inputClass}
            id="category"
            name="category"
            onChange={(event) => update("category", event.target.value)}
            value={values.category}
          >
            {MODALITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {MODALITY_LABELS[option]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="shiftType">
            Tipo
          </label>
          <select
            className={inputClass}
            id="shiftType"
            name="shiftType"
            onChange={(event) => update("shiftType", event.target.value)}
            value={values.shiftType}
          >
            {SHIFT_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {SHIFT_TYPE_LABELS[option]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="value">
            Valor (R$)
          </label>
          <input
            className={inputClass}
            id="value"
            min="0"
            name="value"
            onChange={(event) => update("value", event.target.value)}
            required
            step="0.01"
            type="number"
            value={values.value}
          />
          <FieldErrors messages={errors.value} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="paymentStatus">
          Situação do pagamento
        </label>
        <select
          className={inputClass}
          id="paymentStatus"
          name="paymentStatus"
          onChange={(event) => update("paymentStatus", event.target.value)}
          value={values.paymentStatus}
        >
          {PAYMENT_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {PAYMENT_STATUS_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="notes">
          Observações
        </label>
        <textarea
          className="min-h-20 w-full rounded-md border border-zinc-200 px-3 py-3 text-base outline-none focus:border-teal-500"
          id="notes"
          name="notes"
          onChange={(event) => update("notes", event.target.value)}
          value={values.notes}
        />
      </div>

      {state && !state.ok ? (
        <p
          className={`rounded-md px-3 py-2 text-sm ${
            needsConfirmation
              ? "bg-amber-50 text-amber-800"
              : "bg-rose-50 text-rose-700"
          }`}
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

        {/*
          O `name`/`value` de um botão de submit entra no FormData apenas quando
          é ele que envia. Isso resolve a confirmação de sobreposição sem estado
          local nem reenvio programático: o botão normal manda o formulário sem
          `confirmOverlap`, e este manda com.
        */}
        {needsConfirmation ? (
          <button
            className="min-h-11 rounded-md bg-amber-600 px-4 font-semibold text-white disabled:opacity-70"
            disabled={isPending}
            name="confirmOverlap"
            type="submit"
            value="true"
          >
            Salvar mesmo assim
          </button>
        ) : null}

        <button
          className="min-h-11 rounded-md bg-zinc-950 px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isPending || selectableUnits.length === 0}
          type="submit"
        >
          {isPending
            ? "Salvando..."
            : shiftId
              ? "Salvar plantão"
              : "Criar plantão"}
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
