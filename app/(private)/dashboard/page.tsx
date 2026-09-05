import type { Metadata } from "next";
import Link from "next/link";
import { QuickAction } from "@/components/ui/quick-action";
import { StatCard } from "@/components/ui/stat-card";
import { requireSession } from "@/lib/auth/session";
import {
  formatMonthLabel,
  todayAsCalendarDate,
} from "@/lib/dates/calendar-date";
import { formatCurrency } from "@/lib/format";
import {
  MODALITY_LABELS,
  MODALITY_STYLES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
  SHIFT_TYPE_LABELS,
} from "@/lib/shifts/labels";
import { getMonthlyFinance } from "@/server/services/finance";
import { findNextShift } from "@/server/services/shifts";
import { listUnits } from "@/server/services/units";

export const metadata: Metadata = {
  description: "Resumo do mês: plantões, recebimentos e gastos.",
  title: "Início",
};


/**
 * O dashboard é sempre "agora": mês corrente, sem navegação. Quem quer olhar
 * outro mês vai a Finanças, que tem o seletor. Duplicar a navegação aqui só
 * criaria duas telas fazendo a mesma coisa.
 */
export default async function DashboardPage() {
  const session = await requireSession();
  const today = todayAsCalendarDate();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;

  const [finance, nextShift, units] = await Promise.all([
    getMonthlyFinance(session.user.id, year, month),
    findNextShift(session.user.id),
    listUnits(session.user.id, { onlyActive: true }),
  ]);

  const hasActivity = finance.shiftCount > 0 || finance.expenseCount > 0;

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-zinc-950 px-5 py-6 text-white shadow-sm">
        <p className="text-sm font-medium text-teal-200">
          {formatMonthLabel(year, month)}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          {hasActivity ? "Seu mês em ordem" : "Vamos começar"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          {hasActivity
            ? "Acompanhe plantões, recebimentos e gastos operacionais em uma visão rápida."
            : "Cadastre uma unidade e lance seu primeiro plantão para ver os números aqui."}
        </p>
      </section>

      {units.length === 0 ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-900">Primeiro passo</h2>
          <p className="mt-1 text-sm text-amber-800">
            Cadastre a unidade onde você faz plantão. Os valores padrão dela
            preenchem os próximos lançamentos automaticamente.
          </p>
          <Link
            className="mt-3 flex min-h-11 items-center justify-center rounded-md bg-zinc-950 px-4 font-semibold text-white"
            href="/unidades"
          >
            Cadastrar unidade
          </Link>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-3">
        <StatCard label="Previsto" tone="teal" value={formatCurrency(finance.predicted)} />
        <StatCard label="Pendente" tone="amber" value={formatCurrency(finance.pending)} />
        <StatCard label="Recebido" tone="indigo" value={formatCurrency(finance.received)} />
        <StatCard label="Gastos" tone="rose" value={formatCurrency(finance.expenses)} />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-500">Líquido recebido</p>
            <strong className="mt-1 block text-2xl">
              {formatCurrency(finance.netReceived)}
            </strong>
            <p className="mt-1 text-xs text-zinc-500">
              Projetado: {formatCurrency(finance.netProjected)}
            </p>
          </div>
          <span className="whitespace-nowrap rounded-md bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700">
            {finance.shiftCount}{" "}
            {finance.shiftCount === 1 ? "plantão" : "plantões"}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <QuickAction href="/plantoes" label="Plantão" action="Adicionar" />
        <QuickAction href="/gastos" label="Gasto" action="Adicionar" />
        <QuickAction href="/unidades" label="Unidade" action="Adicionar" />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Próximo plantão</h2>
          <Link href="/agenda" className="text-sm font-medium text-teal-700">
            Ver agenda
          </Link>
        </div>

        {nextShift ? (
          <article className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{nextShift.unitName}</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  {nextShift.dateLabel}, {nextShift.startTime} -{" "}
                  {nextShift.endTime} · {nextShift.hours}h
                </p>
              </div>
              <span
                className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold ${MODALITY_STYLES[nextShift.category]}`}
              >
                {MODALITY_LABELS[nextShift.category]}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-zinc-700">
                  {SHIFT_TYPE_LABELS[nextShift.shiftType]}
                </span>
                <span
                  className={`rounded-md px-2.5 py-1 ${PAYMENT_STATUS_STYLES[nextShift.paymentStatus]}`}
                >
                  {PAYMENT_STATUS_LABELS[nextShift.paymentStatus]}
                </span>
              </span>
              <strong>{formatCurrency(nextShift.value)}</strong>
            </div>
          </article>
        ) : (
          <article className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
            Nenhum plantão agendado de hoje em diante.{" "}
            <Link className="font-medium text-teal-700" href="/plantoes">
              Lançar um plantão
            </Link>
          </article>
        )}
      </section>

      {finance.byUnit.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Resumo por unidade</h2>
            <Link href="/financas" className="text-sm font-medium text-teal-700">
              Ver finanças
            </Link>
          </div>

          {finance.byUnit.map((unit) => (
            <article
              className="rounded-lg border border-zinc-200 bg-white p-4"
              key={unit.unitId}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{unit.unitName}</h3>
                  <p className="text-sm text-zinc-500">
                    {unit.shiftCount}{" "}
                    {unit.shiftCount === 1 ? "plantão" : "plantões"} ·{" "}
                    {unit.hours}h
                  </p>
                </div>
                <strong>{formatCurrency(unit.gross)}</strong>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
