import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/forms/register-form";

export const metadata: Metadata = {
  description: "Crie sua conta no Plantões+.",
  title: "Criar conta",
};


export default function CadastroPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-5 py-8">
      <section className="mx-auto w-full max-w-sm space-y-6">
        <div>
          <p className="text-sm font-semibold text-teal-700">Plantões+</p>
          <h1 className="mt-2 text-3xl font-semibold">Cadastro</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Comece a organizar seus plantões e o financeiro deles.
          </p>
        </div>

        <RegisterForm />

        <Link href="/login" className="block text-center text-sm font-medium text-teal-700">
          Já tenho conta
        </Link>
      </section>
    </main>
  );
}
