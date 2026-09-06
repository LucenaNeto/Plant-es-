/**
 * Gráfico de barras em SVG puro.
 *
 * Sem biblioteca: Recharts e Chart.js custam entre 70kb e 100kb no bundle, e
 * este app roda no celular de quem está dentro de um hospital. Um gráfico de
 * barras é um punhado de retângulos com rótulo — não justifica o peso.
 *
 * Server Component: não há interação, só desenho. Nada disso precisa ir para o
 * navegador como JavaScript.
 *
 * `viewBox` com `preserveAspectRatio` deixa o SVG escalar com a largura
 * disponível, então o mesmo componente serve celular e impressão.
 */
export function BarChart({
  bars,
  formatValue,
  height = 160,
}: {
  bars: { fill?: string; label: string; secondary?: string; value: number }[];
  /** Como escrever o número no topo da barra. */
  formatValue: (value: number) => string;
  height?: number;
}) {
  const maior = Math.max(...bars.map((bar) => bar.value), 0);
  const largura = 100 / Math.max(bars.length, 1);

  return (
    <div className="w-full">
      <svg
        aria-hidden="true"
        className="w-full"
        preserveAspectRatio="none"
        role="presentation"
        style={{ height }}
        viewBox={`0 0 100 ${height}`}
      >
        {bars.map((bar, indice) => {
          // Reserva 22px no topo para o rótulo do valor não encostar na borda.
          const disponivel = height - 22;
          const alturaBarra =
            maior > 0 ? Math.max((bar.value / maior) * disponivel, bar.value > 0 ? 2 : 0) : 0;

          return (
            <rect
              fill={bar.fill ?? "#0f766e"}
              height={alturaBarra}
              key={bar.label}
              rx="1"
              width={largura * 0.62}
              x={indice * largura + largura * 0.19}
              y={height - alturaBarra}
            />
          );
        })}
      </svg>

      {/*
        Os rótulos ficam em HTML, fora do SVG. Texto dentro de SVG com
        `preserveAspectRatio="none"` sai esticado junto com as barras; em HTML
        ele mantém a proporção e herda a tipografia do app.
      */}
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
      >
        {bars.map((bar) => (
          <div className="text-center" key={bar.label}>
            <p className="truncate text-[10px] font-semibold text-zinc-700">
              {bar.value > 0 ? formatValue(bar.value) : "–"}
            </p>
            <p className="truncate text-[11px] text-zinc-500">{bar.label}</p>
            {bar.secondary ? (
              <p className="truncate text-[10px] text-zinc-400">{bar.secondary}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
