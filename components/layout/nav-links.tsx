"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIconSvg } from "@/components/layout/nav-icon";
import { isActiveNavItem, type NavItem } from "@/lib/navigation";

/**
 * Links de navegação com estado ativo.
 *
 * Até aqui o menu não indicava em que tela o usuário estava — num app de cinco
 * abas, sem esse sinal a pessoa toca no item em que já está e conclui que o
 * app travou.
 *
 * `aria-current="page"` acompanha o destaque visual: leitores de tela anunciam
 * a página atual em vez de ler cinco links indistinguíveis.
 */

export function BottomNavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const isActive = isActiveNavItem(pathname, item.href);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-center text-[11px] font-medium transition ${
              isActive
                ? "bg-stone-100 text-zinc-950"
                : "text-zinc-500 hover:bg-stone-50 hover:text-zinc-800"
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
