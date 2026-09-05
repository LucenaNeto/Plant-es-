"use server";

import { revalidatePath } from "next/cache";
import {
  actionFail,
  actionOk,
  type ActionResult,
} from "@/lib/action-result";
import {
  paymentStatusUpdateSchema,
  shiftPayloadSchema,
} from "@/lib/validators/shifts";
import type { SerializedShift } from "@/lib/shifts/serializer";
import {
  createShift,
  deleteShift,
  findOverlappingShifts,
  setPaymentStatus,
  updateShift,
  type ShiftServiceError,
} from "@/server/services/shifts";
import {
  runAuthenticatedAction,
  validationFailure,
} from "@/server/action-runner";

/**
 * Telas que dependem de plantão. Um plantão alterado muda a agenda, o resumo
 * financeiro e o dashboard, então todas são invalidadas juntas — revalidar
 * apenas `/plantoes` deixaria o usuário ver números velhos ao trocar de aba.
 */
const AFFECTED_PATHS = ["/plantoes", "/agenda", "/financas", "/dashboard"];

function revalidateShiftViews() {
  for (const path of AFFECTED_PATHS) {
    revalidatePath(path);
  }
}

function describeUnitError(error: ShiftServiceError) {
  if (error.reason === "unit_not_found") {
    // Mesma mensagem para "não existe" e "é de outra conta": distingui-las
    // confirmaria a existência de dados alheios a quem estivesse sondando.
    return actionFail("not_found", "Unidade não encontrada.");
  }

  if (error.reason === "unit_inactive") {
    return actionFail(
      "validation",
      `${error.unitName} está inativa. Reative a unidade para lançar plantões nela.`,
      { errors: { unitId: ["Unidade inativa."] } },
    );
  }

  return actionFail("validation", "Horário do plantão inválido.", {
    errors: { startTime: ["Use o formato HH:MM."] },
  });
}

/** "Hospital Santa Clara (20 de ago., 07:00-19:00)" */
function describeConflicts(conflicts: SerializedShift[]) {
  return conflicts
    .map(
      (shift) =>
        `${shift.unitName} (${shift.dateLabel}, ${shift.startTime}-${shift.endTime})`,
    )
    .join("; ");
}

type ShiftActionResult = ActionResult<SerializedShift>;

export async function saveShiftAction(
  shiftId: string | null,
  _previousState: ShiftActionResult | null,
  formData: FormData,
): Promise<ShiftActionResult> {
  return runAuthenticatedAction(
    shiftId ? "shift.update" : "shift.create",
    async ({ logger, userId }) => {
      const parsed = shiftPayloadSchema.safeParse(
        Object.fromEntries(formData.entries()),
      );

      if (!parsed.success) {
        return validationFailure(parsed.error.flatten().fieldErrors);
      }

      const { confirmOverlap, ...payload } = parsed.data;

      // Sobreposição é aviso, não bloqueio: o usuário é dono da própria agenda
      // e pode ter um motivo real para o conflito. Só interrompemos o primeiro
      // envio; com a confirmação, o plantão é salvo como pedido.
      if (!confirmOverlap) {
        const conflicts = await findOverlappingShifts(
          userId,
          payload,
          shiftId ?? undefined,
        );

        if (conflicts.length > 0) {
          logger.info("shift.overlap_detected", { count: conflicts.length });

          return actionFail(
            "confirmation_required",
            `Este horário se sobrepõe a: ${describeConflicts(conflicts)}. Deseja salvar mesmo assim?`,
          );
        }
      }

      const result = shiftId
        ? await updateShift(userId, shiftId, { ...payload, confirmOverlap })
        : await createShift(userId, { ...payload, confirmOverlap });

      if (result === null) {
        return actionFail("not_found", "Plantão não encontrado.");
      }

      if (!result.ok) {
        return describeUnitError(result.error);
      }

      const shift = result.shift;

      logger.info(shiftId ? "shift.updated" : "shift.created", {
        confirmedOverlap: confirmOverlap,
        shiftId: shift.id,
        unitId: shift.unitId,
      });

      revalidateShiftViews();

      return actionOk(
        shift,
        shiftId ? "Plantão atualizado." : "Plantão criado.",
      );
    },
  );
}

export async function setPaymentStatusAction(
  shiftId: string,
  _previousState: ShiftActionResult | null,
  formData: FormData,
): Promise<ShiftActionResult> {
  return runAuthenticatedAction("shift.set_payment_status", async ({
    logger,
    userId,
  }) => {
    const parsed = paymentStatusUpdateSchema.safeParse({
      paymentStatus: formData.get("paymentStatus"),
    });

    if (!parsed.success) {
      return validationFailure(parsed.error.flatten().fieldErrors);
    }

    const shift = await setPaymentStatus(
      userId,
      shiftId,
      parsed.data.paymentStatus,
    );

    if (!shift) {
      return actionFail("not_found", "Plantão não encontrado.");
    }

    logger.info("shift.payment_status_changed", {
      paymentStatus: shift.paymentStatus,
      shiftId: shift.id,
    });

    revalidateShiftViews();

    return actionOk(shift, "Situação do pagamento atualizada.");
  });
}

export async function deleteShiftAction(
  shiftId: string,
  _previousState: ActionResult<{ id: string }> | null,
): Promise<ActionResult<{ id: string }>> {
  return runAuthenticatedAction("shift.delete", async ({ logger, userId }) => {
    const deleted = await deleteShift(userId, shiftId);

    if (!deleted) {
      return actionFail("not_found", "Plantão não encontrado.");
    }

    logger.info("shift.deleted", { shiftId });

    revalidateShiftViews();

    return actionOk(deleted, "Plantão excluído.");
  });
}
