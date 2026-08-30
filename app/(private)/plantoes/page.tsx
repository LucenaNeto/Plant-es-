import { PageHeader } from "@/components/ui/page-header";
import { modalityStyles, paymentStatusStyles, sampleShifts } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";

export default function PlantoesPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Plantões"
        title="Lista de plantões"
        description="Cards preparados para listar, editar, duplicar e marcar recebimentos nos próximos blocos."
        actionLabel="Novo plantão"
      />

      <section className="space-y-3">
        {sampleShifts.map((shift) => (
          <article className="rounded-lg border border-zinc-200 bg-white p-4" key={shift.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{shift.unit}</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {shift.dateLabel}, {shift.startTime} - {shift.endTime}
                </p>
              </div>
              <strong>{formatCurrency(shift.value)}</strong>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className={`rounded-md px-2.5 py-1 ${modalityStyles[shift.modality]}`}>
                {shift.modalityLabel}
              </span>
              <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-zinc-700">
                {shift.typeLabel}
              </span>
              <span className={`rounded-md px-2.5 py-1 ${paymentStatusStyles[shift.paymentStatus]}`}>
                {shift.paymentStatusLabel}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm font-medium">
              <button className="min-h-10 rounded-md border border-zinc-200 text-zinc-700">
                Editar
              </button>
              <button className="min-h-10 rounded-md border border-zinc-200 text-zinc-700">
                Duplicar
              </button>
              <button className="min-h-10 rounded-md bg-teal-600 text-white">
                Recebido
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
