import { z } from "zod";
import { expenseCategorySchema } from "@/lib/validators/common";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Id vindo de um `<select>`: string vazia significa "não vinculado". */
const optionalId = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.string().trim().min(1).optional(),
);

const amountSchema = z.coerce
  .number({ error: "Informe o valor do gasto." })
  .positive("O valor precisa ser maior que zero.")
  .max(1_000_000, "Valor acima do limite aceito.");

export const expensePayloadSchema = z
  .object({
    amount: amountSchema,
    category: expenseCategorySchema,
    description: z.string().trim().min(2, "Descreva o gasto."),
    expenseDate: z.string().trim().regex(ISO_DATE, "Informe a data do gasto."),
    /**
     * Como o gasto se relaciona com o trabalho. Um campo explícito, em vez de
     * inferir pela presença de `unitId`/`shiftId`, torna impossível o estado
     * ambíguo em que os dois vêm preenchidos e ninguém sabe qual vale.
     */
    linkType: z.enum(["general", "unit", "shift"]).default("general"),
    shiftId: optionalId,
    unitId: optionalId,
  })
  .superRefine((data, ctx) => {
    if (data.linkType === "unit" && !data.unitId) {
      ctx.addIssue({
        code: "custom",
        message: "Selecione a unidade.",
        path: ["unitId"],
      });
    }

    if (data.linkType === "shift" && !data.shiftId) {
      ctx.addIssue({
        code: "custom",
        message: "Selecione o plantão.",
        path: ["shiftId"],
      });
    }
  });

export type ExpensePayload = z.infer<typeof expensePayloadSchema>;

export const expenseFiltersSchema = z.object({
  category: expenseCategorySchema.optional(),
  month: z.coerce.number().int().min(1).max(12),
  unitId: z.string().trim().min(1).optional(),
  year: z.coerce.number().int().min(2000).max(2100),
});

export type ExpenseFilters = z.infer<typeof expenseFiltersSchema>;
