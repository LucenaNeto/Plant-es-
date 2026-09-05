"use client";

import { useFilterParams } from "@/components/hooks/use-filter-params";
import { MonthNavigator } from "@/components/ui/month-navigator";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_OPTIONS,
} from "@/lib/expenses/labels";
import type { SerializedUnit } from "@/lib/units/serializer";

export function ExpenseFilters({
  category,
  month,
  unitId,
  units,
  year,
}: {
  category?: string;
  month: number;
  unitId?: string;
  units: SerializedUnit[];
  year: number;
}) {
  const { applyParams, isPending } = useFilterParams("/gastos");

  return (
    <section
      className={`space-y-3 rounded-lg border border-zinc-200 bg-white p-3 ${
        isPending ? "opacity-60" : ""
      }`}
    >
      <MonthNavigator
        month={month}
        onChange={(next) =>
          applyParams({
            month: String(next.month),
            year: String(next.year),
          })
        }
        year={year}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-600">
            Categoria
          </span>
          <select
            className="min-h-11 w-full rounded-md border border-zinc-200 bg-white px-3 outline-none focus:border-teal-500"
            onChange={(event) =>
              applyParams({ category: event.target.value || null })
            }
            value={category ?? ""}
          >
            <option value="">Todas as categorias</option>
            {EXPENSE_CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {EXPENSE_CATEGORY_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-600">
            Unidade
          </span>
          <select
            className="min-h-11 w-full rounded-md border border-zinc-200 bg-white px-3 outline-none focus:border-teal-500"
            onChange={(event) =>
              applyParams({ unitId: event.target.value || null })
            }
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
    </section>
  );
}
