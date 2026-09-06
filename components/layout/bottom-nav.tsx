"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { NavIconSvg } from "@/components/layout/nav-icon";
import {
  bottomNavItems,
  isActiveNavItem,
  moreNavItems,
} from "@/lib/navigation";

/**
 * Barra de navegação do celular.
 *
 * Quatro destinos fixos mais o botão "Mais", que revela o restante. A versão
 * anterior tinha cinco destinos fixos e deixava Gastos, Unidades e Relatórios
 * apenas na barra lateral — que só existe a partir de 1024px. Num app
 * mobile-first, isso são três seções inacessíveis justamente no aparelho para o
 * qual ele foi feito.
 */
export function BottomNav() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  const algumSecundarioAtivo = moreNavItems.some((item) =>
    isActiveNavItem(pathname, item.href),
  );

  return (
    <div className="lg:hidden">
      {aberto ? (
        <>
          {/*
            Camada de fechamento. Precisa vir antes do painel na ordem do DOM
            para ficar atrás dele, e cobre a tela inteira para que tocar em
            qualquer lugar feche — o gesto que a pessoa tenta primeiro.
          */}
          <button
            aria-label="Fechar menu"
            className="fixed inset-0 z-40 bg-zinc-950/20"
            onClick={() => setAberto(false)}
            type="button"
          />

          <nav
            aria-label="Mais seções"
            className="fixed inset-x-0 bottom-[4.5rem] z-50 mx-3 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg"
          >
            {moreNavItems.map((item) => {
              const ativo = isActiveNavItem(pathname, item.href);

              return (
                <Link
                  aria-current={ativo ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-medium ${
                    ativo ? "bg-zinc-950 text-white" : "text-zinc-700"
                  }`}
                  href={item.href}
                  key={item.href}
                  // Fecha ao navegar. Feito no clique, e não num efeito sobre
                  // o pathname: reagir à navegação dispararia render em
                  // cascata para um estado que já sabemos no momento do toque.
                  onClick={() => setAberto(false)}
                >
                  <NavIconSvg name={item.icon} />
                  {item.label}
                </Link>
              );
            })}

            <button
              className="mt-1 flex min-h-12 w-full items-center gap-3 rounded-md border-t border-zinc-100 px-3 text-sm font-medium text-zinc-500"
              onClick={() => signOut({ callbackUrl: "/login" })}
              type="button"
            >
              Sair
            </button>
          </nav>
        </>
      ) : null}

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-lg backdrop-blur"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {bottomNavItems.map((item) => {
            const ativo = isActiveNavItem(pathname, item.href);

            return (
              <Link
                aria-current={ativo ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-center text-[11px] font-medium transition ${
                  ativo
                    ? "bg-stone-100 text-zinc-950"
                    : "text-zinc-500 hover:bg-stone-50"
                }`}
                href={item.href}
                key={item.href}
              >
                <NavIconSvg name={item.icon} />
                {item.label}
              </Link>
            );
          })}

          {/*
            "Mais" fica destacado quando a tela atual está dentro dele. Sem
            isso, quem estivesse em Relatórios não veria nenhum item marcado e
            perderia a referência de onde está.
          */}
          <button
            aria-expanded={aberto}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-center text-[11px] font-medium transition ${
              aberto || algumSecundarioAtivo
                ? "bg-stone-100 text-zinc-950"
                : "text-zinc-500"
            }`}
            onClick={() => setAberto((atual) => !atual)}
            type="button"
          >
            <NavIconSvg name="more" />
            Mais
          </button>
        </div>
      </nav>
    </div>
  );
}
