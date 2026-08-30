"use client";

import { FormEvent, useState, useTransition } from "react";

type ProfileFormUser = {
  city: string | null;
  email: string;
  name: string;
  phone: string | null;
  profession: string;
  specialty: string | null;
};

type FieldErrors = Record<string, string[] | undefined>;

const profileFields = [
  ["name", "Nome", "text"],
  ["phone", "Telefone", "tel"],
  ["profession", "Profissão", "text"],
  ["specialty", "Especialização", "text"],
  ["city", "Cidade", "text"],
];

export function ProfileForm({ user }: { user: ProfileFormUser }) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setMessage("");
    setIsSuccess(false);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    startTransition(async () => {
      const response = await fetch("/api/users/me", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrors(data.errors ?? {});
        setMessage(data.message ?? "Não foi possível salvar o perfil.");
        return;
      }

      setIsSuccess(true);
      setMessage("Perfil atualizado.");
    });
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-zinc-600">E-mail</span>
        <input
          className="min-h-12 w-full rounded-md border border-zinc-200 bg-stone-100 px-3 text-base text-zinc-500"
          defaultValue={user.email}
          disabled
          type="email"
        />
      </label>

      {profileFields.map(([name, label, type]) => (
        <label className="block" key={name}>
          <span className="mb-1.5 block text-sm font-medium text-zinc-600">{label}</span>
          <input
            className="min-h-12 w-full rounded-md border border-zinc-200 bg-white px-3 text-base outline-none focus:border-teal-500"
            defaultValue={String(user[name as keyof ProfileFormUser] ?? "")}
            name={name}
            required={name === "name" || name === "profession"}
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
        <p
          className={`rounded-md px-3 py-2 text-sm ${
            isSuccess ? "bg-teal-50 text-teal-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {message}
        </p>
      ) : null}

      <button
        className="min-h-12 w-full rounded-md bg-zinc-950 px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
      >
        {isPending ? "Salvando..." : "Salvar perfil"}
      </button>
    </form>
  );
}
