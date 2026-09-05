/**
 * Fallback de carregamento do grupo privado. As páginas autenticadas fazem
 * consulta ao Postgres antes de renderizar; sem isto o usuário vê a navegação
 * congelar sem feedback ao trocar de aba.
 *
 * Esqueleto em vez de spinner: preserva a altura da tela e evita o salto de
 * layout quando o conteúdo real chega.
 */
export default function PrivateLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando...</span>

      <div className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-200" />
        <div className="h-9 w-56 animate-pulse rounded bg-zinc-200" />
        <div className="h-4 w-full max-w-md animate-pulse rounded bg-zinc-100" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="h-24 animate-pulse rounded-lg border border-zinc-200 bg-white"
            key={index}
          />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            className="h-28 animate-pulse rounded-lg border border-zinc-200 bg-white"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}
