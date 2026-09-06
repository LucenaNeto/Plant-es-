"use server";

import { revalidatePath } from "next/cache";
import {
  actionFail,
  actionOk,
  type ActionResult,
} from "@/lib/action-result";
import {
  duplicationSchema,
  handoffSchema,
  paymentStatusUpdateSchema,
  recurrenceSchema,
  shiftPayloadSchema,
} from "@/lib/validators/shifts";
import type { SerializedShift } from "@/lib/shifts/serializer";
import {
  createShift,
  deleteShift,
  duplicateShiftAcross,
  findOverlappingShifts,
  setHandoff,
  setPaymentStatus,
  updateShift,
  type ShiftServiceError,
} from "@/server/services/shifts";
import {
  cancelFutureShifts,
  createRuleFromShift,
  deactivateRule,
  generateShifts,
} from "@/server/services/recurring-rules";
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

      /**
       * `Object.fromEntries` guarda só o último valor de um campo repetido, e
       * os dias da semana são vários checkboxes com o mesmo `name`. Sem o
       * `getAll` a regra sairia sempre com um único dia — o último marcado.
       */
      const recurrence = recurrenceSchema.safeParse({
        repeatWeekdays: formData.getAll("repeatWeekdays"),
        repeatWeekly: formData.get("repeatWeekly"),
      });

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

      /**
       * A regra só é criada junto de um plantão **novo**. Numa edição, oferecer
       * recorrência criaria uma segunda série a partir de um plantão que já
       * pode pertencer a outra — e o usuário não teria como perceber.
       */
      let recurrenceMessage = "";

      if (
        !shiftId &&
        recurrence.success &&
        recurrence.data.repeatWeekly &&
        recurrence.data.repeatWeekdays.length > 0
      ) {
        const rule = await createRuleFromShift(
          userId,
          { ...payload, confirmOverlap },
          recurrence.data.repeatWeekdays,
        );

        if (rule) {
          const gerados = await generateShifts(userId, rule.id);

          logger.info("recurring_rule.created", {
            generated: gerados?.created ?? 0,
            ruleId: rule.id,
            weekdays: recurrence.data.repeatWeekdays,
          });

          recurrenceMessage = gerados
            ? ` ${gerados.created} plantões criados até ${gerados.through}.`
            : "";
        }
      }

      revalidateShiftViews();

      return actionOk(
        shift,
        (shiftId ? "Plantão atualizado." : "Plantão criado.") + recurrenceMessage,
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

export async function extendRuleAction(
  ruleId: string,
  _previousState: ActionResult<{ created: number }> | null,
): Promise<ActionResult<{ created: number }>> {
  return runAuthenticatedAction("recurring_rule.extend", async ({
    logger,
    userId,
  }) => {
    const resultado = await generateShifts(userId, ruleId);

    if (!resultado) {
      return actionFail("not_found", "Regra não encontrada ou já desativada.");
    }

    logger.info("recurring_rule.extended", {
      created: resultado.created,
      ruleId,
    });

    revalidateShiftViews();

    return actionOk(
      { created: resultado.created },
      resultado.created > 0
        ? `${resultado.created} plantões criados até ${resultado.through}.`
        : `Nada a criar — a agenda já está completa até ${resultado.through}.`,
    );
  });
}

export async function deactivateRuleAction(
  ruleId: string,
  _previousState: ActionResult<{ id: string }> | null,
): Promise<ActionResult<{ id: string }>> {
  return runAuthenticatedAction("recurring_rule.deactivate", async ({
    logger,
    userId,
  }) => {
    const resultado = await deactivateRule(userId, ruleId);

    if (!resultado) {
      return actionFail("not_found", "Regra não encontrada.");
    }

    logger.info("recurring_rule.deactivated", { ruleId });
    revalidateShiftViews();

    return actionOk(
      resultado,
      "Repetição desativada. Os plantões já lançados continuam na agenda.",
    );
  });
}

export async function cancelRuleFutureAction(
  ruleId: string,
  _previousState: ActionResult<{ deleted: number }> | null,
): Promise<ActionResult<{ deleted: number }>> {
  return runAuthenticatedAction("recurring_rule.cancel_future", async ({
    logger,
    userId,
  }) => {
    const resultado = await cancelFutureShifts(userId, ruleId);

    if (!resultado) {
      return actionFail("not_found", "Regra não encontrada.");
    }

    logger.info("recurring_rule.future_cancelled", {
      deleted: resultado.deleted,
      ruleId,
    });
    revalidateShiftViews();

    return actionOk(
      resultado,
      `${resultado.deleted} plantões futuros removidos. Os passados foram mantidos.`,
    );
  });
}

/**
 * Marca ou desfaz o repasse de UMA ocorrência.
 *
 * Repasse é ação sobre o plantão que já existe, não um tipo escolhido na
 * criação: o plantão de toda terça segue sendo fixo, e numa terça específica
 * você o passa adiante. Por isso vive aqui e não em `saveShiftAction` — editar
 * o valor de um plantão repassado não pode desfazer o repasse sem você pedir.
 */
export async function setHandoffAction(
  shiftId: string,
  _previousState: ShiftActionResult | null,
  formData: FormData,
): Promise<ShiftActionResult> {
  return runAuthenticatedAction("shift.set_handoff", async ({ logger, userId }) => {
    const parsed = handoffSchema.safeParse({
      handoffTo: formData.get("handoffTo") ?? "",
    });

    if (!parsed.success) {
      return validationFailure(parsed.error.flatten().fieldErrors);
    }

    const shift = await setHandoff(userId, shiftId, parsed.data.handoffTo);

    if (!shift) {
      return actionFail("not_found", "Plantão não encontrado.");
    }

    logger.info(shift.handoffTo ? "shift.handed_off" : "shift.handoff_undone", {
      shiftId: shift.id,
    });

    revalidateShiftViews();

    return actionOk(
      shift,
      shift.handoffTo
        ? `Plantão repassado a ${shift.handoffTo}. O valor saiu da sua receita.`
        : "Repasse desfeito. O plantão voltou a ser seu.",
    );
  });
}

/**
 * Duplica um plantão nos dias da semana escolhidos, até o fim do mês de origem
 * ou dos meses seguintes.
 *
 * A duplicação antiga só abria o formulário preenchido — útil para copiar um
 * plantão, inútil para quem trabalha toda terça e quer preencher o mês.
 */
export async function duplicateShiftAction(
  shiftId: string,
  _previousState: ActionResult<{ created: number; skipped: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ created: number; skipped: number }>> {
  return runAuthenticatedAction("shift.duplicate", async ({ logger, userId }) => {
    const parsed = duplicationSchema.safeParse({
      monthsAhead: formData.get("monthsAhead"),
      weekdays: formData.getAll("weekdays"),
    });

    if (!parsed.success) {
      return validationFailure(parsed.error.flatten().fieldErrors);
    }

    const resultado = await duplicateShiftAcross(
      userId,
      shiftId,
      parsed.data.weekdays,
      parsed.data.monthsAhead,
    );

    if (!resultado) {
      return actionFail("not_found", "Plantão não encontrado.");
    }

    logger.info("shift.duplicated", {
      created: resultado.created,
      monthsAhead: parsed.data.monthsAhead,
      shiftId,
      skipped: resultado.skipped,
    });

    revalidateShiftViews();

    if (resultado.created === 0) {
      return actionOk(
        resultado,
        resultado.skipped > 0
          ? "Nada a criar — esses dias já têm este plantão."
          : "Nenhuma data encontrada para duplicar.",
      );
    }

    return actionOk(
      resultado,
      `${resultado.created} ${resultado.created === 1 ? "plantão criado" : "plantões criados"}` +
        (resultado.skipped > 0
          ? `. ${resultado.skipped} ${resultado.skipped === 1 ? "data já tinha" : "datas já tinham"} este plantão.`
          : "."),
    );
  });
}
