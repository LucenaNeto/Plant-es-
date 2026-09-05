"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { formatMonthLabel } from "@/lib/dates/calendar-date";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
} from "@/lib/shifts/labels";
import type { SerializedUnit } from "@/lib/units/serializer";

/**
 * Filtros vivem na query string, não em estado local.
 *
 * Assim o botão voltar do navegador funciona, o link de uma busca é
 * compartilhável, e a página continua sendo um Server Component que lê
 * `searchParams` — os dados são filtrados no banco, não no cliente. É também o
 * que faz o link `/plantoes?unitId=...` da tela de unidades funcionar sem
 * nenhum código extra.
 */
export function ShiftFilters({
  month,
  paymentStatus,
  unitId,
  units,
  year,
}: {
  month: number;
  paymentStatus?: string;
  unitId?: string;
  units: SerializedUnit[];
  year: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function applyParams(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    startTransition(() => {
      router.push(`/plantoes?${params.toString()}`);
    });
  }

  function shiftMonth(delta: number) {
    // `Date.UTC` normaliza a virada de ano sozinho: mês 0 vira dezembro do ano
    // anterior, mês 13 vira janeiro do seguinte.
    const moved = new Date(Date.UTC(year, month - 1 + delta, 1));

    applyParams({
      month: String(moved.getUTCMonth() + 1),
      year: String(moved.getUTCFullYear()),
    });
  }

  return (
    <section
      className={`space-y-3 rounded-lg border border-zinc-200 bg-white p-3 ${
        isPending ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          aria-label="Mês anterior"
          className="min-h-11 min-w-11 rounded-md border border-zinc-200 text-lg font-semibold text-zinc-700"
          onClick={() => shiftMonth(-1)}
          type="button"
        >
          ‹
        </button>

        <strong className="text-center text-base">
          {formatMonthLabel(year, month)}
        </strong>

        <button
          aria-label="Próximo mês"
          className="min-h-11 min-w-11 rounded-md border border-zinc-200 text-lg font-semibold text-zinc-700"
          onClick={() => shiftMonth(1)}
          type="button"
        >
          ›
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-600">
            Unidade
          </span>
          <select
            className="min-h-11 w-full rounded-md border border-zinc-200 bg-white px-3 outline-none focus:border-teal-500"
            onChange={(event) =>
              applyParams({ unitId: event.target.value || null })
            }
            value={unitId ?? ""}
          >
            <option value="">Todas as unidades</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-600">
            Pagamento
          </span>
          <select
            className="min-h-11 w-full rounded-md border border-zinc-200 bg-white px-3 outline-none focus:border-teal-500"
            onChange={(event) =>
              applyParams({ paymentStatus: event.target.value || null })
            }
            value={paymentStatus ?? ""}
          >
            <option value="">Todas as situações</option>
            {PAYMENT_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {PAYMENT_STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
