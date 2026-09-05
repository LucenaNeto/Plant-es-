import { Prisma, type PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  calculateShiftHours,
  monthRange,
  parseCalendarDate,
  relativeDayLabel,
  shiftsOverlap,
  toDateInputValue,
  todayAsCalendarDate,
  weekDays,
  weekRange,
} from "@/lib/dates/calendar-date";
import { serializeShift, type SerializedShift } from "@/lib/shifts/serializer";
import type { ShiftFilters, ShiftPayload } from "@/lib/validators/shifts";

/**
 * Regras de negócio de Plantão.
 *
 * Segue a convenção da camada: `userId` primeiro, sempre no `where`, retorno já
 * serializado, e nenhum conhecimento de HTTP.
 */

/** Um dia em milissegundos, para varrer os dias vizinhos na busca por conflito. */
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const WITH_UNIT_NAME = {
  unit: { select: { name: true } },
} satisfies Prisma.ShiftInclude;

export type ShiftServiceError =
  | { reason: "unit_not_found" }
  | { reason: "unit_inactive"; unitName: string }
  | { reason: "invalid_time" };

/**
 * Confirma que a unidade existe, pertence ao usuário e pode receber plantão.
 *
 * A checagem de propriedade é o ponto de segurança mais importante deste
 * serviço: sem ela, um `unitId` forjado no formulário permitiria pendurar um
 * plantão na unidade de outra conta, já que o `unitId` chega do cliente.
 *
 * `allowInactive` cobre a edição de um plantão cuja unidade foi inativada
 * depois de ele ser lançado. Exigir unidade ativa ali travaria a correção de um
 * registro histórico legítimo — o usuário não conseguiria nem ajustar o valor
 * de um plantão antigo. A regra vale para vínculo *novo*: ao lançar um plantão,
 * ou ao mover um existente para outra unidade, a unidade precisa estar ativa.
 */
async function assertUsableUnit(
  userId: string,
  unitId: string,
  allowInactive = false,
): Promise<ShiftServiceError | null> {
  const unit = await prisma.unit.findFirst({
    select: { active: true, name: true },
    where: { id: unitId, userId },
  });

  if (!unit) {
    return { reason: "unit_not_found" };
  }

  if (!unit.active && !allowInactive) {
    return { reason: "unit_inactive", unitName: unit.name };
  }

  return null;
}

export async function listShifts(userId: string, filters: ShiftFilters) {
  const { start, end } = monthRange(filters.year, filters.month);

  const shifts = await prisma.shift.findMany({
    include: WITH_UNIT_NAME,
    orderBy: [{ shiftDate: "asc" }, { startTime: "asc" }],
    where: {
      shiftDate: { gte: start, lt: end },
      userId,
      ...(filters.unitId ? { unitId: filters.unitId } : {}),
      ...(filters.paymentStatus
        ? { paymentStatus: filters.paymentStatus }
        : {}),
    },
  });

  return shifts.map(serializeShift);
}

export async function findShift(userId: string, shiftId: string) {
  const shift = await prisma.shift.findFirst({
    include: WITH_UNIT_NAME,
    where: { id: shiftId, userId },
  });

  return shift ? serializeShift(shift) : null;
}

/**
 * Plantões do usuário que colidem no tempo com o informado.
 *
 * Busca a janela de três dias em torno da data porque um plantão noturno
 * (19:00→07:00) pertence ao dia em que começa mas invade o seguinte: filtrar
 * apenas pela data exata deixaria passar o conflito mais provável na prática —
 * emendar a manhã seguinte de um plantão noturno.
 */
export async function findOverlappingShifts(
  userId: string,
  payload: Pick<ShiftPayload, "shiftDate" | "startTime" | "endTime">,
  excludeShiftId?: string,
) {
  const date = parseCalendarDate(payload.shiftDate);

  const candidates = await prisma.shift.findMany({
    include: WITH_UNIT_NAME,
    orderBy: [{ shiftDate: "asc" }, { startTime: "asc" }],
    where: {
      shiftDate: {
        gte: new Date(date.getTime() - ONE_DAY_MS),
        lte: new Date(date.getTime() + ONE_DAY_MS),
      },
      userId,
      ...(excludeShiftId ? { id: { not: excludeShiftId } } : {}),
    },
  });

  const target = {
    date,
    endTime: payload.endTime,
    startTime: payload.startTime,
  };

  return candidates
    .filter((candidate) =>
      shiftsOverlap(target, {
        date: candidate.shiftDate,
        endTime: candidate.endTime,
        startTime: candidate.startTime,
      }),
    )
    .map(serializeShift);
}

type WriteResult =
  | { error: ShiftServiceError; ok: false }
  | { ok: true; shift: SerializedShift };

function buildShiftData(payload: ShiftPayload) {
  const hours = calculateShiftHours(payload.startTime, payload.endTime);

  if (hours === null) {
    return null;
  }

  return {
    category: payload.category,
    // A carga horária é derivada, nunca digitada: pedir ao usuário um número
    // que o sistema sabe calcular só cria oportunidade de divergência entre
    // `hours` e a janela de horário — e é `hours` que alimenta os relatórios.
    hours: new Prisma.Decimal(hours),
    endTime: payload.endTime,
    handoffTo: payload.handoffTo ?? null,
    notes: payload.notes ?? null,
    paymentStatus: payload.paymentStatus,
    shiftDate: parseCalendarDate(payload.shiftDate),
    shiftType: payload.shiftType,
    startTime: payload.startTime,
    value: new Prisma.Decimal(payload.value),
  };
}

export async function createShift(
  userId: string,
  payload: ShiftPayload,
): Promise<WriteResult> {
  const unitError = await assertUsableUnit(userId, payload.unitId);

  if (unitError) {
    return { error: unitError, ok: false };
  }

  const data = buildShiftData(payload);

  if (!data) {
    return { error: { reason: "invalid_time" }, ok: false };
  }

  const shift = await prisma.shift.create({
    data: { ...data, unitId: payload.unitId, userId },
    include: WITH_UNIT_NAME,
  });

  return { ok: true, shift: serializeShift(shift) };
}

export async function updateShift(
  userId: string,
  shiftId: string,
  payload: ShiftPayload,
): Promise<WriteResult | null> {
  const existing = await prisma.shift.findFirst({
    select: { id: true, unitId: true },
    where: { id: shiftId, userId },
  });

  if (!existing) {
    return null;
  }

  // Mantendo a mesma unidade, a inatividade não impede a edição.
  const isSameUnit = existing.unitId === payload.unitId;
  const unitError = await assertUsableUnit(userId, payload.unitId, isSameUnit);

  if (unitError) {
    return { error: unitError, ok: false };
  }

  const data = buildShiftData(payload);

  if (!data) {
    return { error: { reason: "invalid_time" }, ok: false };
  }

  const shift = await prisma.shift.update({
    data: { ...data, unitId: payload.unitId },
    include: WITH_UNIT_NAME,
    where: { id: shiftId },
  });

  return { ok: true, shift: serializeShift(shift) };
}

/**
 * Remoção definitiva. Diferente de unidade, plantão não é inativado: ele não é
 * referenciado por nada que precise sobreviver. Gastos vinculados apontam com
 * `onDelete: SetNull`, então viram gastos gerais em vez de sumirem junto.
 */
export async function deleteShift(userId: string, shiftId: string) {
  const existing = await prisma.shift.findFirst({
    select: { id: true },
    where: { id: shiftId, userId },
  });

  if (!existing) {
    return null;
  }

  await prisma.shift.delete({ where: { id: shiftId } });

  return { id: shiftId };
}

export async function setPaymentStatus(
  userId: string,
  shiftId: string,
  paymentStatus: PaymentStatus,
) {
  const existing = await prisma.shift.findFirst({
    select: { id: true },
    where: { id: shiftId, userId },
  });

  if (!existing) {
    return null;
  }

  const shift = await prisma.shift.update({
    data: { paymentStatus },
    include: WITH_UNIT_NAME,
    where: { id: shiftId },
  });

  return serializeShift(shift);
}

/**
 * Janela de agenda da tela inicial: a semana corrente e os próximos plantões.
 *
 * **Uma consulta, não duas.** A faixa da semana precisa dos dias já passados
 * desta semana (para mostrar o que você já cumpriu) e a lista dos próximos
 * precisa do futuro. Em vez de duas consultas, busca o intervalo que contém as
 * duas — do domingo desta semana até 45 dias à frente — e separa em memória.
 * Com `connection_limit=1` (ver CLAUDE.md) consultas não paralelizam, então
 * cada uma economizada é uma ida ao banco a menos.
 *
 * 45 dias cobre com folga os 4 próximos plantões de quem trabalha semanalmente,
 * sem trazer meses de agenda que a tela não exibe.
 */
export async function getScheduleWindow(userId: string, upcomingLimit = 4) {
  const today = todayAsCalendarDate();
  const { start: weekStart, end: weekEnd } = weekRange(today);
  const horizonte = new Date(today.getTime() + 45 * 86400000);

  const shifts = await prisma.shift.findMany({
    include: WITH_UNIT_NAME,
    orderBy: [{ shiftDate: "asc" }, { startTime: "asc" }],
    where: {
      shiftDate: { gte: weekStart, lte: horizonte },
      userId,
    },
  });

  const serializados = shifts.map((shift) => ({
    ...serializeShift(shift),
    // O rótulo relativo sai daqui, e não do cliente, porque depende de "hoje"
    // no fuso do app — que só o servidor calcula corretamente.
    relativeLabel: relativeDayLabel(shift.shiftDate, today),
  }));

  const inicioSemana = toDateInputValue(weekStart);
  const fimSemana = toDateInputValue(weekEnd);
  const hoje = toDateInputValue(today);

  return {
    today: hoje,
    week: weekDays(today).map((dia) => ({
      ...dia,
      isToday: dia.date === hoje,
      isPast: dia.date < hoje,
      shifts: serializados.filter((plantao) => plantao.shiftDate === dia.date),
    })),
    upcoming: serializados
      .filter((plantao) => plantao.shiftDate >= hoje)
      .slice(0, upcomingLimit),
    weekWindow: { start: inicioSemana, end: fimSemana },
  };
}

export type ScheduleWindow = Awaited<ReturnType<typeof getScheduleWindow>>;

/**
 * Próximo plantão a partir de hoje, para o destaque do dashboard.
 *
 * "Hoje" vem de `todayAsCalendarDate()`, que lê o fuso do app e não o do
 * processo: na Vercel (UTC), depois das 21h de Brasília o servidor já está no
 * dia seguinte e o plantão desta noite seria descartado como passado.
 *
 * Compara por data, não por horário: um plantão que começou às 19h de hoje e
 * ainda está em andamento continua sendo "o próximo" até o dia virar.
 */
export async function findNextShift(userId: string) {
  const shift = await prisma.shift.findFirst({
    include: WITH_UNIT_NAME,
    orderBy: [{ shiftDate: "asc" }, { startTime: "asc" }],
    where: { shiftDate: { gte: todayAsCalendarDate() }, userId },
  });

  return shift ? serializeShift(shift) : null;
}

/**
 * Totais do mês filtrado, para o cabeçalho da lista.
 *
 * Plantões repassados ficam **fora** dos totais de previsto, pendente e
 * recebido, e aparecem em `handedOff`. É a mesma regra de
 * `getMonthlyFinance` — se os dois lugares divergissem, o usuário veria
 * números diferentes para o mesmo mês em telas vizinhas e não saberia em qual
 * acreditar.
 */
export async function summarizeShifts(userId: string, filters: ShiftFilters) {
  const { start, end } = monthRange(filters.year, filters.month);

  const shifts = await prisma.shift.findMany({
    select: { handoffTo: true, hours: true, paymentStatus: true, value: true },
    where: {
      shiftDate: { gte: start, lt: end },
      userId,
      ...(filters.unitId ? { unitId: filters.unitId } : {}),
    },
  });

  const empty = { count: 0, hours: 0, value: 0 };
  const summary: Record<PaymentStatus | "total" | "handedOff", typeof empty> = {
    handedOff: { ...empty },
    pending: { ...empty },
    predicted: { ...empty },
    received: { ...empty },
    total: { ...empty },
  };

  for (const shift of shifts) {
    const valor = shift.value.toNumber();
    const horas = shift.hours.toNumber();
    const alvo = shift.handoffTo ? summary.handedOff : summary[shift.paymentStatus];

    alvo.count += 1;
    alvo.hours += horas;
    alvo.value += valor;

    if (!shift.handoffTo) {
      summary.total.count += 1;
      summary.total.hours += horas;
      summary.total.value += valor;
    }
  }

  // Arredonda os centavos uma vez, no fim, em vez de a cada soma.
  for (const chave of Object.keys(summary) as (keyof typeof summary)[]) {
    summary[chave].hours = Math.round(summary[chave].hours * 100) / 100;
    summary[chave].value = Math.round(summary[chave].value * 100) / 100;
  }

  return summary;
}

export type ShiftSummary = Awaited<ReturnType<typeof summarizeShifts>>;
