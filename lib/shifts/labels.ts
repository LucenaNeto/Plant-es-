import type {
  PaymentStatus,
  ShiftModality,
  ShiftType,
  UnitType,
} from "@prisma/client";

/**
 * Rótulos e estilos dos enums do domínio, em um lugar só.
 *
 * Estavam espalhados entre `lib/mock-data.ts` e arrays literais dentro de
 * `features/units/unit-management.tsx`. Centralizar aqui garante que "Repasse"
 * se escreva igual na agenda, na lista e no dashboard, e que adicionar um valor
 * ao enum do Prisma quebre o build (os `Record` são exaustivos) em vez de
 * produzir um rótulo vazio em produção.
 */

export const MODALITY_LABELS: Record<ShiftModality, string> = {
  green: "Verde",
  red: "Vermelho",
  yellow: "Amarelo",
};

export const MODALITY_STYLES: Record<ShiftModality, string> = {
  green: "bg-teal-50 text-teal-700",
  red: "bg-rose-50 text-rose-700",
  yellow: "bg-amber-50 text-amber-700",
};

/** Cor sólida do marcador de dia no calendário da agenda. */
export const MODALITY_DOT: Record<ShiftModality, string> = {
  green: "bg-teal-500",
  red: "bg-rose-500",
  yellow: "bg-amber-500",
};

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  extra: "Extra",
  fixed: "Fixo",
  handoff: "Repasse",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pendente",
  predicted: "Previsto",
  received: "Recebido",
};

export const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  predicted: "bg-zinc-100 text-zinc-700",
  received: "bg-indigo-50 text-indigo-700",
};

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  clinic: "Clínica",
  hospital: "Hospital",
  maternity: "Maternidade",
  other: "Outro",
  upa: "UPA",
};

/** Ordem de exibição nos selects — a mesma em todos os formulários. */
export const MODALITY_OPTIONS = ["green", "yellow", "red"] as const;
export const SHIFT_TYPE_OPTIONS = ["fixed", "extra", "handoff"] as const;
export const PAYMENT_STATUS_OPTIONS = [
  "predicted",
  "pending",
  "received",
] as const;
export const UNIT_TYPE_OPTIONS = [
  "hospital",
  "upa",
  "clinic",
  "maternity",
  "other",
] as const;
