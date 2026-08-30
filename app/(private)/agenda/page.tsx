import { PageHeader } from "@/components/ui/page-header";
import { modalityStyles, sampleCalendarDays, sampleShifts } from "@/lib/mock-data";

export default function AgendaPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Agenda"
        title="Agosto de 2026"
        description="Visão mensal inicial com cores por modalidade e detalhe rápido dos dias com plantão."
      />

      <section className="grid grid-cols-7 gap-1.5 rounded-lg border border-zinc-200 bg-white p-3">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((day, index) => (
          <div className="py-2 text-center text-xs font-semibold text-zinc-500" key={`${day}-${index}`}>
            {day}
          </div>
        ))}
        {sampleCalendarDays.map((day) => (
          <div
            className="flex aspect-square flex-col items-center justify-center rounded-md border border-zinc-100 bg-stone-50 text-sm"
            key={day.date}
          >
            <span className="font-medium">{day.day}</span>
            {day.modality ? (
              <span
                className={`mt-1 h-2 w-2 rounded-full ${
                  day.modality === "green"
                    ? "bg-teal-500"
                    : day.modality === "yellow"
                      ? "bg-amber-500"
                      : "bg-rose-500"
                }`}
              />
            ) : null}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Plantões do mês</h2>
        {sampleShifts.map((shift) => (
          <article className="rounded-lg border border-zinc-200 bg-white p-4" key={shift.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{shift.unit}</h3>
                <p className="text-sm text-zinc-500">
                  {shift.dateLabel}, {shift.startTime} - {shift.endTime}
                </p>
              </div>
              <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${modalityStyles[shift.modality]}`}>
                {shift.modalityLabel}
              </span>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
