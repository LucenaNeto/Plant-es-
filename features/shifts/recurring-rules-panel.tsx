"use client";

import { useActionState } from "react";
import {
  cancelRuleFutureAction,
  deactivateRuleAction,
  extendRuleAction,
} from "@/app/(private)/plantoes/actions";
import { formatCurrency } from "@/lib/format";
import type { SerializedRule } from "@/server/services/recurring-rules";

/**
 * Regras de repetição ativas.
 *
 * As três ações são deliberadamente distintas, porque são intenções
 * diferentes que um botão só confundiria:
 *
 * - **Estender** cria os plantões que faltam até o horizonte de 3 meses.
 * - **Parar de repetir** desativa a regra e deixa tudo que já foi lançado.
 * - **Cancelar futuros** remove os plantões que ainda não aconteceram.
 *
 * Nenhuma delas toca plantão passado: pode já ter sido trabalhado e pago.
 */
function RuleCard({ rule }: { rule: SerializedRule }) {
  const [extendState, extendAction, isExtending] = useActionState(
    extendRuleAction.bind(null, rule.id),
    null,
  );
  const [stopState, stopAction, isStopping] = useActionState(
    deactivateRuleAction.bind(null, rule.id),
    null,
  );
  const [cancelState, cancelAction, isCancelling] = useActionState(
    cancelRuleFutureAction.bind(null, rule.id),
    null,
  );

  const feedback = [extendState, stopState, cancelState].find(Boolean);

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{rule.unitName}</h3>
          <p className="mt-1 text-sm text-zinc-500">
            <span className="capitalize">{rule.weekdaysLabel}</span> ·{" "}
            {rule.startTime}–{rule.endTime}
          </p>
        </div>
        <strong className="whitespace-nowrap text-sm">
          {formatCurrency(rule.defaultValue)}
        </strong>
      </div>

      <p className="mt-2 text-sm text-zinc-500">
        {rule.generatedThrough
          ? `${rule.generatedCount} plantões criados, até ${rule.generatedThrough}`
          : "Nenhum plantão criado ainda"}
      </p>

      {feedback ? (
        <p
          className={`mt-3 rounded-md px-3 py-2 text-sm ${
            feedback.ok
              ? "bg-teal-50 text-teal-700"
              : "bg-rose-50 text-rose-700"
          }`}
          role="status"
        >
          {feedback.ok ? feedback.message : feedback.message}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-3 gap-2 text-sm font-medium">
        <form action={extendAction}>
          <button
            className="min-h-10 w-full rounded-md border border-zinc-200 text-zinc-700 disabled:opacity-60"
            disabled={isExtending}
            type="submit"
          >
            {isExtending ? "..." : "Estender"}
          </button>
        </form>

        <form action={stopAction}>
          <button
            className="min-h-10 w-full rounded-md border border-zinc-200 px-1 text-xs text-zinc-700 disabled:opacity-60"
            disabled={isStopping}
            type="submit"
          >
            {isStopping ? "..." : "Parar de repetir"}
          </button>
        </form>

        <form action={cancelAction}>
          <button
            className="min-h-10 w-full rounded-md border border-rose-200 px-1 text-xs text-rose-700 disabled:opacity-60"
            disabled={isCancelling}
            onClick={(event) => {
              if (
                !window.confirm(
                  `Remover os plantões futuros de ${rule.unitName}? Os já passados são mantidos.`,
                )
              ) {
                event.preventDefault();
              }
            }}
            type="submit"
          >
            {isCancelling ? "..." : "Cancelar futuros"}
          </button>
        </form>
      </div>
    </article>
  );
}

export function RecurringRulesPanel({ rules }: { rules: SerializedRule[] }) {
  const ativas = rules.filter((rule) => rule.active);

  if (ativas.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Repetições ativas</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Cada plantão criado por uma repetição é um plantão normal — editar ou
          excluir um deles não afeta os outros.
        </p>
      </div>

      {ativas.map((rule) => (
        <RuleCard key={rule.id} rule={rule} />
      ))}
    </section>
  );
}
