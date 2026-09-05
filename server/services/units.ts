import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { serializeUnit } from "@/lib/units/serializer";
import type {
  UnitPayload,
  UnitUpdatePayload,
} from "@/lib/validators/units";

/**
 * Regras de negócio de Unidade.
 *
 * Convenção da camada de serviço, seguida por todos os serviços do projeto:
 *
 * - **`userId` é sempre o primeiro parâmetro e sempre entra no `where`.** É o
 *   que garante o isolamento entre contas. Nenhuma função aqui aceita buscar
 *   por id sem o dono junto.
 * - O serviço não conhece HTTP: não lê `Request`, não devolve `Response`, não
 *   sabe o que é status code. Quem traduz para HTTP é a route handler; quem
 *   traduz para `ActionResult` é a Server Action.
 * - Retorna sempre dados já serializados (sem `Decimal`/`Date` do Prisma), para
 *   que nada que atravesse a fronteira servidor→cliente precise de conversão.
 */

function toDecimal(value: number | null | undefined) {
  return value === null || value === undefined
    ? null
    : new Prisma.Decimal(value);
}

export async function listUnits(
  userId: string,
  options: { onlyActive?: boolean } = {},
) {
  const units = await prisma.unit.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    where: {
      userId,
      ...(options.onlyActive ? { active: true } : {}),
    },
  });

  return units.map(serializeUnit);
}

export async function findUnit(userId: string, unitId: string) {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, userId },
  });

  return unit ? serializeUnit(unit) : null;
}

export async function createUnit(userId: string, payload: UnitPayload) {
  const unit = await prisma.unit.create({
    data: {
      active: payload.active ?? true,
      city: payload.city,
      contactName: payload.contactName,
      contactPhone: payload.contactPhone,
      defaultCategory: payload.defaultCategory,
      defaultShiftHours: toDecimal(payload.defaultShiftHours),
      defaultShiftValue: toDecimal(payload.defaultShiftValue),
      isFixed: payload.isFixed,
      name: payload.name,
      notes: payload.notes,
      type: payload.type,
      userId,
    },
  });

  return serializeUnit(unit);
}

/**
 * Atualização parcial: só os campos presentes em `payload` são tocados.
 * Retorna `null` quando a unidade não existe ou não pertence ao usuário —
 * os dois casos são indistinguíveis de fora de propósito, para não revelar
 * a existência de registros de outras contas.
 */
export async function updateUnit(
  userId: string,
  unitId: string,
  payload: UnitUpdatePayload,
) {
  const existing = await prisma.unit.findFirst({
    select: { id: true },
    where: { id: unitId, userId },
  });

  if (!existing) {
    return null;
  }

  const data: Prisma.UnitUpdateInput = {};

  if (payload.active !== undefined) data.active = payload.active;
  if (payload.city !== undefined) data.city = payload.city;
  if (payload.contactName !== undefined) data.contactName = payload.contactName;
  if (payload.contactPhone !== undefined)
    data.contactPhone = payload.contactPhone;
  if (payload.defaultCategory !== undefined)
    data.defaultCategory = payload.defaultCategory;
  if (payload.defaultShiftHours !== undefined)
    data.defaultShiftHours = toDecimal(payload.defaultShiftHours);
  if (payload.defaultShiftValue !== undefined)
    data.defaultShiftValue = toDecimal(payload.defaultShiftValue);
  if (payload.isFixed !== undefined) data.isFixed = payload.isFixed;
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.notes !== undefined) data.notes = payload.notes;
  if (payload.type !== undefined) data.type = payload.type;

  const unit = await prisma.unit.update({ data, where: { id: unitId } });

  return serializeUnit(unit);
}

/**
 * Inativação (soft delete). Unidades nunca são apagadas de verdade porque
 * plantões antigos referenciam a unidade (`onDelete: Restrict`) e o histórico
 * financeiro precisa continuar legível.
 */
export async function deactivateUnit(userId: string, unitId: string) {
  const existing = await prisma.unit.findFirst({
    select: { id: true },
    where: { id: unitId, userId },
  });

  if (!existing) {
    return null;
  }

  const unit = await prisma.unit.update({
    data: { active: false },
    where: { id: unitId },
  });

  return serializeUnit(unit);
}
