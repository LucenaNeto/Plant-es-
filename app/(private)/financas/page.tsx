import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { FinanceMonthFilter } from "@/features/finance/finance-month-filter";
import { requireSession } from "@/lib/auth/session";
import { todayAsCalendarDate } from "@/lib/dates/calendar-date";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_STYLES,
} from "@/lib/expenses/labels";
import { formatCurrency } from "@/lib/format";
import { getMonthlyFinance } from "@/server/services/finance";

export const metadata: Metadata = {
  description: "Quanto entrou, quanto falta receber e quanto sobrou no mês.",
  title: "Finanças",
};


function resolveMonth(params: Record<string, string | string[] | undefined>) {
  const today = todayAsCalendarDate();
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const month = Number(single("month"));
  const year = Number(single("year"));

  return {
    month: Number.isInteger(month) && month >= 1 && month <= 12
      ? month
      : today.getUTCMonth() + 1,
    year: Number.isInteger(year) && year >= 2000 && year <= 2100
      ? year
      : today.getUTCFullYear(),
  };
}

export default async function FinancasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const { month, year } = resolveMonth(await searchParams);
  const finance = await getMonthlyFinance(session.user.id, year, month);

  const isEmpty = finance.shiftCount === 0 && finance.expenseCount === 0;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Finanças"
        title="Resumo do mês"
        description="Quanto entrou, quanto falta receber e quanto sobrou depois dos gastos operacionais."
      />

      <Suspense>
        <FinanceMonthFilter month={month} year={year} />
      </Suspense>

      {isEmpty ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 text-center">
          <p className="font-medium">Nada lançado neste mês</p>
          <p className="mt-1 text-sm text-zinc-500">
            Lance{" "}
            <Link className="font-medium text-teal-700" href="/plantoes">
              plantões
            </Link>{" "}
            e{" "}
            <Link className="font-medium text-teal-700" href="/gastos">
              gastos
            </Link>{" "}
            para ver o resumo aqui.
          </p>
        </section>
      ) : (
        <>
          {/*
            Dois líquidos, não um. "Líquido" sozinho é ambíguo, e a diferença
            entre os dois é exatamente o que importa para quem depende de
            repasse: o mês pode parecer ótimo na projeção e não ter entrado
            nada ainda.
          */}
          <section className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-sm text-indigo-900/75">Líquido recebido</p>
              <strong className="mt-1 block text-2xl text-indigo-950">
                {formatCurrency(finance.netReceived)}
              </strong>
              <p className="mt-1 text-xs text-indigo-900/70">
                Recebido menos gastos — o que de fato entrou
              </p>
            </article>

            <article className="rounded-lg border border-teal-200 bg-teal-50 p-4">
              <p className="text-sm text-teal-900/75">Líquido projetado</p>
              <strong className="mt-1 block text-2xl text-teal-950">
                {formatCurrency(finance.netProjected)}
              </strong>
              <p className="mt-1 text-xs text-teal-900/70">
                Se tudo que está previsto e pendente for pago
              </p>
            </article>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <StatCard label="Previsto" tone="teal" value={formatCurrency(finance.predicted)} />
            <StatCard label="Pendente" tone="amber" value={formatCurrency(finance.pending)} />
            <StatCard label="Recebido" tone="indigo" value={formatCurrency(finance.received)} />
            <StatCard label="Gastos" tone="rose" value={formatCurrency(finance.expenses)} />
          </section>

          {/*
            Repassado fica fora dos quatro cards acima porque não é receita.
            Aparece só quando existe: um card zerado todo mês vira ruído para
            quem nunca passa plantão.
          */}
          {finance.handedOff > 0 ? (
            <section className="rounded-lg border border-violet-200 bg-violet-50 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-sm text-violet-900/75">Repassado</p>
                  <strong className="mt-1 block text-xl text-violet-950">
                    {formatCurrency(finance.handedOff)}
                  </strong>
                </div>
                <span className="text-sm text-violet-900/70">
                  {finance.handedOffCount}{" "}
                  {finance.handedOffCount === 1 ? "plantão" : "plantões"} de
                  outra pessoa
                </span>
              </div>
              <p className="mt-2 text-xs text-violet-900/70">
                Fora da receita — o valor é de quem assumiu o plantão
              </p>
            </section>
          ) : null}

          <section className="rounded-lg border border-zinc-200 bg-white p-4 text-sm">
            <dl className="space-y-2">
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Bruto do mês</dt>
                <dd className="font-semibold">{formatCurrency(finance.gross)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Ainda a receber</dt>
                <dd className="font-semibold">{formatCurrency(finance.toReceive)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-zinc-100 pt-2">
                <dt className="text-zinc-500">Plantões / horas</dt>
                <dd className="font-semibold">
                  {finance.shiftCount} · {finance.hours}h
                </dd>
              </div>
            </dl>
          </section>

          {finance.byUnit.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Por unidade</h2>
              {finance.byUnit.map((unit) => (
                <article
                  className="rounded-lg border border-zinc-200 bg-white p-4"
                  key={unit.unitId}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{unit.unitName}</h3>
                      <p className="mt-0.5 text-sm text-zinc-500">
                        {unit.shiftCount}{" "}
                        {unit.shiftCount === 1 ? "plantão" : "plantões"} ·{" "}
                        {unit.hours}h
                      </p>
                    </div>
                    <strong className="whitespace-nowrap">
                      {formatCurrency(unit.gross)}
                    </strong>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-3 text-sm">
                    <div>
                      <p className="text-xs text-zinc-500">Recebido</p>
                      <strong>{formatCurrency(unit.received)}</strong>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Gastos</p>
                      <strong>{formatCurrency(unit.expenses)}</strong>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Líquido</p>
                      <strong>{formatCurrency(unit.net)}</strong>
                    </div>
                  </div>
                </article>
              ))}

              {/*
                Sem este aviso, a soma dos líquidos por unidade não bate com o
                líquido do mês e o usuário deixa de confiar nos números.
              */}
              {finance.generalExpenses > 0 ? (
                <p className="rounded-md bg-stone-100 px-3 py-2 text-sm text-zinc-600">
                  {formatCurrency(finance.generalExpenses)} em gastos gerais não
                  estão atribuídos a nenhuma unidade e contam apenas no total do
                  mês.
                </p>
              ) : null}
            </section>
          ) : null}

          {finance.byCategory.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Gastos por categoria</h2>
              <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4">
                {finance.byCategory.map((row) => (
                  <div className="flex items-center gap-3" key={row.category}>
                    <span
                      className={`w-36 shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${EXPENSE_CATEGORY_STYLES[row.category]}`}
                    >
                      {EXPENSE_CATEGORY_LABELS[row.category]}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                      <span
                        className="block h-full rounded-full bg-zinc-800"
                        style={{
                          width: `${Math.round((row.amount / finance.byCategory[0].amount) * 100)}%`,
                        }}
                      />
                    </span>
                    <strong className="w-24 shrink-0 text-right text-sm">
                      {formatCurrency(row.amount)}
                    </strong>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
