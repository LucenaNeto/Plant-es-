"use client";

import { useEffect } from "react";

/**
 * Limite de erro do grupo privado. Captura exceções de render das páginas
 * autenticadas sem derrubar o shell (navegação continua funcionando).
 *
 * No Next 16 a prop de recuperação chama-se `retry` (era `reset` em versões
 * anteriores). O `digest` é o identificador que a Vercel usa para a stack real
 * do servidor — exibimos para o usuário poder reportar e nós acharmos o log.
 */
export default function PrivateError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        level: "error",
        event: "client.render_error",
        time: new Date().toISOString(),
        digest: error.digest,
        message: error.message,
      }),
    );
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-rose-50 text-2xl">
        ⚠️
      </div>
      <div>
        <h1 className="text-xl font-semibold">Algo deu errado por aqui</h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
          Não conseguimos carregar esta tela. Seus dados estão salvos — tente
          novamente.
        </p>
      </div>

      <button
        className="min-h-12 rounded-md bg-zinc-950 px-6 font-semibold text-white"
        onClick={() => retry()}
        type="button"
      >
        Tentar novamente
      </button>

      {error.digest ? (
        <p className="text-xs text-zinc-400">
          Código do erro: <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
    </div>
  );
}
