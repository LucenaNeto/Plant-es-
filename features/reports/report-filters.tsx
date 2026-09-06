"use client";

import { useFilterParams } from "@/components/hooks/use-filter-params";
import { formatMonthLabel } from "@/lib/dates/calendar-date";
import type { SerializedUnit } from "@/lib/units/serializer";

const MESES = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * Filtros do relatório, na query string.
 *
 * Estar na URL importa mais aqui que nas outras telas: um relatório é algo que
 * se manda para alguém, se salva nos favoritos e se refaz no mês seguinte. Com
 * os filtros no endereço, a mesma seleção volta com um clique.
 *
 * O botão de imprimir vive aqui porque precisa de `window.print()`, e some na
 * impressão — imprimir um botão de imprimir não faz sentido.
 */
export function ReportFilters({
  month,
  showValues,
  unitId,
  units,
  year,
  years,
}: {
  month?: number;
  showValues: boolean;
  unitId?: string;
  units: SerializedUnit[];
  year: number;
  years: number[];
}) {
  const { applyParams, isPending } = useFilterParams("/relatorios");
  const anos = years.length > 0 ? years : [year];

  return (
    <section
      className={`space-y-3 rounded-lg border border-zinc-200 bg-white p-3 print:hidden ${
        isPending ? "opacity-60" : ""
      }`}
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-600">Ano</span>
          <select
            className="min-h-11 w-full rounded-md border border-zinc-200 bg-white px-3 outline-none focus:border-teal-500"
            onChange={(event) => applyParams({ year: event.target.value })}
            value={year}
          >
            {anos.map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-600">Período</span>
          <select
            className="min-h-11 w-full rounded-md border border-zinc-200 bg-white px-3 outline-none focus:border-teal-500"
            onChange={(event) => applyParams({ month: event.target.value || null })}
            value={month ?? ""}
          >
            <option value="">Ano inteiro</option>
            {MESES.map((mes) => (
              <option key={mes} value={mes}>
                {formatMonthLabel(year, mes).split(" de ")[0]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-600">Unidade</span>
          <select
            className="min-h-11 w-full rounded-md border border-zinc-200 bg-white px-3 outline-none focus:border-teal-500"
            onChange={(event) => applyParams({ unitId: event.target.value || null })}
            value={unitId ?? ""}
          >
            <option value="">Todas as unidades</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
        <label className="flex items-center gap-2">
          <input
            checked={showValues}
            className="h-5 w-5 accent-teal-600"
            onChange={(event) =>
              applyParams({ valores: event.target.checked ? "1" : null })
            }
            type="checkbox"
          />
          <span className="text-sm font-medium text-zinc-700">
            Incluir valores
          </span>
        </label>

        <button
          className="min-h-11 rounded-md border border-zinc-200 px-4 text-sm font-medium text-zinc-700"
          onClick={() => window.print()}
          type="button"
        >
          Imprimir ou salvar em PDF
        </button>
      </div>
    </section>
  );
}
