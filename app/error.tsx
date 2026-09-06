"use client";

import Link from "next/link";

/**
 * Limite de erro da raiz.
 *
 * Existe por dois motivos. O primeiro é cobertura: `app/(private)/error.tsx`
 * pega erros das páginas privadas, mas um erro no **layout** daquele grupo
 * passa por cima dele e ia parar em `global-error.tsx`, que é a tela de "o app
 * não iniciou" — dura demais para uma falha de navegação.
 *
 * O segundo é diagnóstico: o texto abaixo é deliberadamente diferente do da
 * tela privada. Sabendo qual das duas apareceu, dá para localizar o erro sem
 * ler um único log — se for esta, o problema está no layout ou na sessão, e
 * não na página.
 */
export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="text-sm font-semibold text-teal-700">Plantões+</p>
      <h1 className="text-2xl font-semibold">Não foi possível abrir o app</h1>
      <p className="max-w-sm text-sm leading-6 text-zinc-500">
        A falha aconteceu antes da tela carregar. Seus dados estão salvos.
      </p>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <button
          className="min-h-12 rounded-md bg-zinc-950 px-6 font-semibold text-white"
          onClick={() => retry()}
          type="button"
        >
          Tentar novamente
        </button>
        <Link
          className="flex min-h-11 items-center justify-center rounded-md border border-zinc-200 text-sm font-medium text-zinc-700"
          href="/login"
        >
          Entrar novamente
        </Link>
      </div>

      {error.digest ? (
        <p className="text-xs text-zinc-400">
          Código do erro: <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
    </main>
  );
}
