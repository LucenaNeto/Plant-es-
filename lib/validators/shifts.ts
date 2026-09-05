import { z } from "zod";
import {
  paymentStatusSchema,
  shiftModalitySchema,
  shiftTypeSchema,
} from "@/lib/validators/common";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_OF_DAY = /^([01]\d|2[0-3]):([0-5]\d)$/;

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .optional();

const timeSchema = z
  .string()
  .trim()
  .regex(TIME_OF_DAY, "Use o formato HH:MM.");

/**
 * Booleano vindo de `FormData`. Checkbox não marcado simplesmente não é
 * enviado, então ausência precisa significar `false` — nunca erro.
 */
const checkbox = z.preprocess(
  (value) => value === true || value === "true" || value === "on",
  z.boolean(),
);

/**
 * Valor monetário vindo de `<input type="number">`, que chega como string.
 *
 * Zero é aceito de propósito: um plantão de repasse pode ser coberto sem
 * remuneração, e recusar o lançamento obrigaria o usuário a mentir o valor.
 */
const moneySchema = z.coerce
  .number({ error: "Informe o valor do plantão." })
  .nonnegative("O valor não pode ser negativo.")
  .max(1_000_000, "Valor acima do limite aceito.");

export const shiftPayloadSchema = z.object({
  category: shiftModalitySchema,
  /**
   * Confirmação de que o usuário viu o aviso de sobreposição e quer salvar
   * assim mesmo. Não é um campo do plantão — é o segundo passo do fluxo de
   * confirmação, e por isso é removido antes de chegar ao serviço.
   */
  confirmOverlap: checkbox.default(false),
  endTime: timeSchema,
  notes: optionalText,
  paymentStatus: paymentStatusSchema.default("predicted"),
  shiftDate: z.string().trim().regex(ISO_DATE, "Informe a data do plantão."),
  shiftType: shiftTypeSchema,
  startTime: timeSchema,
  unitId: z.string().trim().min(1, "Selecione a unidade."),
  value: moneySchema,
});

export const paymentStatusUpdateSchema = z.object({
  paymentStatus: paymentStatusSchema,
});

export type ShiftPayload = z.infer<typeof shiftPayloadSchema>;

/** Filtros da listagem, lidos da query string da página. */
export const shiftFiltersSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  paymentStatus: paymentStatusSchema.optional(),
  unitId: z.string().trim().min(1).optional(),
  year: z.coerce.number().int().min(2000).max(2100),
});

export type ShiftFilters = z.infer<typeof shiftFiltersSchema>;
