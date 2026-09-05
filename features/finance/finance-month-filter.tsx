"use client";

import { useFilterParams } from "@/components/hooks/use-filter-params";
import { MonthNavigator } from "@/components/ui/month-navigator";

export function FinanceMonthFilter({
  month,
  year,
}: {
  month: number;
  year: number;
}) {
  const { applyParams, isPending } = useFilterParams("/financas");

  return (
    <section
      className={`rounded-lg border border-zinc-200 bg-white p-3 ${
        isPending ? "opacity-60" : ""
      }`}
    >
      <MonthNavigator
        month={month}
        onChange={(next) =>
          applyParams({ month: String(next.month), year: String(next.year) })
        }
        year={year}
      />
    </section>
  );
}
