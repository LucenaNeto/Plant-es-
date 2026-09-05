import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  formatShortDate,
  toDateInputValue,
  todayAsCalendarDate,
  WEEKDAY_LABELS,
} from "@/lib/dates/calendar-date";
import type { ShiftPayload } from "@/lib/validators/shifts";

/**
 * Regras de plantão recorrente.
 *
 * **A regra gera plantões de verdade, não ocorrências virtuais.** Cada
 * ocorrência é uma linha normal em `Shift`, então mover de dia, editar o valor
 * ou excluir uma delas é editar um plantão — sem o clássico "editar só este /
 * este e os futuros / todos" que atormenta app de calendário. A regra existe
 * para criar; depois de criado, o plantão anda com as próprias pernas.
 *
 * Corolário: apagar a regra não apaga os plantões. `Shift.recurringRuleId` usa
 * `onDelete: SetNull`, então eles viram plantões avulsos e o histórico
 * sobrevive.
 */

const DIA_MS = 86400000;

/** Quantos meses à frente a regra mantém plantões criados. */
export const MESES_DE_COBERTURA = 3;

export function coberturaAte(from: Date = todayAsCalendarDate()) {
  return new Date(
    Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth() + MESES_DE_COBERTURA,
      from.getUTCDate(),
    ),
  );
}

export function describeWeekdays(weekdays: number[]) {
  return [...weekdays]
    .sort((a, b) => a - b)
    .map((dia) => WEEKDAY_LABELS[dia])
    .join(", ");
}

function serializeRule(
  rule: Prisma.RecurringRuleGetPayload<{
    include: { unit: { select: { name: true } }; _count: { select: { shifts: true } } };
  }>,
  lastShiftDate: Date | null,
) {
  return {
    active: rule.active,
    defaultCategory: rule.defaultCategory,
    defaultValue: rule.defaultValue.toNumber(),
    endTime: rule.endTime,
    generatedCount: rule._count.shifts,
    /** Até quando a regra já tem plantões criados. */
    generatedThrough: lastShiftDate ? formatShortDate(lastShiftDate) : null,
    generatedThroughDate: lastShiftDate ? toDateInputValue(lastShiftDate) : null,
    id: rule.id,
    startTime: rule.startTime,
    unitId: rule.unitId,
    unitName: rule.unit.name,
    weekdays: rule.weekdays,
    weekdaysLabel: describeWeekdays(rule.weekdays),
  };
}

export type SerializedRule = ReturnType<typeof serializeRule>;

export async function listRules(userId: string): Promise<SerializedRule[]> {
  const rules = await prisma.recurringRule.findMany({
    include: {
      _count: { select: { shifts: true } },
      unit: { select: { name: true } },
    },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    where: { userId },
  });

  if (rules.length === 0) {
    return [];
  }

  // Uma consulta para o horizonte de todas as regras, em vez de uma por regra.
  const ultimos = await prisma.shift.groupBy({
    _max: { shiftDate: true },
    by: ["recurringRuleId"],
    where: { recurringRuleId: { in: rules.map((r) => r.id) }, userId },
  });

  const horizonte = new Map(
    ultimos.map((linha) => [linha.recurringRuleId, linha._max.shiftDate]),
  );

  return rules.map((rule) => serializeRule(rule, horizonte.get(rule.id) ?? null));
}

/**
 * Cria a regra a partir do plantão que o usuário acabou de lançar.
 *
 * O plantão-semente vira o modelo: unidade, horário, valor e modalidade saem
 * dele. Assim a regra nunca discorda do plantão que a originou.
 */
export async function createRuleFromShift(
  userId: string,
  payload: ShiftPayload,
  weekdays: number[],
) {
  const unicos = [...new Set(weekdays)].sort((a, b) => a - b);

  if (unicos.length === 0) {
    return null;
  }

  return prisma.recurringRule.create({
    data: {
      defaultCategory: payload.category,
      defaultShiftType: payload.shiftType,
      defaultValue: new Prisma.Decimal(payload.value),
      endTime: payload.endTime,
      replicateFutureMonths: true,
      startTime: payload.startTime,
      unitId: payload.unitId,
      userId,
      weekdays: unicos,
    },
  });
}

export type GenerationResult = {
  created: number;
  skipped: number;
  through: string;
};

/**
 * Cria os plantões que faltam para a regra até a data-limite.
 *
 * **Idempotente.** Antes de criar, lê o que já existe daquela regra no
 * intervalo e pula as datas cobertas. Rodar duas vezes não duplica nada — o que
 * importa porque "estender" é um botão que o usuário pode apertar de novo sem
 * pensar, e porque a mesma função serve à criação e à renovação.
 *
 * Não bloqueia por sobreposição com outros plantões: a regra do produto é
 * avisar, não impedir, e aqui o usuário declarou explicitamente que quer o
 * plantão naquele dia.
 */
export async function generateShifts(
  userId: string,
  ruleId: string,
  through: Date = coberturaAte(),
): Promise<GenerationResult | null> {
  const rule = await prisma.recurringRule.findFirst({
    where: { active: true, id: ruleId, userId },
  });

  if (!rule) {
    return null;
  }

  const hoje = todayAsCalendarDate();

  // Começa hoje: gerar retroativo criaria plantões que a pessoa não trabalhou.
  const existentes = await prisma.shift.findMany({
    select: { shiftDate: true },
    where: {
      recurringRuleId: rule.id,
      shiftDate: { gte: hoje, lte: through },
      userId,
    },
  });

  const cobertas = new Set(existentes.map((s) => toDateInputValue(s.shiftDate)));
  const dias = new Set(rule.weekdays);
  const novos: Prisma.ShiftCreateManyInput[] = [];

  for (let t = hoje.getTime(); t <= through.getTime(); t += DIA_MS) {
    const data = new Date(t);

    if (!dias.has(data.getUTCDay()) || cobertas.has(toDateInputValue(data))) {
      continue;
    }

    novos.push({
      category: rule.defaultCategory,
      endTime: rule.endTime,
      hours: hoursBetween(rule.startTime, rule.endTime),
      recurringRuleId: rule.id,
      shiftDate: data,
      shiftType: rule.defaultShiftType,
      startTime: rule.startTime,
      unitId: rule.unitId,
      userId,
      value: rule.defaultValue,
    });
  }

  if (novos.length > 0) {
    await prisma.shift.createMany({ data: novos });
  }

  return {
    created: novos.length,
    skipped: cobertas.size,
    through: formatShortDate(through),
  };
}

/** Duração em Decimal, replicando a regra de `calculateShiftHours`. */
function hoursBetween(startTime: string, endTime: string) {
  const [h1, m1] = startTime.split(":").map(Number);
  const [h2, m2] = endTime.split(":").map(Number);
  const bruto = h2 * 60 + m2 - (h1 * 60 + m1);
  const minutos = bruto > 0 ? bruto : bruto + 24 * 60;

  return new Prisma.Decimal(Math.round((minutos / 60) * 100) / 100);
}

/**
 * Desativa a regra. Os plantões já criados permanecem — foram lançados e podem
 * já ter sido trabalhados; apagá-los junto seria destruir histórico.
 */
export async function deactivateRule(userId: string, ruleId: string) {
  const existing = await prisma.recurringRule.findFirst({
    select: { id: true },
    where: { id: ruleId, userId },
  });

  if (!existing) {
    return null;
  }

  await prisma.recurringRule.update({
    data: { active: false },
    where: { id: ruleId },
  });

  return { id: ruleId };
}

/**
 * Remove os plantões **futuros** gerados pela regra e a desativa.
 *
 * Separado de `deactivateRule` porque são intenções diferentes: "parar de
 * gerar daqui pra frente" e "cancelar o que ainda não aconteceu". Plantões
 * passados nunca são tocados nos dois casos.
 */
export async function cancelFutureShifts(userId: string, ruleId: string) {
  const existing = await prisma.recurringRule.findFirst({
    select: { id: true },
    where: { id: ruleId, userId },
  });

  if (!existing) {
    return null;
  }

  const { count } = await prisma.shift.deleteMany({
    where: {
      recurringRuleId: ruleId,
      shiftDate: { gt: todayAsCalendarDate() },
      userId,
    },
  });

  await prisma.recurringRule.update({
    data: { active: false },
    where: { id: ruleId },
  });

  return { deleted: count };
}
