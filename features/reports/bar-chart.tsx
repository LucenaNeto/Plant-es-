export type Bar = {
  fill?: string;
  label: string;
  secondary?: string;
  /**
   * Segmento empilhado por cima do principal, com fundo mais claro.
   *
   * Existe para os gráficos de dinheiro: a barra mostra o recebido embaixo e o
   * que ainda falta receber por cima. Um gráfico só de recebido esconderia
   * justamente o que precisa de cobrança — e é essa diferença que o
   * comparativo existe para revelar.
   */
  stacked?: number;
  /**
   * Barra de comparação, desenhada ao lado da principal.
   *
   * É o "2025 vs 2026, mês a mês": duas barras lado a lado no mesmo mês. Quando
   * qualquer barra do gráfico tem `compare`, todas passam a ser desenhadas em
   * par — senão os meses ficariam com larguras diferentes e a comparação visual
   * se perderia.
   */
  compare?: number;
  value: number;
};

/**
 * Gráfico de barras em SVG puro.
 *
 * Sem biblioteca: Recharts e Chart.js custam entre 70kb e 100kb no bundle, e
 * este app roda no celular de quem está dentro de um hospital. Um gráfico de
 * barras é um punhado de retângulos com rótulo — não justifica o peso.
 *
 * Server Component: não há interação, só desenho. Nada disso precisa ir para o
 * navegador como JavaScript.
 */
export function BarChart({
  bars,
  compareFill = "#a1a1aa",
  formatValue,
  height = 160,
  stackedFill = "#99f6e4",
}: {
  bars: Bar[];
  compareFill?: string;
  /** Como escrever o número no topo da barra. */
  formatValue: (value: number) => string;
  height?: number;
  stackedFill?: string;
}) {
  const agrupado = bars.some((bar) => bar.compare !== undefined);
  // A escala considera o topo da pilha, não só o segmento de baixo — senão a
  // barra mais alta estouraria a área do gráfico.
  const maior = Math.max(
    ...bars.map((bar) => Math.max(bar.value + (bar.stacked ?? 0), bar.compare ?? 0)),
    0,
  );
  const largura = 100 / Math.max(bars.length, 1);
  const disponivel = height - 22;

  const altura = (valor: number) =>
    maior > 0 ? (valor / maior) * disponivel : 0;

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
          const alturaBase = altura(bar.value);
          const alturaTopo = altura(bar.stacked ?? 0);

          // Barra visível mesmo para valores minúsculos, mas nunca para zero:
          // um traço onde não houve nada mente sobre o mês.
          const base = bar.value > 0 ? Math.max(alturaBase, 2) : 0;
          const topo = (bar.stacked ?? 0) > 0 ? Math.max(alturaTopo, 2) : 0;

          // Agrupado: duas barras estreitas lado a lado. Sozinha: uma larga.
          const w = largura * (agrupado ? 0.3 : 0.62);
          const x = indice * largura + largura * (agrupado ? 0.17 : 0.19);
          const alturaCompare =
            (bar.compare ?? 0) > 0 ? Math.max(altura(bar.compare ?? 0), 2) : 0;

          return (
            <g key={bar.label}>
              {/* A comparação vem primeiro e à esquerda: passado antes do presente. */}
              {agrupado && alturaCompare > 0 ? (
                <rect
                  fill={compareFill}
                  height={alturaCompare}
                  rx="1"
                  width={w}
                  x={x}
                  y={height - alturaCompare}
                />
              ) : null}
              {topo > 0 ? (
                <rect
                  fill={stackedFill}
                  height={topo}
                  rx="1"
                  width={w}
                  x={agrupado ? x + w * 1.15 : x}
                  y={height - base - topo}
                />
              ) : null}
              {base > 0 ? (
                <rect
                  fill={bar.fill ?? "#0f766e"}
                  height={base}
                  rx="1"
                  width={w}
                  x={agrupado ? x + w * 1.15 : x}
                  y={height - base}
                />
              ) : null}
            </g>
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
              {bar.value > 0 || (bar.stacked ?? 0) > 0 || (bar.compare ?? 0) > 0
                ? formatValue(bar.value)
                : "–"}
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

/** Legenda das cores, para a pilha ou o par não virarem adivinhação. */
export function BarChartLegend({
  itens,
}: {
  itens: { color: string; label: string }[];
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
      {itens.map((item) => (
        <span className="flex items-center gap-1.5" key={item.label}>
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
