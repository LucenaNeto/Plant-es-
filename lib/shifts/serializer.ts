import type { Shift, Unit } from "@prisma/client";
import {
  formatLongDate,
  formatShortDate,
  toDateInputValue,
} from "@/lib/dates/calendar-date";

/**
 * Converte um plantão do Prisma na forma que atravessa a fronteira
 * servidor→cliente.
 *
 * Duas garantias deliberadas:
 *
 * - **Nenhum `Date` ou `Decimal` sai daqui.** A data vira a string
 *   "YYYY-MM-DD" (que o `<input type="date">` consome direto) e os rótulos
 *   legíveis são calculados no servidor, onde o fuso está sob controle. Assim
 *   o cliente não tem como formatar uma data de calendário errado — ele nunca
 *   recebe um objeto que possa ser formatado.
 * - **O nome da unidade vem junto**, para a lista não precisar de um segundo
 *   passe cruzando ids (e para não abrir a porta para um N+1).
 */
export function serializeShift(shift: Shift & { unit: Pick<Unit, "name"> }) {
  return {
    category: shift.category,
    dateLabel: formatShortDate(shift.shiftDate),
    endTime: shift.endTime,
    fullDateLabel: formatLongDate(shift.shiftDate),
    hours: shift.hours.toNumber(),
    id: shift.id,
    notes: shift.notes,
    paymentStatus: shift.paymentStatus,
    shiftDate: toDateInputValue(shift.shiftDate),
    shiftType: shift.shiftType,
    startTime: shift.startTime,
    unitId: shift.unitId,
    unitName: shift.unit.name,
    value: shift.value.toNumber(),
  };
}

export type SerializedShift = ReturnType<typeof serializeShift>;
