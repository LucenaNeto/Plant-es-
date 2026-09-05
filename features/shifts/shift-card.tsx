"use client";

import { useActionState } from "react";
import {
  deleteShiftAction,
  setPaymentStatusAction,
} from "@/app/(private)/plantoes/actions";
import { HandoffControl } from "@/features/shifts/handoff-control";
import { formatCurrency } from "@/lib/format";
import {
  MODALITY_LABELS,
  MODALITY_STYLES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
  SHIFT_TYPE_LABELS,
} from "@/lib/shifts/labels";
import type { SerializedShift } from "@/lib/shifts/serializer";

/**
 * Próximo passo natural do ciclo de recebimento. O botão de atalho avança um
 * estágio por vez (previsto → pendente → recebido) em vez de pular direto para
 * "recebido": marcar como recebido um plantão que sequer foi faturado é o tipo
 * de erro que só aparece na conciliação do fim do mês. Para ir a qualquer
 * estágio diretamente, o usuário edita o plantão.
 */
const NEXT_STATUS = {
  pending: { label: "Marcar recebido", value: "received" },
  predicted: { label: "Marcar pendente", value: "pending" },
  received: null,
} as const;

export function ShiftCard({
  onDuplicate,
  onEdit,
  shift,
}: {
  onDuplicate: (shift: SerializedShift) => void;
  onEdit: (shift: SerializedShift) => void;
  shift: SerializedShift;
}) {
  const [statusState, statusAction, isChangingStatus] = useActionState(
    setPaymentStatusAction.bind(null, shift.id),
    null,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteShiftAction.bind(null, shift.id),
    null,
  );

  const next = NEXT_STATUS[shift.paymentStatus];
  const failure =
    statusState && !statusState.ok
      ? statusState.message
      : deleteState && !deleteState.ok
        ? deleteState.message
        : null;

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{shift.unitName}</h3>
          <p className="mt-1 text-sm text-zinc-500">
            {shift.dateLabel}, {shift.startTime} - {shift.endTime} ·{" "}
            {shift.hours}h
          </p>
        </div>
        <strong className="whitespace-nowrap">
          {formatCurrency(shift.value)}
        </strong>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <span className={`rounded-md px-2.5 py-1 ${MODALITY_STYLES[shift.category]}`}>
          {MODALITY_LABELS[shift.category]}
        </span>
        <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-zinc-700">
          {SHIFT_TYPE_LABELS[shift.shiftType]}
        </span>
        {shift.isRecurring ? (
          <span className="rounded-md bg-sky-50 px-2.5 py-1 text-sky-800">
            Repetição
          </span>
        ) : null}
        {shift.isHandedOff ? null : (
          <span
            className={`rounded-md px-2.5 py-1 ${PAYMENT_STATUS_STYLES[shift.paymentStatus]}`}
          >
            {PAYMENT_STATUS_LABELS[shift.paymentStatus]}
          </span>
        )}
      </div>

      {shift.notes ? (
        <p className="mt-3 text-sm text-zinc-500">{shift.notes}</p>
      ) : null}

      <HandoffControl shift={shift} />

      {failure ? (
        <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {failure}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-medium sm:grid-cols-4">
        <button
          className="min-h-10 rounded-md border border-zinc-200 text-zinc-700"
          onClick={() => onEdit(shift)}
          type="button"
        >
          Editar
        </button>

        <button
          className="min-h-10 rounded-md border border-zinc-200 text-zinc-700"
          onClick={() => onDuplicate(shift)}
          type="button"
        >
          Duplicar
        </button>

        <form action={deleteAction}>
          <button
            className="min-h-10 w-full rounded-md border border-rose-200 text-rose-700 disabled:opacity-60"
            disabled={isDeleting}
            /*
             * `confirm` nativo é suficiente aqui e tem uma vantagem real no
             * celular: não depende de a hidratação ter terminado para impedir
             * uma exclusão acidental.
             */
            onClick={(event) => {
              if (!window.confirm(`Excluir o plantão de ${shift.dateLabel} em ${shift.unitName}?`)) {
                event.preventDefault();
              }
            }}
            type="submit"
          >
            {isDeleting ? "Excluindo..." : "Excluir"}
          </button>
        </form>

        {/*
          Plantão repassado não tem ciclo de recebimento: o dinheiro é de quem
          assumiu. Oferecer "marcar recebido" aqui convidaria a um registro que
          o resumo financeiro ignoraria de qualquer forma.
        */}
        {shift.isHandedOff ? (
          <span className="flex min-h-10 items-center justify-center rounded-md bg-violet-50 px-2 text-center text-xs font-semibold text-violet-800">
            Fora da receita
          </span>
        ) : next ? (
          <form action={statusAction}>
            <input name="paymentStatus" type="hidden" value={next.value} />
            <button
              className="min-h-10 w-full rounded-md bg-teal-600 px-2 font-semibold text-white disabled:opacity-60"
              disabled={isChangingStatus}
              type="submit"
            >
              {isChangingStatus ? "Salvando..." : next.label}
            </button>
          </form>
        ) : (
          <span className="flex min-h-10 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
            Recebido
          </span>
        )}
      </div>
    </article>
  );
}
