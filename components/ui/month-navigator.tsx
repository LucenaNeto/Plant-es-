"use client";

import { formatMonthLabel } from "@/lib/dates/calendar-date";

/**
 * Navegação por mês, compartilhada por plantões, gastos, agenda e finanças.
 *
 * Puramente apresentacional: quem decide o que fazer com o mês novo é o pai.
 * Isso mantém o componente utilizável tanto por telas que gravam o mês na URL
 * quanto por qualquer outra que venha a guardá-lo de outro jeito.
 */
export function MonthNavigator({
  month,
  onChange,
  year,
}: {
  /** 1-12, não o índice 0-11 do `Date` do JavaScript. */
  month: number;
  onChange: (next: { month: number; year: number }) => void;
  year: number;
}) {
  function move(delta: number) {
    // `Date.UTC` resolve a virada de ano sozinho: mês 0 vira dezembro do ano
    // anterior, mês 13 vira janeiro do seguinte.
    const moved = new Date(Date.UTC(year, month - 1 + delta, 1));

    onChange({
      month: moved.getUTCMonth() + 1,
      year: moved.getUTCFullYear(),
    });
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <button
        aria-label="Mês anterior"
        className="min-h-11 min-w-11 rounded-md border border-zinc-200 text-lg font-semibold text-zinc-700"
        onClick={() => move(-1)}
        type="button"
      >
        ‹
      </button>

      <strong className="text-center text-base">
        {formatMonthLabel(year, month)}
      </strong>

      <button
        aria-label="Próximo mês"
        className="min-h-11 min-w-11 rounded-md border border-zinc-200 text-lg font-semibold text-zinc-700"
        onClick={() => move(1)}
        type="button"
      >
        ›
      </button>
    </div>
  );
}
