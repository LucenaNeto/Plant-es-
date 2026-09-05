import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = {
  description: "Acesse sua agenda e controle financeiro de plantões.",
  title: "Entrar",
};


export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col justify-center bg-stone-50 px-5 py-8">
      <section className="mx-auto w-full max-w-sm space-y-6">
        <div>
          <p className="text-sm font-semibold text-teal-700">Plantões+</p>
          <h1 className="mt-2 text-3xl font-semibold">Entrar</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Acesse sua agenda e controle financeiro de plantões.
          </p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>

        <div className="flex items-center justify-between text-sm">
          <Link href="/recuperar-senha" className="font-medium text-teal-700">
            Recuperar senha
          </Link>
          <Link href="/cadastro" className="font-medium text-teal-700">
            Criar conta
          </Link>
        </div>
      </section>
    </main>
  );
}
