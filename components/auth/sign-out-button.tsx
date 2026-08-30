"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="mt-6 min-h-11 w-full rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-600 hover:bg-stone-100 hover:text-zinc-950"
      onClick={() => signOut({ callbackUrl: "/login" })}
      type="button"
    >
      Sair
    </button>
  );
}
