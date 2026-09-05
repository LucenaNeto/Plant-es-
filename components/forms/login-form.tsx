"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { DEFAULT_PRIVATE_REDIRECT } from "@/lib/routes";

/**
 * Aceita apenas caminhos internos como destino pós-login. Sem isto,
 * `?callbackUrl=https://site-falso/` faria o app redirecionar o usuário
 * recém-autenticado para fora — open redirect, usado em phishing.
 *
 * Não basta rejeitar `//`. Pela especificação WHATWG, a barra invertida é
 * equivalente à barra em esquemas especiais, então `/\evil.com` resolve para
 * `https://evil.com/` — e navegadores ainda descartam tab, CR e LF ao
 * interpretar a URL, de modo que `/<tab>/evil.com` vira `//evil.com`.
 *
 * Por isso: limpar os caracteres descartáveis primeiro e então exigir que a
 * string comece com uma barra seguida de algo que não seja barra nem
 * contrabarra. Sobram apenas caminhos genuinamente relativos à raiz.
 */
function safeCallbackUrl(value: string | null) {
  if (!value) {
    return DEFAULT_PRIVATE_REDIRECT;
  }

  const cleaned = value.replace(/[\t\r\n]/g, "");

  return /^\/[^/\\]/.test(cleaned) ? cleaned : DEFAULT_PRIVATE_REDIRECT;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        redirect: false,
      });

      if (result?.error) {
        setError("E-mail ou senha inválidos.");
        return;
      }

      router.push(safeCallbackUrl(searchParams.get("callbackUrl")));
      router.refresh();
    });
  }

  return (
    <form
      className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
      onSubmit={handleSubmit}
    >
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-zinc-600">E-mail</span>
        <input
          autoComplete="email"
          className="min-h-12 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-teal-500"
          name="email"
          placeholder="voce@email.com"
          required
          type="email"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-zinc-600">Senha</span>
        <input
          autoComplete="current-password"
          className="min-h-12 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-teal-500"
          name="password"
          placeholder="Sua senha"
          required
          type="password"
        />
      </label>
      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}
      <button
        className="min-h-12 w-full rounded-md bg-zinc-950 px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
