/**
 * Esqueleto da agenda: a grade do mês, não a lista genérica do grupo.
 *
 * O fallback do grupo desenha cartões empilhados, que é a forma de Plantões e
 * Gastos. Na agenda isso fazia a tela montar errada e depois se reorganizar —
 * o salto de layout que o esqueleto existe para evitar. Aqui a grade já nasce
 * com sete colunas e a mesma altura das células reais.
 */
export default function AgendaLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando a agenda...</span>

      <div className="space-y-3">
        <div className="h-4 w-20 animate-pulse rounded bg-zinc-200" />
        <div className="h-9 w-44 animate-pulse rounded bg-zinc-200" />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="h-9 w-9 animate-pulse rounded-md bg-zinc-100" />
          <div className="h-5 w-32 animate-pulse rounded bg-zinc-200" />
          <div className="h-9 w-9 animate-pulse rounded-md bg-zinc-100" />
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 42 }, (_, index) => (
            <div
              className="aspect-square animate-pulse rounded-md bg-stone-50"
              key={index}
            />
          ))}
        </div>
      </div>

      <div className="h-24 animate-pulse rounded-lg border border-zinc-200 bg-white" />
    </div>
  );
}
