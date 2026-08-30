import { PageHeader } from "@/components/ui/page-header";
import { sampleUnits } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";

export default function UnidadesPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Unidades"
        title="Locais de trabalho"
        description="Base para cadastrar hospitais, UPAs, clínicas e unidades fixas com valores padrão."
        actionLabel="Nova unidade"
      />

      <section className="space-y-3">
        {sampleUnits.map((unit) => (
          <article className="rounded-lg border border-zinc-200 bg-white p-4" key={unit.name}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{unit.name}</h2>
                <p className="text-sm text-zinc-500">
                  {unit.type} em {unit.city}
                </p>
              </div>
              <span className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                {unit.isFixed ? "Fixa" : "Extra"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-zinc-500">Valor padrão</p>
                <strong>{formatCurrency(unit.defaultValue)}</strong>
              </div>
              <div>
                <p className="text-zinc-500">Carga horária</p>
                <strong>{unit.defaultHours}h</strong>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
