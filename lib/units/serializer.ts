import type { Unit } from "@prisma/client";

export function serializeUnit(unit: Unit) {
  return {
    active: unit.active,
    city: unit.city,
    contactName: unit.contactName,
    contactPhone: unit.contactPhone,
    createdAt: unit.createdAt.toISOString(),
    defaultCategory: unit.defaultCategory,
    defaultShiftHours: unit.defaultShiftHours?.toNumber() ?? null,
    defaultShiftValue: unit.defaultShiftValue?.toNumber() ?? null,
    id: unit.id,
    isFixed: unit.isFixed,
    name: unit.name,
    notes: unit.notes,
    type: unit.type,
    updatedAt: unit.updatedAt.toISOString(),
  };
}

export type SerializedUnit = ReturnType<typeof serializeUnit>;
