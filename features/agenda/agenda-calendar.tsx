"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFilterParams } from "@/components/hooks/use-filter-params";
import { MonthNavigator } from "@/components/ui/month-navigator";
import { buildCalendarGrid, WEEKDAY_LABELS } from "@/lib/dates/calendar-date";
import { formatCurrency } from "@/lib/format";
import {
  MODALITY_DOT,
  MODALITY_LABELS,
  MODALITY_STYLES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
  SHIFT_TYPE_LABELS,
} from "@/lib/shifts/labels";
import { QuickShiftForm } from "@/features/agenda/quick-shift-form";
import type { SerializedShift } from "@/lib/shifts/serializer";
import type { SerializedUnit } from "@/lib/units/serializer";

/**
 * Calendário mensal.
 *
 * A divisão de responsabilidades aqui é deliberada: **o mês vive na URL** (troca
 * de mês precisa buscar dados no servidor) e **o dia selecionado vive em estado
 * local** (os plantões do mês inteiro já vieram, então selecionar um dia é
 * instantâneo). Colocar o dia na URL também funcionaria, mas custaria uma ida
 * ao servidor — e ~123ms — a cada toque numa data.
 */
export function AgendaCalendar({
  month,
  shifts,
  today,
  units,
  year,
}: {
  month: number;
  shifts: SerializedShift[];
  /** Hoje no fuso do app, calculado no servidor. "YYYY-MM-DD". */
  today: string;
  units: SerializedUnit[];
  year: number;
}) {
  const { applyParams, isPending } = useFilterParams("/agenda");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const cells = useMemo(() => buildCalendarGrid(year, month), [month, year]);

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, SerializedShift[]>();

    for (const shift of shifts) {
      const bucket = map.get(shift.shiftDate);

      if (bucket) {
        bucket.push(shift);
      } else {
        map.set(shift.shiftDate, [shift]);
      }
    }

    return map;
  }, [shifts]);

  const selectedShifts = selectedDate
    ? (shiftsByDate.get(selectedDate) ?? [])
    : [];

  function changeMonth(next: { month: number; year: number }) {
    // A seleção não sobrevive à troca de mês: um dia de outro mês não existe
    // mais na grade, e manter a seleção deixaria o painel de detalhe exibindo
    // um dia que o usuário não está mais vendo.
    setSelectedDate(null);
    setIsCreating(false);
    applyParams({ month: String(next.month), year: String(next.year) });
  }

  return (
    <div className={`space-y-4 ${isPending ? "opacity-60" : ""}`}>
      <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
        <MonthNavigator month={month} onChange={changeMonth} year={year} />

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400"
              key={label}
            >
              {label}
            </div>
          ))}

          {cells.map((cell, index) => {
            if (!cell.date) {
              return <div key={`vazio-${index}`} />;
            }

            const dayShifts = shiftsByDate.get(cell.date) ?? [];
            const isToday = cell.date === today;
            const isSelected = cell.date === selectedDate;

            return (
              <button
                aria-label={`Dia ${cell.day}${
                  dayShifts.length
                    ? `, ${dayShifts.length} plantão${dayShifts.length > 1 ? "es" : ""}`
                    : ", sem plantão"
                }`}
                aria-pressed={isSelected}
                className={`flex aspect-square flex-col items-center justify-center rounded-md border text-sm transition ${
                  isSelected
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : isToday
                      ? "border-teal-500 bg-teal-50"
                      : "border-zinc-100 bg-stone-50"
                }`}
                key={cell.date}
                onClick={() => {
                  setIsCreating(false);
                  setSelectedDate((current) =>
                    current === cell.date ? null : cell.date,
                  );
                }}
                type="button"
              >
                <span className={isToday && !isSelected ? "font-bold" : "font-medium"}>
                  {cell.day}
                </span>

                <span className="mt-1 flex h-2 items-center gap-0.5">
                  {dayShifts.slice(0, 3).map((shift) => (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isSelected ? "bg-white" : MODALITY_DOT[shift.category]
                      }`}
                      key={shift.id}
                    />
                  ))}
                  {dayShifts.length > 3 ? (
                    <span
                      className={`text-[9px] font-bold ${isSelected ? "text-white" : "text-zinc-500"}`}
                    >
                      +{dayShifts.length - 3}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
          {(["green", "yellow", "red"] as const).map((modality) => (
            <span className="flex items-center gap-1.5" key={modality}>
              <span className={`h-1.5 w-1.5 rounded-full ${MODALITY_DOT[modality]}`} />
              {MODALITY_LABELS[modality]}
            </span>
          ))}
        </div>
      </section>

      {selectedDate ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {selectedShifts[0]?.fullDateLabel ?? formatSelectedDate(selectedDate)}
            </h2>
            <button
              className="text-sm font-medium text-teal-700"
              onClick={() => {
                setSelectedDate(null);
                setIsCreating(false);
              }}
              type="button"
            >
              Fechar
            </button>
          </div>

          {isCreating ? (
            <QuickShiftForm
              date={selectedDate}
              onCancel={() => setIsCreating(false)}
              onCreated={() => {
                setIsCreating(false);
                setSelectedDate(null);
              }}
              units={units}
            />
          ) : (
            <button
              className="min-h-12 w-full rounded-md bg-zinc-950 px-4 font-semibold text-white"
              onClick={() => setIsCreating(true)}
              type="button"
            >
              Lançar plantão neste dia
            </button>
          )}

          {selectedShifts.length === 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
              Nenhum plantão neste dia.
            </div>
          ) : (
            selectedShifts.map((shift) => (
              <article
                className="rounded-lg border border-zinc-200 bg-white p-4"
                key={shift.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{shift.unitName}</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      {shift.startTime} - {shift.endTime} · {shift.hours}h
                    </p>
                  </div>
                  <strong className="whitespace-nowrap">
                    {formatCurrency(shift.value)}
                  </strong>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className={`rounded-md px-2.5 py-1 ${MODALITY_STYLES[shift.category]}`}>
                    {MODALITY_LABELS[shift.category]}
                  </span>
                  <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-zinc-700">
                    {SHIFT_TYPE_LABELS[shift.shiftType]}
                  </span>
                  <span
                    className={`rounded-md px-2.5 py-1 ${PAYMENT_STATUS_STYLES[shift.paymentStatus]}`}
                  >
                    {PAYMENT_STATUS_LABELS[shift.paymentStatus]}
                  </span>
                </div>

                {shift.notes ? (
                  <p className="mt-3 text-sm text-zinc-500">{shift.notes}</p>
                ) : null}
              </article>
            ))
          )}

          {/*
            A agenda é para ver; a gestão fica em Plantões. Duplicar aqui o
            formulário de edição significaria manter dois caminhos para a mesma
            operação, que é onde as duas telas começam a divergir.
          */}
          <Link
            className="flex min-h-11 items-center justify-center rounded-md border border-zinc-200 text-sm font-medium text-zinc-700"
            href={`/plantoes?month=${month}&year=${year}`}
          >
            Gerenciar plantões deste mês
          </Link>
        </section>
      ) : null}
    </div>
  );
}

/** Rótulo do dia quando ele não tem plantão (e portanto não traz o rótulo pronto). */
function formatSelectedDate(isoDate: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
  }).format(new Date(`${isoDate}T00:00:00.000Z`));
}
