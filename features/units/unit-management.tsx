"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import type { SerializedUnit } from "@/lib/units/serializer";
import { formatCurrency } from "@/lib/format";

type FieldErrors = Record<string, string[] | undefined>;

const unitTypes = [
  ["hospital", "Hospital"],
  ["upa", "UPA"],
  ["clinic", "Clínica"],
  ["maternity", "Maternidade"],
  ["other", "Outro"],
];

const modalities = [
  ["", "Sem padrão"],
  ["green", "Verde"],
  ["yellow", "Amarelo"],
  ["red", "Vermelho"],
];

const typeLabels = Object.fromEntries(unitTypes);
const modalityLabels = Object.fromEntries(modalities);

function formDataToPayload(formData: FormData) {
  return {
    active: formData.get("active") ?? undefined,
    city: formData.get("city"),
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    defaultCategory: formData.get("defaultCategory"),
    defaultShiftHours: formData.get("defaultShiftHours"),
    defaultShiftValue: formData.get("defaultShiftValue"),
    isFixed: formData.get("isFixed") ?? false,
    name: formData.get("name"),
    notes: formData.get("notes"),
    type: formData.get("type"),
  };
}

function UnitForm({
  errors,
  isPending,
  onCancel,
  onSubmit,
  unit,
}: {
  errors: FieldErrors;
  isPending: boolean;
  onCancel?: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  unit?: SerializedUnit;
}) {
  return (
    <form
      className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
      onSubmit={onSubmit}
    >
      {unit ? (
        <input name="active" type="hidden" value={String(unit.active)} />
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-zinc-600">Nome da unidade</span>
        <input
          className="min-h-12 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-teal-500"
          defaultValue={unit?.name}
          name="name"
          required
        />
        {errors.name?.map((error) => (
          <span className="mt-1 block text-sm text-rose-700" key={error}>
            {error}
          </span>
        ))}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-600">Tipo</span>
          <select
            className="min-h-12 w-full rounded-md border border-zinc-200 bg-white px-3 outline-none focus:border-teal-500"
            defaultValue={unit?.type ?? "hospital"}
            name="type"
          >
            {unitTypes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-600">Cidade</span>
          <input
            className="min-h-12 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-teal-500"
            defaultValue={unit?.city}
            name="city"
            required
          />
          {errors.city?.map((error) => (
            <span className="mt-1 block text-sm text-rose-700" key={error}>
              {error}
            </span>
          ))}
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-600">Responsável</span>
          <input
            className="min-h-12 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-teal-500"
            defaultValue={unit?.contactName ?? ""}
            name="contactName"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-600">Telefone/contato</span>
          <input
            className="min-h-12 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-teal-500"
            defaultValue={unit?.contactPhone ?? ""}
            name="contactPhone"
            type="tel"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-600">Valor padrão</span>
          <input
            className="min-h-12 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-teal-500"
            defaultValue={unit?.defaultShiftValue ?? ""}
            min="0"
            name="defaultShiftValue"
            step="0.01"
            type="number"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-600">Carga padrão</span>
          <input
            className="min-h-12 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-teal-500"
            defaultValue={unit?.defaultShiftHours ?? ""}
            min="0"
            name="defaultShiftHours"
            step="0.5"
            type="number"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-600">Modalidade</span>
          <select
            className="min-h-12 w-full rounded-md border border-zinc-200 bg-white px-3 outline-none focus:border-teal-500"
            defaultValue={unit?.defaultCategory ?? ""}
            name="defaultCategory"
          >
            {modalities.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex min-h-12 items-center gap-3 rounded-md border border-zinc-200 px-3">
        <input
          className="h-5 w-5 accent-teal-600"
          defaultChecked={unit?.isFixed ?? false}
          name="isFixed"
          type="checkbox"
        />
        <span className="text-sm font-medium text-zinc-700">Unidade fixa</span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-zinc-600">Observações</span>
        <textarea
          className="min-h-24 w-full rounded-md border border-zinc-200 px-3 py-3 outline-none focus:border-teal-500"
          defaultValue={unit?.notes ?? ""}
          name="notes"
        />
      </label>

      <div className="grid gap-2 sm:flex sm:justify-end">
        {onCancel ? (
          <button
            className="min-h-11 rounded-md border border-zinc-200 px-4 font-semibold text-zinc-700"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
        ) : null}
        <button
          className="min-h-11 rounded-md bg-zinc-950 px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isPending}
        >
          {isPending ? "Salvando..." : unit ? "Salvar unidade" : "Criar unidade"}
        </button>
      </div>
    </form>
  );
}

export function UnitManagement({ initialUnits }: { initialUnits: SerializedUnit[] }) {
  const router = useRouter();
  const [units, setUnits] = useState(initialUnits);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setMessage("");

    const form = event.currentTarget;
    const payload = formDataToPayload(new FormData(form));

    startTransition(async () => {
      const response = await fetch("/api/units", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrors(data.errors ?? {});
        setMessage(data.message ?? "Não foi possível criar a unidade.");
        return;
      }

      setUnits((currentUnits) => [data.unit, ...currentUnits]);
      form.reset();
      setMessage("Unidade criada.");
      router.refresh();
    });
  }

  function handleUpdate(event: FormEvent<HTMLFormElement>, unitId: string) {
    event.preventDefault();
    setErrors({});
    setMessage("");

    const payload = formDataToPayload(new FormData(event.currentTarget));

    startTransition(async () => {
      const response = await fetch(`/api/units/${unitId}`, {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrors(data.errors ?? {});
        setMessage(data.message ?? "Não foi possível salvar a unidade.");
        return;
      }

      setUnits((currentUnits) =>
        currentUnits.map((unit) => (unit.id === unitId ? data.unit : unit)),
      );
      setEditingId(null);
      setMessage("Unidade atualizada.");
      router.refresh();
    });
  }

  function handleInactivate(unitId: string) {
    const confirmed = window.confirm("Inativar esta unidade?");

    if (!confirmed) {
      return;
    }

    setErrors({});
    setMessage("");

    startTransition(async () => {
      const response = await fetch(`/api/units/${unitId}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.message ?? "Não foi possível inativar a unidade.");
        return;
      }

      setUnits((currentUnits) =>
        currentUnits.map((unit) => (unit.id === unitId ? data.unit : unit)),
      );
      setMessage("Unidade inativada.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <UnitForm errors={errors} isPending={isPending} onSubmit={handleCreate} />

      {message ? (
        <p className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-700">
          {message}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Unidades cadastradas</h2>

        {units.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
            Nenhuma unidade cadastrada ainda.
          </div>
        ) : null}

        {units.map((unit) => (
          <article className="rounded-lg border border-zinc-200 bg-white p-4" key={unit.id}>
            {editingId === unit.id ? (
              <UnitForm
                errors={errors}
                isPending={isPending}
                onCancel={() => setEditingId(null)}
                onSubmit={(event) => handleUpdate(event, unit.id)}
                unit={unit}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{unit.name}</h3>
                    <p className="text-sm text-zinc-500">
                      {typeLabels[unit.type]} em {unit.city}
                    </p>
                  </div>
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                      unit.active
                        ? "bg-teal-50 text-teal-700"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {unit.active ? "Ativa" : "Inativa"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-zinc-500">Valor padrão</p>
                    <strong>
                      {unit.defaultShiftValue
                        ? formatCurrency(unit.defaultShiftValue)
                        : "Não definido"}
                    </strong>
                  </div>
                  <div>
                    <p className="text-zinc-500">Carga horária</p>
                    <strong>
                      {unit.defaultShiftHours ? `${unit.defaultShiftHours}h` : "Não definida"}
                    </strong>
                  </div>
                  <div>
                    <p className="text-zinc-500">Modalidade</p>
                    <strong>{modalityLabels[unit.defaultCategory ?? ""]}</strong>
                  </div>
                  <div>
                    <p className="text-zinc-500">Vínculo</p>
                    <strong>{unit.isFixed ? "Fixa" : "Variável"}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm font-medium">
                  <button
                    className="min-h-10 rounded-md border border-zinc-200 text-zinc-700"
                    onClick={() => setEditingId(unit.id)}
                    type="button"
                  >
                    Editar
                  </button>
                  <a
                    className="flex min-h-10 items-center justify-center rounded-md border border-zinc-200 text-zinc-700"
                    href={`/plantoes?unitId=${unit.id}`}
                  >
                    Plantões
                  </a>
                  <button
                    className="min-h-10 rounded-md bg-zinc-950 text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!unit.active || isPending}
                    onClick={() => handleInactivate(unit.id)}
                    type="button"
                  >
                    Inativar
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
