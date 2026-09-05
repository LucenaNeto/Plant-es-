"use client";

import { useActionState, useState } from "react";
import { setHandoffAction } from "@/app/(private)/plantoes/actions";
import type { SerializedShift } from "@/lib/shifts/serializer";

/**
 * Repassar uma ocorrência específica.
 *
 * O controle vive no card do plantão, e não no formulário, porque repasse é um
 * acontecimento sobre um plantão que já existe: o plantão de toda terça
 * continua sendo fixo, e numa terça você passa ele adiante. Ele não muda de
 * tipo nem deixa de pertencer à série.
 *
 * Desfazer é tão visível quanto marcar — repassar tira o valor da receita, e
 * uma ação com esse efeito precisa ter volta óbvia.
 */
export function HandoffControl({ shift }: { shift: SerializedShift }) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(
    setHandoffAction.bind(null, shift.id),
    null,
  );

  if (shift.isHandedOff) {
    return (
      <div className="mt-3 rounded-md bg-violet-50 px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-violet-900">
            Repassado a <strong>{shift.handoffTo}</strong> · fora da sua receita
          </p>
          <form action={formAction}>
            {/* Nome vazio desfaz o repasse — a mesma action, sem um caminho
                alternativo que pudesse divergir. */}
            <input name="handoffTo" type="hidden" value="" />
            <button
              className="text-sm font-medium text-violet-800 underline disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Desfazendo..." : "Desfazer"}
            </button>
          </form>
        </div>
        {state && !state.ok ? (
          <p className="mt-2 text-sm text-rose-700" role="alert">
            {state.message}
          </p>
        ) : null}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <button
        className="mt-3 text-sm font-medium text-zinc-500 underline"
        onClick={() => setIsEditing(true)}
        type="button"
      >
        Repassar este plantão
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <label className="block text-sm font-medium text-zinc-600" htmlFor={`handoff-${shift.id}`}>
        Quem vai assumir?
      </label>
      <div className="flex gap-2">
        <input
          autoFocus
          className="min-h-11 flex-1 rounded-md border border-zinc-200 px-3 text-base outline-none focus:border-teal-500"
          id={`handoff-${shift.id}`}
          name="handoffTo"
          placeholder="Nome de quem ficou com o plantão"
          required
        />
        <button
          className="min-h-11 rounded-md bg-violet-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "..." : "Repassar"}
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-zinc-500">
          O valor sai da sua receita e passa a somar em “Repassado”.
        </p>
        <button
          className="text-sm text-zinc-500 underline"
          onClick={() => setIsEditing(false)}
          type="button"
        >
          Cancelar
        </button>
      </div>
      {state && !state.ok ? (
        <p className="text-sm text-rose-700" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
