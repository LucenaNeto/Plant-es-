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
