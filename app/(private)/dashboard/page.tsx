import Link from "next/link";
import { QuickAction } from "@/components/ui/quick-action";
import { StatCard } from "@/components/ui/stat-card";
import {
  modalityStyles,
  sampleFinance,
  sampleShifts,
  sampleUnits,
} from "@/lib/mock-data";
import { formatCurrency, formatShiftWindow } from "@/lib/format";

export default function DashboardPage() {
  const nextShift = sampleShifts[0];

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-zinc-950 px-5 py-6 text-white shadow-sm">
        <p className="text-sm font-medium text-teal-200">Agosto de 2026</p>
        <h1 className="mt-2 text-3xl font-semibold">Seu mês em ordem</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          Acompanhe plantões, recebimentos e gastos operacionais em uma visão
          rápida para celular.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <StatCard
          label="Previsto"
          value={formatCurrency(sampleFinance.predicted)}
          tone="teal"
        />
        <StatCard
          label="Pendente"
          value={formatCurrency(sampleFinance.pending)}
          tone="amber"
        />
        <StatCard
          label="Recebido"
          value={formatCurrency(sampleFinance.received)}
          tone="indigo"
        />
        <StatCard
          label="Gastos"
          value={formatCurrency(sampleFinance.expenses)}
          tone="rose"
        />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-500">Líquido estimado</p>
            <strong className="mt-1 block text-2xl">
              {formatCurrency(sampleFinance.netEstimated)}
            </strong>
          </div>
          <span className="rounded-md bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700">
            {sampleFinance.shiftCount} plantões
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

        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{nextShift.unit}</h3>
              <p className="mt-1 text-sm text-zinc-500">
                {formatShiftWindow(nextShift)}
              </p>
            </div>
            <span
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                modalityStyles[nextShift.modality]
              }`}
            >
              {nextShift.modalityLabel}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-zinc-500">{nextShift.typeLabel}</span>
            <strong>{formatCurrency(nextShift.value)}</strong>
          </div>
        </article>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Resumo por unidade</h2>
        <div className="space-y-3">
          {sampleUnits.map((unit) => (
            <article
              className="rounded-lg border border-zinc-200 bg-white p-4"
              key={unit.name}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{unit.name}</h3>
                  <p className="text-sm text-zinc-500">{unit.city}</p>
                </div>
                <strong>{formatCurrency(unit.monthValue)}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
