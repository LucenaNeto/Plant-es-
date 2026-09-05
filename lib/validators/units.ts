import { z } from "zod";
import { shiftModalitySchema, unitTypeSchema } from "@/lib/validators/common";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .optional();

const optionalNumber = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    return value;
  },
  z.coerce.number().positive("Informe um valor maior que zero.").nullable(),
);

const optionalModality = z.preprocess(
  (value) => (value === "" ? null : value),
  shiftModalitySchema.nullable(),
);

const booleanFromForm = z.preprocess(
  (value) => value === true || value === "true" || value === "on",
  z.boolean(),
);

const optionalBooleanFromForm = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    return value === true || value === "true" || value === "on";
  },
  z.boolean().optional(),
);

export const unitPayloadSchema = z.object({
  active: optionalBooleanFromForm,
  city: z.string().trim().min(2, "Informe a cidade."),
  contactName: optionalText,
  contactPhone: optionalText,
  defaultCategory: optionalModality,
  defaultShiftHours: optionalNumber,
  defaultShiftValue: optionalNumber,
  isFixed: booleanFromForm.default(false),
  name: z.string().trim().min(2, "Informe o nome da unidade."),
  notes: optionalText,
  type: unitTypeSchema,
});

/**
 * Schema de atualização parcial.
 *
 * O handler de PATCH usava o schema de criação, o que produzia dois problemas:
 * exigia o payload completo (contrariando a semântica de PATCH) e, como
 * `active` era lido com `?? true`, um PATCH sem esse campo **reativava
 * silenciosamente** uma unidade que o usuário havia inativado.
 *
 * Com o schema parcial, campo ausente significa "não mexer".
 */
export const unitUpdateSchema = unitPayloadSchema.partial().extend({
  // `.partial()` torna o campo opcional mas NAO remove o `.default(false)` de
  // `isFixed`: ausente do payload, o Zod ainda entrega `false`. O servico veria
  // um valor definido e gravaria, desmarcando "unidade fixa" em qualquer PATCH
  // que nao mencionasse o campo -- exatamente o bug que este schema corrige
  // para `active`. Trocamos pelo preprocessador que preserva `undefined`.
  isFixed: optionalBooleanFromForm,
});

export type UnitPayload = z.infer<typeof unitPayloadSchema>;
export type UnitUpdatePayload = z.infer<typeof unitUpdateSchema>;
