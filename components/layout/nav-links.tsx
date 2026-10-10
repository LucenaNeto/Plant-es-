"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavRowBody } from "@/components/layout/nav-tab";
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
            className="block"
            href={item.href}
            key={item.href}
          >
            <NavRowBody active={isActive} item={item} tone="lateral" />
          </Link>
        );
      })}
    </>
  );
}
