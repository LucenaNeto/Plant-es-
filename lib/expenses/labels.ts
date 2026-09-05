import type { ExpenseCategory } from "@prisma/client";

/**
 * Rótulos e estilos das categorias de gasto. Mesmo padrão de
 * `lib/shifts/labels.ts`: `Record` exaustivo, para que um valor novo no enum do
 * Prisma quebre o build em vez de virar rótulo vazio em produção.
 */

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: "Alimentação",
  fuel: "Combustível",
  lodging: "Hospedagem",
  other: "Outros",
  parking: "Estacionamento",
  transport: "Transporte",
};

export const EXPENSE_CATEGORY_STYLES: Record<ExpenseCategory, string> = {
  food: "bg-orange-50 text-orange-700",
  fuel: "bg-sky-50 text-sky-700",
  lodging: "bg-violet-50 text-violet-700",
  other: "bg-zinc-100 text-zinc-700",
  parking: "bg-lime-50 text-lime-700",
  transport: "bg-cyan-50 text-cyan-700",
};

/** Ordem de exibição, da categoria mais frequente para a menos. */
export const EXPENSE_CATEGORY_OPTIONS = [
  "fuel",
  "food",
  "parking",
  "transport",
  "lodging",
  "other",
] as const;

/** Como o gasto se relaciona com o trabalho — dirige o formulário e o filtro. */
export const EXPENSE_LINK_LABELS = {
  general: "Gasto geral do mês",
  shift: "Vinculado a um plantão",
  unit: "Vinculado a uma unidade",
} as const;

export type ExpenseLinkType = keyof typeof EXPENSE_LINK_LABELS;

export const EXPENSE_LINK_OPTIONS = [
  "general",
  "unit",
  "shift",
] as const satisfies readonly ExpenseLinkType[];
