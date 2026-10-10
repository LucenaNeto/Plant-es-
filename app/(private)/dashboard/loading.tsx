/**
 * Esqueleto da tela inicial, na ordem em que ela realmente aparece: o próximo
 * plantão em destaque, a faixa da semana, a lista do que vem depois e, por
 * último, o resumo financeiro.
 *
 * Esta é a primeira tela depois do login — a única cujo carregamento quase
 * todo mundo vê todo dia. Vale desenhá-la com a forma certa.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando seus plantões...</span>

      <div className="flex items-baseline justify-between gap-3">
        <div className="space-y-2">
          <div className="h-4 w-28 animate-pulse rounded bg-zinc-200" />
          <div className="h-7 w-40 animate-pulse rounded bg-zinc-200" />
        </div>
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
      </div>

      <div className="h-36 animate-pulse rounded-lg border border-teal-200 bg-teal-50" />

      <div className="rounded-lg border border-zinc-200 bg-white p-3">
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }, (_, index) => (
            <div className="space-y-1" key={index}>
              <div className="mx-auto h-3 w-6 animate-pulse rounded bg-zinc-100" />
              <div className="h-11 animate-pulse rounded-md bg-stone-50" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            className="h-16 animate-pulse rounded-lg border border-zinc-200 bg-white"
            key={index}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            className="h-20 animate-pulse rounded-lg border border-zinc-200 bg-white"
            key={index}
          />
        ))}
      </div>

      <div className="h-32 animate-pulse rounded-lg border border-zinc-200 bg-white" />
    </div>
  );
}
