import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  BottomNavLinks,
  SidebarNavLinks,
} from "@/components/layout/nav-links";
import { bottomNavItems, secondaryNavItems } from "@/lib/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 pb-24 lg:pb-0">
      {/*
        Atalho para pular a navegação. Fica fora da tela até receber foco pelo
        teclado — quem navega por Tab não precisa atravessar sete links em toda
        troca de página.
      */}
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-zinc-950 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        href="#conteudo"
      >
        Pular para o conteúdo
      </a>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-zinc-200 bg-white px-5 py-6 lg:block">
          <Link href="/dashboard" className="text-xl font-semibold text-zinc-950">
            Plantões+
          </Link>

          <nav aria-label="Navegação principal" className="mt-8 space-y-1">
            <SidebarNavLinks items={bottomNavItems} />
          </nav>

          <nav aria-label="Cadastros" className="mt-6 space-y-1 border-t border-zinc-100 pt-6">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Cadastros
            </p>
            <SidebarNavLinks items={secondaryNavItems} />
          </nav>

          <SignOutButton />
        </aside>

        <main className="w-full px-4 py-5 sm:px-6 lg:px-8" id="conteudo">
          {children}
        </main>
      </div>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-lg backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          <BottomNavLinks items={bottomNavItems} />
        </div>
      </nav>
    </div>
  );
}
