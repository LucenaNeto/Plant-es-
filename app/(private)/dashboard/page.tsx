import type { Metadata } from "next";
import Link from "next/link";
import { QuickAction } from "@/components/ui/quick-action";
import { requireSession } from "@/lib/auth/session";
import {
  formatMonthLabel,
  todayAsCalendarDate,
  WEEKDAY_LABELS,
} from "@/lib/dates/calendar-date";
import { formatCurrency } from "@/lib/format";
import {
  MODALITY_DOT,
  MODALITY_LABELS,
  MODALITY_STYLES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
  SHIFT_TYPE_LABELS,
} from "@/lib/shifts/labels";
import { prisma } from "@/lib/db/prisma";
import { getMonthlyFinance } from "@/server/services/finance";
import { getScheduleWindow } from "@/server/services/shifts";

export const metadata: Metadata = {
  description: "Seus próximos plantões e o resumo do mês.",
  title: "Início",
};

/**
 * Tela inicial orientada ao cronograma.
 *
 * A pergunta que se abre o app para responder é "o que eu tenho agora e nos
 * próximos dias" — não "quanto faturei". Por isso o próximo plantão vem
 * primeiro, a semana logo abaixo, e o financeiro fecha a tela em uma linha.
 * Quem quer os números em detalhe vai a Finanças, que existe para isso.
 *
 * São quatro consultas: a janela de agenda (uma só, cobrindo semana e
 * próximos), as duas do resumo financeiro e a contagem de unidades. A versão
 * anterior fazia oito, e com `connection_limit=1` consultas não paralelizam.
 */
export default async function DashboardPage() {
  const session = await requireSession();
  const today = todayAsCalendarDate();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;

  const [schedule, finance, activeUnitCount] = await Promise.all([
    getScheduleWindow(session.user.id),
    getMonthlyFinance(session.user.id, year, month),
    prisma.unit.count({ where: { active: true, userId: session.user.id } }),
  ]);

  const [next, ...later] = schedule.upcoming;
  const weekShiftCount = schedule.week.reduce(
    (total, day) => total + day.shifts.length,
    0,
  );

  if (activeUnitCount === 0) {
    return (
      <div className="space-y-5">
        <section className="rounded-lg bg-zinc-950 px-5 py-6 text-white">
          <p className="text-sm font-medium text-teal-200">
            {formatMonthLabel(year, month)}
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Vamos começar</h1>
        </section>

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-900">Primeiro passo</h2>
          <p className="mt-1 text-sm leading-6 text-amber-800">
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
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-teal-700">
            {formatMonthLabel(year, month)}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold">Seus plantões</h1>
        </div>
        <span className="whitespace-nowrap text-sm text-zinc-500">
          {weekShiftCount === 0
            ? "semana livre"
            : `${weekShiftCount} ${weekShiftCount === 1 ? "esta semana" : "esta semana"}`}
        </span>
      </header>

      {next ? (
        <Link
          className="block rounded-lg border border-teal-200 bg-teal-50 p-4"
          href="/agenda"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {/*
                O rótulo relativo ("hoje", "em 3 dias") vem do servidor porque
                depende de "hoje" no fuso do app. Passado uma semana ele é
                `null` e a data crua informa melhor que uma contagem longa.
              */}
              <p className="text-sm font-medium text-teal-800">
                {next.relativeLabel ?? next.dateLabel}
              </p>
              <h2 className="mt-1 truncate text-lg font-semibold text-teal-950">
                {next.unitName}
              </h2>
              <p className="mt-1 text-sm text-teal-900/75">
                {next.dateLabel} · {next.startTime}–{next.endTime} · {next.hours}h
              </p>
            </div>
            <strong className="whitespace-nowrap text-teal-950">
              {formatCurrency(next.value)}
            </strong>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className={`rounded-md px-2.5 py-1 ${MODALITY_STYLES[next.category]}`}>
              {MODALITY_LABELS[next.category]}
            </span>
            <span className="rounded-md bg-white/70 px-2.5 py-1 text-teal-900">
              {SHIFT_TYPE_LABELS[next.shiftType]}
            </span>
            {next.isHandedOff ? (
              <span className="rounded-md bg-violet-100 px-2.5 py-1 text-violet-800">
                Repassado a {next.handoffTo}
              </span>
            ) : (
              <span className={`rounded-md px-2.5 py-1 ${PAYMENT_STATUS_STYLES[next.paymentStatus]}`}>
                {PAYMENT_STATUS_LABELS[next.paymentStatus]}
              </span>
            )}
          </div>
        </Link>
      ) : (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 text-center">
          <p className="font-medium">Nenhum plantão à frente</p>
          <p className="mt-1 text-sm text-zinc-500">
            Lance o próximo para ele aparecer aqui.
          </p>
          <Link
            className="mt-3 inline-flex min-h-11 items-center rounded-md bg-zinc-950 px-5 font-semibold text-white"
            href="/plantoes"
          >
            Novo plantão
          </Link>
        </section>
      )}

      <section aria-label="Esta semana" className="rounded-lg border border-zinc-200 bg-white p-3">
        <div className="grid grid-cols-7 gap-1.5">
          {schedule.week.map((day) => (
            <div className="text-center" key={day.date}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                {WEEKDAY_LABELS[day.weekday]}
              </p>
              {/*
                O dia ganha a cor da modalidade do plantão. Dias já passados
                perdem saturação: a semana é lida da esquerda para a direita e
                o que já foi cumprido não deve competir por atenção com o que
                ainda vem.
              */}
              <div
                className={`mt-1 flex min-h-11 flex-col items-center justify-center rounded-md border text-sm ${
                  day.isToday
                    ? "border-zinc-950 bg-zinc-950 font-semibold text-white"
                    : day.shifts.length > 0
                      ? "border-zinc-200 bg-stone-50 font-medium"
                      : "border-zinc-100"
                } ${day.isPast && !day.isToday ? "opacity-50" : ""}`}
              >
                <span>{day.day}</span>
                <span className="mt-0.5 flex h-1.5 items-center gap-0.5">
                  {day.shifts.slice(0, 3).map((shift) => (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        day.isToday ? "bg-white" : MODALITY_DOT[shift.category]
                      }`}
                      key={shift.id}
                    />
                  ))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {later.length > 0 ? (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Depois</h2>
            <Link className="text-sm font-medium text-teal-700" href="/plantoes">
              Ver todos
            </Link>
          </div>

          {later.map((shift) => (
            <article
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3"
              key={shift.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {shift.dateLabel} · {shift.unitName}
                </p>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {shift.startTime}–{shift.endTime} · {shift.hours}h
                  {shift.isHandedOff ? ` · repassado a ${shift.handoffTo}` : ""}
                </p>
              </div>
              <strong className="whitespace-nowrap text-sm">
                {formatCurrency(shift.value)}
              </strong>
            </article>
          ))}
        </section>
      ) : null}

      <section className="grid grid-cols-3 gap-3">
        <QuickAction href="/plantoes" label="Plantão" action="Adicionar" />
        <QuickAction href="/gastos" label="Gasto" action="Adicionar" />
        <QuickAction href="/agenda" label="Agenda" action="Abrir" />
      </section>

      {/*
        O financeiro fecha a tela em vez de abri-la. Continua acessível de
        relance, mas quem quer o detalhe tem uma aba inteira para isso.
      */}
      <Link
        className="block rounded-lg border border-zinc-200 bg-white p-4"
        href="/financas"
      >
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-500">A receber no mês</p>
            <strong className="mt-1 block text-2xl">
              {formatCurrency(finance.toReceive)}
            </strong>
          </div>
          <span className="whitespace-nowrap text-sm text-zinc-500">
            {finance.shiftCount}{" "}
            {finance.shiftCount === 1 ? "plantão" : "plantões"}
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-3 text-sm">
          <div>
            <dt className="text-xs text-zinc-500">Recebido</dt>
            <dd className="font-semibold">{formatCurrency(finance.received)}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Gastos</dt>
            <dd className="font-semibold">{formatCurrency(finance.expenses)}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Líquido</dt>
            <dd className="font-semibold">
              {formatCurrency(finance.netReceived)}
            </dd>
          </div>
        </dl>

        {finance.handedOff > 0 ? (
          <p className="mt-3 rounded-md bg-violet-50 px-3 py-2 text-xs text-violet-900">
            {formatCurrency(finance.handedOff)} repassado a outras pessoas, fora
            da sua receita
          </p>
        ) : null}
      </Link>
    </div>
  );
}
