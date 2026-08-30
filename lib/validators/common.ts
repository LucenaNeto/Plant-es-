import { z } from "zod";

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
