"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Limite de erro do grupo privado.
 *
 * **Toda tela de erro precisa de saída.** A primeira versão oferecia só
 * "Tentar novamente" — e quando a causa persiste, tentar de novo falha de novo
 * e o usuário fica preso, sem navegação e sem caminho. Agora há três saídas:
 * repetir, voltar à tela anterior e ir para o início.
 *
 * No Next 16 a prop de recuperação chama-se `retry` (era `reset` antes). O
 * `digest` é o identificador que liga esta tela à stack real no servidor — por
 * isso ele é copiável, e não só exibido: pedir para alguém transcrever dez
 * dígitos à mão é como se perdem os relatos de erro.
 */
export default function PrivateError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const router = useRouter();
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    console.error(
      JSON.stringify({
        level: "error",
        event: "client.render_error",
        time: new Date().toISOString(),
        digest: error.digest,
        message: error.message,
        path: window.location.pathname,
      }),
    );
  }, [error]);

  async function copiarCodigo() {
    if (!error.digest) {
      return;
    }

    try {
      await navigator.clipboard.writeText(error.digest);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard bloqueado (contexto inseguro, permissão negada). O código
      // continua visível na tela para leitura — falhar em copiar não pode
      // derrubar a própria tela de erro.
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-rose-50 text-2xl">
        ⚠️
      </div>

      <div>
        <h1 className="text-xl font-semibold">Algo deu errado por aqui</h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
          Não conseguimos carregar esta tela. Seus dados estão salvos.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <button
          className="min-h-12 rounded-md bg-zinc-950 px-6 font-semibold text-white"
          onClick={() => retry()}
          type="button"
        >
          Tentar novamente
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            className="min-h-11 rounded-md border border-zinc-200 text-sm font-medium text-zinc-700"
            onClick={() => router.back()}
            type="button"
          >
            Voltar
          </button>
          <Link
            className="flex min-h-11 items-center justify-center rounded-md border border-zinc-200 text-sm font-medium text-zinc-700"
            href="/dashboard"
          >
            Ir para o início
          </Link>
        </div>
      </div>

      {error.digest ? (
        <button
          className="text-xs text-zinc-400 underline"
          onClick={copiarCodigo}
          type="button"
        >
          {copiado
            ? "Código copiado"
            : `Copiar código do erro: ${error.digest}`}
        </button>
      ) : null}
    </div>
  );
}
