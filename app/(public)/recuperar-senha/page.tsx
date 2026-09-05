import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  description: "Como recuperar o acesso à sua conta.",
  title: "Recuperar senha",
};

/**
 * A recuperação por e-mail ficou fora do MVP (exige provedor externo).
 *
 * A tela tinha um formulário completo com botão "Enviar instruções" que não
 * enviava nada — pior do que não ter tela nenhuma: o usuário digita o e-mail,
 * clica, não recebe nada, e conclui que o problema é a caixa de entrada dele.
 * Enquanto o fluxo não existe, a página diz a verdade e aponta o caminho que
 * de fato funciona.
 */
export default function RecuperarSenhaPage() {
  return (
    <main className="flex min-h-screen flex-col justify-center bg-stone-50 px-5 py-8">
      <section className="mx-auto w-full max-w-sm space-y-6">
        <div>
          <p className="text-sm font-semibold text-teal-700">Plantões+</p>
          <h1 className="mt-2 text-3xl font-semibold">Recuperar senha</h1>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm leading-6 text-zinc-600">
            A redefinição de senha por e-mail ainda não está disponível nesta
            versão.
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Se você perdeu o acesso, entre em contato com o suporte para
            recuperarmos sua conta manualmente.
          </p>
        </div>

        <Link
          href="/login"
          className="block text-center text-sm font-medium text-teal-700"
        >
          Voltar para o login
        </Link>
      </section>
    </main>
  );
}
