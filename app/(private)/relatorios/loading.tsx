/**
 * Esqueleto dos relatórios. É a tela mais pesada do app — cinco consultas,
 * incluindo o agregado de todo o histórico — e também a que mais se beneficia
 * de um fallback com a forma certa: filtros, totais, dois gráficos e a lista
 * por unidade.
 */
export default function RelatoriosLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Montando o relatório...</span>

      <div className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-200" />
        <div className="h-9 w-52 animate-pulse rounded bg-zinc-200" />
      </div>

      <div className="h-20 animate-pulse rounded-lg border border-zinc-200 bg-white" />

      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="h-24 animate-pulse rounded-lg border border-zinc-200 bg-white"
            key={index}
          />
        ))}
      </div>

      {Array.from({ length: 2 }, (_, index) => (
        <div
          className="rounded-lg border border-zinc-200 bg-white p-4"
          key={index}
        >
          <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
          <div className="mt-4 flex h-32 items-end gap-1.5">
            {/*
              Barras de alturas diferentes: um bloco cinza uniforme não se lê
              como gráfico, e o salto quando o real chega fica maior.
            */}
            {[45, 70, 30, 85, 55, 65, 40, 75, 50, 60, 35, 80].map(
              (altura, barra) => (
                <div
                  className="flex-1 animate-pulse rounded-t bg-stone-100"
                  key={barra}
                  style={{ height: `${altura}%` }}
                />
              ),
            )}
          </div>
        </div>
      ))}

      <div className="space-y-3">
        {Array.from({ length: 2 }, (_, index) => (
          <div
            className="h-28 animate-pulse rounded-lg border border-zinc-200 bg-white"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}
