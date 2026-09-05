"use server";

import { revalidatePath } from "next/cache";
import { actionFail, actionOk, type ActionResult } from "@/lib/action-result";
import { expensePayloadSchema } from "@/lib/validators/expenses";
import type { SerializedExpense } from "@/lib/expenses/serializer";
import {
  createExpense,
  deleteExpense,
  updateExpense,
  type ExpenseServiceError,
} from "@/server/services/expenses";
import {
  runAuthenticatedAction,
  validationFailure,
} from "@/server/action-runner";

/** Gasto altera o líquido do mês, então finanças e dashboard também mudam. */
const AFFECTED_PATHS = ["/gastos", "/financas", "/dashboard"];

function revalidateExpenseViews() {
  for (const path of AFFECTED_PATHS) {
    revalidatePath(path);
  }
}

function describeLinkError(error: ExpenseServiceError) {
  // "não existe" e "é de outra conta" produzem a mesma resposta: distingui-las
  // confirmaria a existência de dados alheios a quem estivesse sondando.
  if (error.reason === "shift_not_found") {
    return actionFail("not_found", "Plantão não encontrado.", {
      errors: { shiftId: ["Selecione um plantão válido."] },
    });
  }

  return actionFail("not_found", "Unidade não encontrada.", {
    errors: { unitId: ["Selecione uma unidade válida."] },
  });
}

type ExpenseActionResult = ActionResult<SerializedExpense>;

export async function saveExpenseAction(
  expenseId: string | null,
  _previousState: ExpenseActionResult | null,
  formData: FormData,
): Promise<ExpenseActionResult> {
  return runAuthenticatedAction(
    expenseId ? "expense.update" : "expense.create",
    async ({ logger, userId }) => {
      const parsed = expensePayloadSchema.safeParse(
        Object.fromEntries(formData.entries()),
      );

      if (!parsed.success) {
        return validationFailure(parsed.error.flatten().fieldErrors);
      }

      const result = expenseId
        ? await updateExpense(userId, expenseId, parsed.data)
        : await createExpense(userId, parsed.data);

      if (result === null) {
        return actionFail("not_found", "Gasto não encontrado.");
      }

      if (!result.ok) {
        return describeLinkError(result.error);
      }

      logger.info(expenseId ? "expense.updated" : "expense.created", {
        category: result.expense.category,
        expenseId: result.expense.id,
        linkType: result.expense.linkType,
      });

      revalidateExpenseViews();

      return actionOk(
        result.expense,
        expenseId ? "Gasto atualizado." : "Gasto lançado.",
      );
    },
  );
}

export async function deleteExpenseAction(
  expenseId: string,
  _previousState: ActionResult<{ id: string }> | null,
): Promise<ActionResult<{ id: string }>> {
  return runAuthenticatedAction("expense.delete", async ({ logger, userId }) => {
    const deleted = await deleteExpense(userId, expenseId);

    if (!deleted) {
      return actionFail("not_found", "Gasto não encontrado.");
    }

    logger.info("expense.deleted", { expenseId });

    revalidateExpenseViews();

    return actionOk(deleted, "Gasto excluído.");
  });
}
