import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { sampleExpenseGroups, sampleFinance, sampleUnits } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";

export default function FinancasPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Finanças"
        title="Resumo financeiro"
        description="Separação inicial entre previsto, pendente, recebido, gastos e líquido mensal."
      />

      <section className="grid grid-cols-2 gap-3">
        <StatCard label="Previsto" value={formatCurrency(sampleFinance.predicted)} tone="teal" />
        <StatCard label="Recebido" value={formatCurrency(sampleFinance.received)} tone="indigo" />
        <StatCard label="Pendente" value={formatCurrency(sampleFinance.pending)} tone="amber" />
        <StatCard label="Líquido" value={formatCurrency(sampleFinance.netEstimated)} tone="zinc" />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Receita por unidade</h2>
        {sampleUnits.map((unit) => (
          <article className="rounded-lg border border-zinc-200 bg-white p-4" key={unit.name}>
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{unit.name}</span>
              <strong>{formatCurrency(unit.monthValue)}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Gastos por categoria</h2>
        {sampleExpenseGroups.map((group) => (
          <article className="rounded-lg border border-zinc-200 bg-white p-4" key={group.category}>
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{group.category}</span>
              <strong>{formatCurrency(group.amount)}</strong>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
