import Link from "next/link";

export default function RecuperarSenhaPage() {
  return (
    <main className="flex min-h-screen flex-col justify-center bg-stone-50 px-5 py-8">
      <section className="mx-auto w-full max-w-sm space-y-6">
        <div>
          <p className="text-sm font-semibold text-teal-700">Plantões+</p>
          <h1 className="mt-2 text-3xl font-semibold">Recuperar senha</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Fluxo reservado para envio de instruções de recuperação.
          </p>
        </div>

        <form className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-600">E-mail</span>
            <input
              className="min-h-12 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-teal-500"
              placeholder="voce@email.com"
              type="email"
            />
          </label>
          <button className="min-h-12 w-full rounded-md bg-zinc-950 px-4 font-semibold text-white">
            Enviar instruções
          </button>
        </form>

        <Link href="/login" className="block text-center text-sm font-medium text-teal-700">
          Voltar para login
        </Link>
      </section>
    </main>
  );
}
