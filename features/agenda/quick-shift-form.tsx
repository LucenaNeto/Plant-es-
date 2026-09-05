"use client";

import { useActionState, useEffect, useState } from "react";
import { saveShiftAction } from "@/app/(private)/plantoes/actions";
import {
  addHoursToTime,
  formatLongDate,
  parseCalendarDate,
  WEEKDAY_LABELS,
} from "@/lib/dates/calendar-date";
import { formatCurrency } from "@/lib/format";
import type { SerializedUnit } from "@/lib/units/serializer";

/**
 * Lançamento rápido a partir do calendário.
 *
 * A data já veio do toque no dia, então sobram três decisões: onde, quanto
 * tempo e a partir de que hora. Duração é botão de 12 ou 24 horas porque é o
 * que o uso real mostra — e o término sai calculado, nunca digitado.
 *
 * Reaproveita `saveShiftAction` em vez de ter uma action própria: assim o aviso
 * de sobreposição, a validação e o log vêm de graça, e não existe um segundo
 * caminho de criação capaz de divergir do primeiro.
 */
const DURACOES = [12, 24] as const;

export function QuickShiftForm({
  date,
  onCancel,
  onCreated,
  units,
}: {
  /** "YYYY-MM-DD" — o dia que o usuário tocou. */
  date: string;
  onCancel: () => void;
  onCreated: () => void;
  units: SerializedUnit[];
}) {
  const ativas = units.filter((unit) => unit.active);

  const [unitId, setUnitId] = useState(ativas.length === 1 ? ativas[0].id : "");
  const [hours, setHours] = useState<number>(24);
  const [startTime, setStartTime] = useState("08:00");
  const [value, setValue] = useState(
    ativas.length === 1 && ativas[0].defaultShiftValue !== null
      ? String(ativas[0].defaultShiftValue)
      : "",
  );
  const [repeatWeekly, setRepeatWeekly] = useState(false);

  const [state, formAction, isPending] = useActionState(
    saveShiftAction.bind(null, null),
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      onCreated();
    }
  }, [onCreated, state]);

  const unit = ativas.find((candidate) => candidate.id === unitId);
  const endTime = addHoursToTime(startTime, hours) ?? "";
  const weekday = parseCalendarDate(date).getUTCDay();
  const errors = state && !state.ok ? (state.errors ?? {}) : {};
  const needsConfirmation =
    state?.ok === false && state.code === "confirmation_required";

  function handleUnit(nextUnitId: string) {
    setUnitId(nextUnitId);

    const escolhida = ativas.find((candidate) => candidate.id === nextUnitId);

    // Valor e duração herdam os padrões da unidade — é para isso que eles
    // existem no cadastro. Só preenche o que ainda está vazio.
    if (escolhida?.defaultShiftValue !== null && !value) {
      setValue(String(escolhida?.defaultShiftValue ?? ""));
    }

    if (escolhida?.defaultShiftHours === 12 || escolhida?.defaultShiftHours === 24) {
      setHours(escolhida.defaultShiftHours);
    }
  }

  if (ativas.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Cadastre uma unidade ativa antes de lançar plantões pelo calendário.
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <div>
        <p className="text-sm font-semibold text-teal-700">Novo plantão</p>
        <p className="mt-0.5 text-sm text-zinc-500">
          {formatLongDate(parseCalendarDate(date))}
        </p>
      </div>

      {/* O que a action espera e o formulário não pergunta. */}
      <input name="shiftDate" type="hidden" value={date} />
      <input name="endTime" type="hidden" value={endTime} />
      <input name="shiftType" type="hidden" value="fixed" />
      <input name="paymentStatus" type="hidden" value="predicted" />
      <input
        name="category"
        type="hidden"
        value={unit?.defaultCategory ?? "green"}
      />
      {repeatWeekly ? (
        <input name="repeatWeekdays" type="hidden" value={weekday} />
      ) : null}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-600" htmlFor="quick-unit">
          Unidade
        </label>
        <select
          className="min-h-12 w-full rounded-md border border-zinc-200 bg-white px-3 text-base outline-none focus:border-teal-500"
          id="quick-unit"
          name="unitId"
          onChange={(event) => handleUnit(event.target.value)}
          required
          value={unitId}
        >
          <option value="">Selecione a unidade</option>
          {ativas.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </select>
        <FieldErrors messages={errors.unitId} />
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-zinc-600">
          Duração
        </span>
        <div className="grid grid-cols-2 gap-2">
          {DURACOES.map((opcao) => (
            <button
              className={`min-h-12 rounded-md border text-base font-semibold ${
                hours === opcao
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-zinc-200 text-zinc-700"
              }`}
              key={opcao}
              onClick={() => setHours(opcao)}
              type="button"
            >
              {opcao} horas
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-600" htmlFor="quick-start">
            Início
          </label>
          <input
            className="min-h-12 w-full rounded-md border border-zinc-200 px-3 text-base outline-none focus:border-teal-500"
            id="quick-start"
            name="startTime"
            onChange={(event) => setStartTime(event.target.value)}
            required
            type="time"
            value={startTime}
          />
          <p className="mt-1.5 text-sm text-zinc-500">
            Termina {endTime || "--:--"}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-600" htmlFor="quick-value">
            Valor (R$)
          </label>
          <input
            className="min-h-12 w-full rounded-md border border-zinc-200 px-3 text-base outline-none focus:border-teal-500"
            id="quick-value"
            min="0"
            name="value"
            onChange={(event) => setValue(event.target.value)}
            required
            step="0.01"
            type="number"
            value={value}
          />
          {Number(value) > 0 ? (
            <p className="mt-1.5 text-sm text-zinc-500">
              {formatCurrency(Number(value) / hours)} por hora
            </p>
          ) : null}
          <FieldErrors messages={errors.value} />
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-md border border-zinc-200 px-3 py-3">
        <input
          checked={repeatWeekly}
          className="h-5 w-5 accent-teal-600"
          name="repeatWeekly"
          onChange={(event) => setRepeatWeekly(event.target.checked)}
          type="checkbox"
        />
        <span className="text-sm font-medium text-zinc-700">
          Repetir toda <span className="capitalize">{WEEKDAY_LABELS[weekday]}</span>
        </span>
      </label>

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
        <button
          className="min-h-11 rounded-md border border-zinc-200 px-4 font-semibold text-zinc-700"
          onClick={onCancel}
          type="button"
        >
          Cancelar
        </button>

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
          className="min-h-11 rounded-md bg-zinc-950 px-4 font-semibold text-white disabled:opacity-70"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Salvando..." : "Lançar plantão"}
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
