import { PageHeader } from "@/components/ui/page-header";
import { sampleExpenses } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";

export default function GastosPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Gastos"
        title="Gastos operacionais"
        description="Lançamentos gerais ou vinculados a unidade e plantão para cálculo do líquido mensal."
        actionLabel="Novo gasto"
      />

      <section className="space-y-3">
        {sampleExpenses.map((expense) => (
          <article className="rounded-lg border border-zinc-200 bg-white p-4" key={expense.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{expense.description}</h2>
                <p className="text-sm text-zinc-500">
                  {expense.category} · {expense.dateLabel}
                </p>
              </div>
              <strong>{formatCurrency(expense.amount)}</strong>
            </div>
            <p className="mt-3 text-sm text-zinc-500">{expense.linkedTo}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
