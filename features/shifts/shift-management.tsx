"use client";

import { useCallback, useState } from "react";
import { DuplicatePanel } from "@/features/shifts/duplicate-panel";
import { ShiftCard } from "@/features/shifts/shift-card";
import { ShiftForm } from "@/features/shifts/shift-form";
import type { SerializedShift } from "@/lib/shifts/serializer";
import type { SerializedUnit } from "@/lib/units/serializer";

/**
 * Orquestra qual formulário está aberto. Os dados em si não vivem aqui: a
 * lista vem do Server Component e as actions chamam `revalidatePath`, então a
 * página se atualiza sozinha após cada mutação. Guardar uma cópia dos plantões
 * em estado local só criaria uma segunda fonte de verdade para divergir.
 */
type FormMode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; shift: SerializedShift }
  /**
   * Duplicar deixou de abrir o formulário preenchido e passou a abrir um painel
   * de replicação em lote. Copiar um plantão para um único dia continua
   * possível pelo botão "Novo plantão"; o que faltava era preencher o mês.
   */
  | { kind: "duplicate"; shift: SerializedShift };

export function ShiftManagement({
  shifts,
  units,
}: {
  shifts: SerializedShift[];
  units: SerializedUnit[];
}) {
  const [mode, setMode] = useState<FormMode>({ kind: "closed" });

  const close = useCallback(() => setMode({ kind: "closed" }), []);

  const hasActiveUnit = units.some((unit) => unit.active);

  return (
    <div className="space-y-4">
      {mode.kind === "closed" ? (
        <button
          className="min-h-12 w-full rounded-md bg-zinc-950 px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!hasActiveUnit}
          onClick={() => setMode({ kind: "create" })}
          type="button"
        >
          Novo plantão
        </button>
      ) : mode.kind === "duplicate" ? (
        <DuplicatePanel
          key={`duplicate-${mode.shift.id}`}
          onClose={close}
          shift={mode.shift}
        />
      ) : (
        <ShiftForm
          key={mode.kind === "edit" ? `edit-${mode.shift.id}` : "create"}
          onCancel={close}
          onSaved={close}
          shift={mode.kind === "edit" ? mode.shift : undefined}
          shiftId={mode.kind === "edit" ? mode.shift.id : null}
          units={units}
        />
      )}

      {!hasActiveUnit ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Você ainda não tem uma unidade ativa. Cadastre uma em{" "}
          <a className="font-semibold underline" href="/unidades">
            Unidades
          </a>{" "}
          para começar a lançar plantões.
        </p>
      ) : null}

      {shifts.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center">
          <p className="font-medium">Nenhum plantão neste período</p>
          <p className="mt-1 text-sm text-zinc-500">
            Ajuste os filtros acima ou lance um plantão novo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              onDuplicate={(selected) =>
                setMode({ kind: "duplicate", shift: selected })
              }
              onEdit={(selected) => setMode({ kind: "edit", shift: selected })}
              shift={shift}
            />
          ))}
        </div>
      )}
    </div>
  );
}
