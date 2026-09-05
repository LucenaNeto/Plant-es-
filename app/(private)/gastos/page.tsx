import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ExpenseFilters } from "@/features/expenses/expense-filters";
import { ExpenseManagement } from "@/features/expenses/expense-management";
import { requireSession } from "@/lib/auth/session";
import { todayAsCalendarDate } from "@/lib/dates/calendar-date";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_STYLES,
} from "@/lib/expenses/labels";
import { formatCurrency } from "@/lib/format";
import { expenseFiltersSchema } from "@/lib/validators/expenses";
import { listExpenses, summarizeExpenses } from "@/server/services/expenses";
import { listShifts } from "@/server/services/shifts";
import { listUnits } from "@/server/services/units";

/**
 * Filtros da query string com o mês corrente como padrão. A URL é editável à
 * mão, então um `?month=abacaxi` cai no padrão em vez de derrubar a página.
 */
function resolveFilters(params: Record<string, string | string[] | undefined>) {
  const today = todayAsCalendarDate();
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const parsed = expenseFiltersSchema.safeParse({
    category: single("category"),
    month: single("month") ?? today.getUTCMonth() + 1,
    unitId: single("unitId"),
    year: single("year") ?? today.getUTCFullYear(),
  });

  if (parsed.success) {
    return parsed.data;
  }

  return {
    category: undefined,
    month: today.getUTCMonth() + 1,
    unitId: undefined,
    year: today.getUTCFullYear(),
  };
}

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const filters = resolveFilters(await searchParams);

  const [expenses, units, summary, shifts] = await Promise.all([
    listExpenses(session.user.id, filters),
    listUnits(session.user.id),
    summarizeExpenses(session.user.id, filters),
    // Plantões do mesmo mês alimentam o seletor de vínculo do formulário.
    listShifts(session.user.id, {
      month: filters.month,
      paymentStatus: undefined,
      unitId: undefined,
      year: filters.year,
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Gastos"
        title="Gastos operacionais"
        description="Lançamentos gerais ou vinculados a unidade e plantão, que entram no cálculo do líquido mensal."
      />

      <Suspense>
        <ExpenseFilters
          category={filters.category}
          month={filters.month}
          unitId={filters.unitId}
          units={units}
          year={filters.year}
        />
      </Suspense>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-500">Total do mês</p>
            <strong className="mt-1 block text-2xl">
              {formatCurrency(summary.total)}
            </strong>
          </div>
          <span className="text-sm text-zinc-500">
            {summary.count} {summary.count === 1 ? "lançamento" : "lançamentos"}
          </span>
        </div>

        {summary.byCategory.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {summary.byCategory.map((row) => (
              <li className="flex items-center gap-3" key={row.category}>
                <span
                  className={`w-36 shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${EXPENSE_CATEGORY_STYLES[row.category]}`}
                >
                  {EXPENSE_CATEGORY_LABELS[row.category]}
                </span>
                {/*
                  Barra proporcional ao maior gasto do mês. Como a lista já vem
                  ordenada do maior para o menor, o primeiro item é sempre a
                  referência de 100%.
                */}
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                  <span
                    className="block h-full rounded-full bg-zinc-800"
                    style={{
                      width: `${Math.round((row.amount / summary.byCategory[0].amount) * 100)}%`,
                    }}
                  />
                </span>
                <strong className="w-24 shrink-0 text-right text-sm">
                  {formatCurrency(row.amount)}
                </strong>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <ExpenseManagement expenses={expenses} shifts={shifts} units={units} />
    </div>
  );
}
