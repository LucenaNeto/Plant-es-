"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

type FieldErrors = Record<string, string[] | undefined>;

const fields = [
  ["name", "Nome", "text", "name"],
  ["email", "E-mail", "email", "email"],
  ["password", "Senha", "password", "new-password"],
  ["confirmPassword", "Confirmar senha", "password", "new-password"],
  ["profession", "Profissão", "text", "organization-title"],
  ["specialty", "Especialização", "text", "off"],
];

export function RegisterForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    startTransition(async () => {
      const response = await fetch("/api/auth/register", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrors(data.errors ?? {});
        setMessage(data.message ?? "Não foi possível criar a conta.");
        return;
      }

      const result = await signIn("credentials", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        redirect: false,
      });

      if (result?.error) {
        router.push("/login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form
      className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
      onSubmit={handleSubmit}
    >
      {fields.map(([name, label, type, autoComplete]) => (
        <label className="block" key={name}>
          <span className="mb-1.5 block text-sm font-medium text-zinc-600">{label}</span>
          <input
            autoComplete={autoComplete}
            className="min-h-12 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-teal-500"
            name={name}
            required={name !== "specialty"}
            type={type}
          />
          {errors[name]?.map((error) => (
            <span className="mt-1 block text-sm text-rose-700" key={error}>
              {error}
            </span>
          ))}
        </label>
      ))}

      {message ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {message}
        </p>
      ) : null}

      <button
        className="min-h-12 w-full rounded-md bg-zinc-950 px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
      >
        {isPending ? "Criando..." : "Criar conta"}
      </button>
    </form>
  );
}
