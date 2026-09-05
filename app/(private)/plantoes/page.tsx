import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ShiftFilters } from "@/features/shifts/shift-filters";
import { ShiftManagement } from "@/features/shifts/shift-management";
import { requireSession } from "@/lib/auth/session";
import { todayAsCalendarDate } from "@/lib/dates/calendar-date";
import { formatCurrency } from "@/lib/format";
import { shiftFiltersSchema } from "@/lib/validators/shifts";
import { listShifts, summarizeShifts } from "@/server/services/shifts";
import { listUnits } from "@/server/services/units";

/**
 * Interpreta os filtros da query string, caindo no mês corrente quando algo
 * vier ausente ou inválido.
 *
 * Filtro é entrada de usuário e a URL é editável à mão: um `?month=abacaxi`
 * não pode derrubar a página. Por isso o parse é tolerante — devolve o padrão
 * em vez de lançar.
 */
function resolveFilters(params: Record<string, string | string[] | undefined>) {
  const today = todayAsCalendarDate();
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const parsed = shiftFiltersSchema.safeParse({
    month: single("month") ?? today.getUTCMonth() + 1,
    paymentStatus: single("paymentStatus"),
    unitId: single("unitId"),
    year: single("year") ?? today.getUTCFullYear(),
  });

  if (parsed.success) {
    return parsed.data;
  }

  return {
    month: today.getUTCMonth() + 1,
    paymentStatus: undefined,
    unitId: undefined,
    year: today.getUTCFullYear(),
  };
}

export default async function PlantoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const filters = resolveFilters(await searchParams);

  const [shifts, units, summary] = await Promise.all([
    listShifts(session.user.id, filters),
    listUnits(session.user.id),
    summarizeShifts(session.user.id, filters),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Plantões"
        title="Meus plantões"
        description="Lance, edite e acompanhe o recebimento de cada plantão do mês."
      />

      <Suspense>
        <ShiftFilters
          month={filters.month}
          paymentStatus={filters.paymentStatus}
          unitId={filters.unitId}
          units={units}
          year={filters.year}
        />
      </Suspense>

      <section className="grid grid-cols-2 gap-3">
        <StatCard
          label={`Total (${summary.total.count})`}
          tone="zinc"
          value={formatCurrency(summary.total.value)}
        />
        <StatCard
          label="Previsto"
          tone="teal"
          value={formatCurrency(summary.predicted.value)}
        />
        <StatCard
          label="Pendente"
          tone="amber"
          value={formatCurrency(summary.pending.value)}
        />
        <StatCard
          label="Recebido"
          tone="indigo"
          value={formatCurrency(summary.received.value)}
        />
      </section>

      {summary.total.hours > 0 ? (
        <p className="text-sm text-zinc-500">
          {summary.total.hours}h no período
        </p>
      ) : null}

      <ShiftManagement shifts={shifts} units={units} />
    </div>
  );
}
