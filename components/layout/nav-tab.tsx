"use client";

import { useLinkStatus } from "next/link";
import { NavIconSvg } from "@/components/layout/nav-icon";
import type { NavItem } from "@/lib/navigation";

/**
 * O miolo de um item de navegação, com destaque imediato ao toque.
 *
 * **O problema que isto resolve.** O estado ativo vem de `usePathname()`, que
 * só muda quando a navegação termina. Toda tela privada consulta o Postgres
 * antes de renderizar — entre 160ms e 320ms medidos —, então, no celular, a
 * aba tocada ficava apagada durante esse tempo inteiro. Dá a sensação de que o
 * toque não pegou, e a reação natural é tocar de novo.
 *
 * `useLinkStatus` devolve `pending` já no toque, antes de a rota trocar. O item
 * assume o visual de ativo na hora e o mantém até o conteúdo chegar — quando
 * `usePathname()` finalmente concorda e o destaque simplesmente continua. Não
 * há nada piscando nem mudando de tamanho: só a mesma classe de fundo,
 * aplicada antes.
 *
 * Precisa ser um componente separado porque o hook só funciona *dentro* de um
 * `<Link>`, e a classe que muda é a do conteúdo, não a do link.
 */
export function NavTabBody({
  active,
  item,
}: {
  active: boolean;
  item: NavItem;
}) {
  const { pending } = useLinkStatus();
  const destacado = active || pending;

  return (
    <span
      className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-center text-[11px] font-medium transition ${
        destacado ? "bg-stone-100 text-zinc-950" : "text-zinc-500"
      }`}
    >
      <NavIconSvg name={item.icon} />
      {item.label}
    </span>
  );
}

/** Mesma ideia na lista vertical: barra lateral e painel "Mais". */
export function NavRowBody({
  active,
  item,
  tone,
}: {
  active: boolean;
  item: NavItem;
  tone: "painel" | "lateral";
}) {
  const { pending } = useLinkStatus();
  const destacado = active || pending;

  const base =
    tone === "lateral"
      ? "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition"
      : "flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-medium transition";

  return (
    <span
      className={`${base} ${
        destacado
          ? "bg-zinc-950 text-white"
          : tone === "lateral"
            ? "text-zinc-600 hover:bg-stone-100 hover:text-zinc-950"
            : "text-zinc-700"
      }`}
    >
      <NavIconSvg name={item.icon} />
      {item.label}
    </span>
  );
}
