import { prisma } from "@/lib/db/prisma";
import { todayAsCalendarDate } from "@/lib/dates/calendar-date";
import { aggregateFinance, financeQueries } from "@/server/services/finance";
import { buildScheduleWindow, scheduleQuery } from "@/server/services/shifts";

/**
 * Tudo que a tela inicial precisa, em **uma** ida ao banco.
 *
 * A versão anterior chamava três serviços em `Promise.all`, o que parecia
 * paralelo mas não era: com `connection_limit=1` as consultas se enfileiram na
 * única conexão. Somado ao pooler em transaction mode, onde cada viagem custa
 * ~256ms, isso colocava a tela perto de 800ms só de espera de rede.
 *
 * Aqui as quatro consultas vão juntas num `$transaction`, e a montagem dos
 * dados usa as mesmas funções puras dos serviços — `aggregateFinance` e
 * `buildScheduleWindow`. A regra de negócio continua num lugar só; o que muda
 * é apenas quem dispara as consultas.
 */
export async function getDashboardData(userId: string) {
  const today = todayAsCalendarDate();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;

  const [shifts, expenses, scheduleShifts, activeUnitCount] =
    await prisma.$transaction([
      ...financeQueries(userId, year, month),
      scheduleQuery(userId),
      prisma.unit.count({ where: { active: true, userId } }),
    ]);

  return {
    activeUnitCount,
    finance: aggregateFinance(shifts, expenses),
    month,
    schedule: buildScheduleWindow(scheduleShifts),
    year,
  };
}
