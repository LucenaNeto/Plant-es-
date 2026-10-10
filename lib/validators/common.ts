import { z } from "zod";
import { isCalendarDate } from "@/lib/dates/calendar-date";

/**
 * Data de calendário "YYYY-MM-DD" que existe de verdade.
 *
 * O formato sozinho não basta: "2026-02-29" e "2026-04-31" passam no regex, e
 * o `Date` do JavaScript transborda em silêncio para o dia seguinte. Barrar
 * aqui faz o usuário ver "Informe uma data que existe no calendário" no campo,
 * em vez de um erro genérico vindo lá do serviço.
 */
export function calendarDateSchema(mensagemDeFormato: string) {
  return z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, mensagemDeFormato)
    .refine(isCalendarDate, "Informe uma data que existe no calendário.");
}

export const paymentStatusSchema = z.enum(["predicted", "pending", "received"]);
export const shiftModalitySchema = z.enum(["green", "yellow", "red"]);
export const shiftTypeSchema = z.enum(["fixed", "extra", "handoff"]);
export const unitTypeSchema = z.enum([
  "hospital",
  "upa",
  "clinic",
  "maternity",
  "other",
]);

export const expenseCategorySchema = z.enum([
  "fuel",
  "food",
  "transport",
  "parking",
  "lodging",
  "other",
]);
