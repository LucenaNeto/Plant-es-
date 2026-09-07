import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { BarChart, BarChartLegend } from "@/features/reports/bar-chart";
import { ReportFilters } from "@/features/reports/report-filters";
import { requireSession } from "@/lib/auth/session";
import { formatMonthLabel, todayAsCalendarDate } from "@/lib/dates/calendar-date";
import { formatCurrency } from "@/lib/format";
import {
  PAYMENT_STATUS_LABELS,
  SHIFT_TYPE_LABELS,
} from "@/lib/shifts/labels";
import { getReport, listReportYears } from "@/server/services/reports";
import { listUnits } from "@/server/services/units";

export const metadata: Metadata = {
  description: "Relatório de plantões por unidade, com horas e valores.",
  title: "Relatórios",
};

const MESES_CURTOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** Quanto do bruto já entrou, em pontos percentuais inteiros. */
function percentual(parte: number, total: number) {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

function resolveFilters(params: Record<string, string | string[] | undefined>) {
  const hoje = todayAsCalendarDate();
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const ano = Number(single("year"));
  const mes = Number(single("month"));

  return {
    month: Number.isInteger(mes) && mes >= 1 && mes <= 12 ? mes : undefined,
    showValues: single("valores") === "1",
    unitId: single("unitId") || undefined,
    year:
      Number.isInteger(ano) && ano >= 2000 && ano <= 2100
        ? ano
        : hoje.getUTCFullYear(),
  };
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const filtros = resolveFilters(await searchParams);

  const [relatorio, units, years] = await Promise.all([
    getReport(session.user.id, filtros),
    listUnits(session.user.id),
    listReportYears(session.user.id),
  ]);

  const { showValues } = filtros;
  const periodo = filtros.month
    ? formatMonthLabel(filtros.year, filtros.month)
    : `Ano de ${filtros.year}`;

  const csvParams = new URLSearchParams({ year: String(filtros.year) });
  if (filtros.month) csvParams.set("month", String(filtros.month));
  if (filtros.unitId) csvParams.set("unitId", filtros.unitId);
  if (showValues) csvParams.set("valores", "1");

  const temHistorico = relatorio.yearly.length > 1;
  const aReceber =
    Math.round((relatorio.totals.value - relatorio.totals.received) * 100) / 100;

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <PageHeader
          eyebrow="Relatórios"
          title="Plantões por unidade"
          description="Exporte a escala e o financeiro por unidade ou de todas de uma vez."
        />
      </div>

      <Suspense>
        <ReportFilters
          month={filtros.month}
          showValues={showValues}
          unitId={filtros.unitId}
          units={units}
          year={filtros.year}
          years={years}
        />
      </Suspense>

      {/*
        Cabeçalho do documento. Escondido na tela e visível só na impressão:
        quem lê o relatório impresso precisa saber de quem e de que período ele
        é, mas na tela essa informação já está nos filtros logo acima.
      */}
      <header className="hidden print:block">
        <h1 className="text-2xl font-semibold">{relatorio.user.name}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {relatorio.user.profession}
          {relatorio.user.specialty ? ` · ${relatorio.user.specialty}` : ""}
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          Relatório de plantões · {periodo}
          {filtros.unitId
            ? ` · ${relatorio.byUnit[0]?.unitName ?? "unidade"}`
            : " · todas as unidades"}
        </p>
      </header>

      {relatorio.totals.shiftCount === 0 && relatorio.handedOffCount === 0 ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 text-center">
          <p className="font-medium">Nenhum plantão neste período</p>
          <p className="mt-1 text-sm text-zinc-500">
            Ajuste o período acima ou{" "}
            <Link className="font-medium text-teal-700" href="/plantoes">
              lance um plantão
            </Link>
            .
          </p>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-xs text-zinc-500">Plantões</p>
              <strong className="mt-1 block text-xl">
                {relatorio.totals.shiftCount}
              </strong>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-xs text-zinc-500">Horas</p>
              <strong className="mt-1 block text-xl">
                {relatorio.totals.hours}h
              </strong>
            </div>
            {showValues ? (
              <>
                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                  <p className="text-xs text-zinc-500">Bruto</p>
                  <strong className="mt-1 block text-xl">
                    {formatCurrency(relatorio.totals.value)}
                  </strong>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                  <p className="text-xs text-zinc-500">Recebido</p>
                  <strong className="mt-1 block text-xl">
                    {formatCurrency(relatorio.totals.received)}
                  </strong>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-zinc-200 bg-white p-3">
                <p className="text-xs text-zinc-500">Unidades</p>
                <strong className="mt-1 block text-xl">
                  {relatorio.byUnit.length}
                </strong>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-4 print:break-inside-avoid">
            <h2 className="text-base font-semibold">
              Horas por mês · {filtros.year}
            </h2>
            <div className="mt-3">
              <BarChart
                bars={relatorio.monthly.map((linha) => ({
                  fill: linha.month === filtros.month ? "#09090b" : "#0f766e",
                  label: MESES_CURTOS[linha.month - 1],
                  secondary:
                    linha.shiftCount > 0 ? `${linha.shiftCount}p` : undefined,
                  value: linha.hours,
                }))}
                formatValue={(valor) => `${valor}h`}
              />
            </div>
          </section>

          {temHistorico ? (
            <section className="rounded-lg border border-zinc-200 bg-white p-4 print:break-inside-avoid">
              <h2 className="text-base font-semibold">Comparação por ano</h2>
              <div className="mt-3">
                <BarChart
                  bars={relatorio.yearly.map((linha) => ({
                    fill: linha.year === filtros.year ? "#09090b" : "#0f766e",
                    label: String(linha.year),
                    secondary: `${linha.shiftCount}p`,
                    value: linha.hours,
                  }))}
                  formatValue={(valor) => `${valor}h`}
                />
              </div>
            </section>
          ) : null}

          {/*
            Recebimentos. Só aparece com "incluir valores" ligado: o relatório
            operacional é feito para mandar ao hospital, e mostrar dinheiro ali
            seria vazar informação que não é da conta de quem recebe a escala.
          */}
          {showValues ? (
            <>
              <section className="grid grid-cols-2 gap-3">
                <article className="rounded-lg border border-teal-200 bg-teal-50 p-4">
                  <p className="text-sm text-teal-900/75">Recebido</p>
                  <strong className="mt-1 block text-2xl text-teal-950">
                    {formatCurrency(relatorio.totals.received)}
                  </strong>
                  <p className="mt-1 text-xs text-teal-900/70">
                    {percentual(relatorio.totals.received, relatorio.totals.value)}
                    % do bruto do período
                  </p>
                </article>

                <article className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm text-amber-900/75">Ainda a receber</p>
                  <strong className="mt-1 block text-2xl text-amber-950">
                    {formatCurrency(aReceber)}
                  </strong>
                  <p className="mt-1 text-xs text-amber-900/70">
                    {aReceber > 0
                      ? "Plantões trabalhados sem pagamento confirmado"
                      : "Tudo em dia"}
                  </p>
                </article>
              </section>

              <section className="rounded-lg border border-zinc-200 bg-white p-4 print:break-inside-avoid">
                <h2 className="text-base font-semibold">
                  Recebimentos por mês · {filtros.year}
                </h2>
                <div className="mt-3">
                  <BarChart
                    bars={relatorio.monthly.map((linha) => ({
                      label: MESES_CURTOS[linha.month - 1],
                      secondary:
                        linha.toReceive > 0
                          ? `+${formatCurrency(linha.toReceive)}`
                          : undefined,
                      stacked: linha.toReceive,
                      value: linha.received,
                    }))}
                    formatValue={(valor) => formatCurrency(valor)}
                  />
                </div>
                <BarChartLegend base="Recebido" stacked="A receber" />
              </section>

              {temHistorico ? (
                <section className="rounded-lg border border-zinc-200 bg-white p-4 print:break-inside-avoid">
                  <h2 className="text-base font-semibold">
                    Recebimentos por ano
                  </h2>
                  <div className="mt-3">
                    <BarChart
                      bars={relatorio.yearly.map((linha) => ({
                        label: String(linha.year),
                        secondary:
                          linha.toReceive > 0
                            ? `+${formatCurrency(linha.toReceive)}`
                            : undefined,
                        stacked: linha.toReceive,
                        value: linha.received,
                      }))}
                      formatValue={(valor) => formatCurrency(valor)}
                    />
                  </div>
                  <BarChartLegend base="Recebido" stacked="A receber" />
                </section>
              ) : null}
            </>
          ) : null}

          {relatorio.byUnit.map((unidade) => (
            <section
              className="rounded-lg border border-zinc-200 bg-white print:break-inside-avoid"
              key={unidade.unitName}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-100 p-4">
                <h2 className="font-semibold">{unidade.unitName}</h2>
                <p className="text-sm text-zinc-500">
                  {unidade.shifts.filter((s) => !s.handoffTo).length} plantões ·{" "}
                  {unidade.hours}h
                  {showValues ? ` · ${formatCurrency(unidade.value)}` : ""}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-500">
                      <th className="px-4 py-2 font-semibold">Data</th>
                      <th className="px-4 py-2 font-semibold">Horário</th>
                      <th className="px-4 py-2 font-semibold">Horas</th>
                      <th className="px-4 py-2 font-semibold">Tipo</th>
                      {showValues ? (
                        <>
                          <th className="px-4 py-2 text-right font-semibold">Valor</th>
                          <th className="px-4 py-2 font-semibold">Situação</th>
                        </>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {unidade.shifts.map((plantao) => (
                      <tr className="border-b border-zinc-50" key={plantao.id}>
                        <td className="whitespace-nowrap px-4 py-2">
                          {plantao.dateLabel}{" "}
                          <span className="text-zinc-400">{plantao.weekday}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-zinc-600">
                          {plantao.startTime}–{plantao.endTime}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-zinc-600">
                          {plantao.handoffTo ? "–" : `${plantao.hours}h`}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-zinc-600">
                          {plantao.handoffTo
                            ? `Repassado a ${plantao.handoffTo}`
                            : SHIFT_TYPE_LABELS[
                                plantao.shiftType as keyof typeof SHIFT_TYPE_LABELS
                              ]}
                        </td>
                        {showValues ? (
                          <>
                            <td className="whitespace-nowrap px-4 py-2 text-right">
                              {plantao.handoffTo
                                ? "–"
                                : formatCurrency(plantao.value)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2 text-zinc-600">
                              {plantao.handoffTo
                                ? "Fora da receita"
                                : PAYMENT_STATUS_LABELS[
                                    plantao.paymentStatus as keyof typeof PAYMENT_STATUS_LABELS
                                  ]}
                            </td>
                          </>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          {relatorio.handedOffCount > 0 ? (
            <p className="rounded-md bg-violet-50 px-3 py-2 text-sm text-violet-900">
              {relatorio.handedOffCount}{" "}
              {relatorio.handedOffCount === 1 ? "plantão foi repassado" : "plantões foram repassados"}{" "}
              a outra pessoa. Aparecem na escala, mas ficam fora das horas e dos
              valores.
            </p>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2 print:hidden">
            {/*
              Dois formatos para dois leitores. O CSV vai para planilha e
              contador; o TXT é o texto que se cola numa mensagem para avisar a
              escala a um colega ou ao hospital.
            */}
            <a
              className="flex min-h-12 items-center justify-center rounded-md border border-zinc-200 font-semibold text-zinc-700"
              href={`/api/relatorios/txt?${csvParams.toString()}`}
            >
              Baixar TXT
            </a>
            <a
              className="flex min-h-12 items-center justify-center rounded-md border border-zinc-200 font-semibold text-zinc-700"
              href={`/api/relatorios/csv?${csvParams.toString()}`}
            >
              Baixar CSV
            </a>
          </div>
        </>
      )}
    </div>
  );
}
