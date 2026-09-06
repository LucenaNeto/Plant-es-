"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIconSvg } from "@/components/layout/nav-icon";
import { isActiveNavItem, type NavItem } from "@/lib/navigation";

/**
 * Links da barra lateral, com estado ativo.
 *
 * `aria-current="page"` acompanha o destaque visual: leitores de tela anunciam
 * a página atual em vez de ler uma lista de links indistinguíveis.
 *
 * A barra do celular vive em `bottom-nav.tsx`, que precisa de estado próprio
 * para o menu "Mais" — separar evita carregar essa lógica no desktop, onde
 * todos os destinos já cabem na lateral.
 */

export function SidebarNavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const isActive = isActiveNavItem(pathname, item.href);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition ${
              isActive
                ? "bg-zinc-950 text-white"
                : "text-zinc-600 hover:bg-stone-100 hover:text-zinc-950"
            }`}
            href={item.href}
            key={item.href}
          >
            <NavIconSvg name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
