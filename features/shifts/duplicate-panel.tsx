"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { duplicateShiftAction } from "@/app/(private)/plantoes/actions";
import {
  formatShortDate,
  parseCalendarDate,
  WEEKDAY_LABELS,
} from "@/lib/dates/calendar-date";
import { formatCurrency } from "@/lib/format";
import type { SerializedShift } from "@/lib/shifts/serializer";

const DIA_MS = 86400000;

/**
 * Mesma regra de `duplicationDates` no servidor, reescrita aqui para a prévia.
 *
 * Duplicar a lógica é uma dívida consciente: a alternativa seria uma ida ao
 * servidor a cada toque num dia da semana, e a prévia perderia a função de ser
 * instantânea. As duas versões têm teste comparando resultado — se divergirem,
 * o teste quebra antes do usuário perceber.
 */
function calcularDatas(origem: Date, weekdays: number[], monthsAhead: number) {
  const dias = new Set(weekdays);
  const fim = new Date(
    Date.UTC(origem.getUTCFullYear(), origem.getUTCMonth() + monthsAhead + 1, 0),
  );

  const datas: Date[] = [];

  for (let t = origem.getTime() + DIA_MS; t <= fim.getTime(); t += DIA_MS) {
    const data = new Date(t);

    if (dias.has(data.getUTCDay())) {
      datas.push(data);
    }
  }

  return datas;
}

const HORIZONTES = [
  { label: "Só este mês", value: 0 },
  { label: "+1 mês", value: 1 },
  { label: "+2 meses", value: 2 },
  { label: "+3 meses", value: 3 },
] as const;

export function DuplicatePanel({
  onClose,
  shift,
}: {
  onClose: () => void;
  shift: SerializedShift;
}) {
  const origem = useMemo(
    () => parseCalendarDate(shift.shiftDate),
    [shift.shiftDate],
  );

  const [weekdays, setWeekdays] = useState<number[]>([origem.getUTCDay()]);
  const [monthsAhead, setMonthsAhead] = useState(0);

  const [state, formAction, isPending] = useActionState(
    duplicateShiftAction.bind(null, shift.id),
    null,
  );

  const datas = useMemo(
    () => calcularDatas(origem, weekdays, monthsAhead),
    [monthsAhead, origem, weekdays],
  );

  useEffect(() => {
    if (state?.ok) {
      onClose();
    }
  }, [onClose, state]);

  function toggle(dia: number) {
    setWeekdays((atual) =>
      atual.includes(dia)
        ? atual.filter((d) => d !== dia)
        : [...atual, dia].sort((a, b) => a - b),
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <div>
        <p className="text-sm font-semibold text-teal-700">Duplicar plantão</p>
        <p className="mt-0.5 text-sm text-zinc-500">
          {shift.unitName} · {shift.startTime}–{shift.endTime} ·{" "}
          {formatCurrency(shift.value)}
        </p>
      </div>

      <input name="monthsAhead" type="hidden" value={monthsAhead} />
      {weekdays.map((dia) => (
        <input key={dia} name="weekdays" type="hidden" value={dia} />
      ))}

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-600">
          Em quais dias da semana?
        </p>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_LABELS.map((rotulo, dia) => {
            const ativo = weekdays.includes(dia);

            return (
              <button
                aria-pressed={ativo}
                className={`min-h-11 rounded-md border text-xs font-medium capitalize ${
                  ativo
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-zinc-200 text-zinc-600"
                }`}
                key={rotulo}
                onClick={() => toggle(dia)}
                type="button"
              >
                {rotulo}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-600">Até quando?</p>
        <div className="grid grid-cols-4 gap-1.5">
          {HORIZONTES.map((opcao) => (
            <button
              aria-pressed={monthsAhead === opcao.value}
              className={`min-h-11 rounded-md border px-1 text-xs font-medium ${
                monthsAhead === opcao.value
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-200 text-zinc-600"
              }`}
              key={opcao.value}
              onClick={() => setMonthsAhead(opcao.value)}
              type="button"
            >
              {opcao.label}
            </button>
          ))}
        </div>
      </div>

      {/*
        A prévia é o coração desta tela. Criar dez plantões de uma vez é uma
        ação com consequência, e ver as datas antes de confirmar é o que
        transforma isso em decisão em vez de aposta.
      */}
      <div className="rounded-md bg-stone-100 px-3 py-2">
        {datas.length === 0 ? (
          <p className="text-sm text-zinc-600">
            {weekdays.length === 0
              ? "Escolha ao menos um dia da semana."
              : "Nenhuma data restante no período escolhido."}
          </p>
        ) : (
          <>
            <p className="text-sm font-medium text-zinc-700">
              {datas.length}{" "}
              {datas.length === 1 ? "plantão será criado" : "plantões serão criados"}
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              {datas.slice(0, 12).map((data) => formatShortDate(data)).join(" · ")}
              {datas.length > 12 ? ` · e mais ${datas.length - 12}` : ""}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Datas que já tiverem este plantão são puladas. As cópias nascem
              como “previsto”, sem repasse.
            </p>
          </>
        )}
      </div>

      {state && !state.ok ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-2 sm:flex sm:justify-end">
        <button
          className="min-h-11 rounded-md border border-zinc-200 px-4 font-semibold text-zinc-700"
          onClick={onClose}
          type="button"
        >
          Cancelar
        </button>
        <button
          className="min-h-11 rounded-md bg-zinc-950 px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending || datas.length === 0}
          type="submit"
        >
          {isPending
            ? "Duplicando..."
            : `Duplicar ${datas.length > 0 ? `(${datas.length})` : ""}`}
        </button>
      </div>
    </form>
  );
}
