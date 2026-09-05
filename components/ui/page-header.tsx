/**
 * Cabeçalho de página.
 *
 * Tinha uma prop `actionLabel` que renderizava um botão sem `onClick` — um
 * controle que parecia clicável e não fazia nada. Nenhuma tela ainda o usa
 * desde que os blocos de CRUD passaram a ter seus próprios botões ligados a
 * Server Actions, então a prop saiu em vez de continuar disponível para
 * reintroduzir o mesmo botão morto.
 */
export function PageHeader({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <header>
      <p className="text-sm font-semibold text-teal-700">{eyebrow}</p>
      <h1 className="mt-1 text-3xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
        {description}
      </p>
    </header>
  );
}
