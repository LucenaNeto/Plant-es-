import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { bottomNavItems } from "@/lib/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 pb-24 lg:pb-0">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-zinc-200 bg-white px-5 py-6 lg:block">
          <Link href="/dashboard" className="text-xl font-semibold text-zinc-950">
            Plantões+
          </Link>
          <nav className="mt-8 space-y-1">
            {bottomNavItems.map((item) => (
              <Link
                className="block rounded-md px-3 py-3 text-sm font-medium text-zinc-600 hover:bg-stone-100 hover:text-zinc-950"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <SignOutButton />
        </aside>

        <main className="w-full px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 px-2 py-2 shadow-lg backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {bottomNavItems.map((item) => (
            <Link
              className="flex min-h-14 flex-col items-center justify-center rounded-md px-1 text-center text-[11px] font-medium text-zinc-600 hover:bg-stone-100 hover:text-zinc-950"
              href={item.href}
              key={item.href}
            >
              <span className="mb-1 h-1.5 w-1.5 rounded-full bg-current" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
