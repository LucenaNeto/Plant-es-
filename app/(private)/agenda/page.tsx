import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { AgendaCalendar } from "@/features/agenda/agenda-calendar";
import { requireSession } from "@/lib/auth/session";
import {
  toDateInputValue,
  todayAsCalendarDate,
} from "@/lib/dates/calendar-date";
import { formatCurrency } from "@/lib/format";
import { listShifts, summarizeShifts } from "@/server/services/shifts";
import { listUnits } from "@/server/services/units";

export const metadata: Metadata = {
  description: "Calendário mensal dos seus plantões.",
  title: "Agenda",
};


/**
 * A agenda só precisa de mês e ano. Diferente de plantões e gastos, não tem
 * filtro de unidade ou situação: o calendário existe para responder "o que eu
 * tenho neste mês", e filtrar a grade esconderia dias ocupados, que é
 * justamente o que ela deveria mostrar.
 */
function resolveMonth(params: Record<string, string | string[] | undefined>) {
  const today = todayAsCalendarDate();
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const month = Number(single("month"));
  const year = Number(single("year"));

  const isValidMonth = Number.isInteger(month) && month >= 1 && month <= 12;
  const isValidYear = Number.isInteger(year) && year >= 2000 && year <= 2100;

  return {
    month: isValidMonth ? month : today.getUTCMonth() + 1,
    year: isValidYear ? year : today.getUTCFullYear(),
  };
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const { month, year } = resolveMonth(await searchParams);
  const filters = {
    month,
    paymentStatus: undefined,
    unitId: undefined,
    year,
  };

  const [shifts, summary, units] = await Promise.all([
    listShifts(session.user.id, filters),
    summarizeShifts(session.user.id, filters),
    listUnits(session.user.id, { onlyActive: true }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Agenda"
        title="Visão mensal"
        description="Toque em um dia para ver os plantões daquela data."
      />

      <Suspense>
        <AgendaCalendar
          month={month}
          shifts={shifts}
          today={toDateInputValue(todayAsCalendarDate())}
          units={units}
          year={year}
        />
      </Suspense>

      {summary.total.count > 0 ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-500">Previsto no mês</p>
              <strong className="mt-1 block text-2xl">
                {formatCurrency(summary.total.value)}
              </strong>
            </div>
            <span className="text-sm text-zinc-500">
              {summary.total.count}{" "}
              {summary.total.count === 1 ? "plantão" : "plantões"} ·{" "}
              {summary.total.hours}h
            </span>
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 text-center">
          <p className="font-medium">Mês sem plantões</p>
          <p className="mt-1 text-sm text-zinc-500">
            Os plantões que você lançar aparecem coloridos por modalidade neste
            calendário.
          </p>
        </section>
      )}
    </div>
  );
}
