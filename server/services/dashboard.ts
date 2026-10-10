import { prisma } from "@/lib/db/prisma";
import { todayAsCalendarDate } from "@/lib/dates/calendar-date";
import { aggregateFinance, financeQueries } from "@/server/services/finance";
import { buildScheduleWindow, scheduleQuery } from "@/server/services/shifts";

/**
 * Tudo que a tela inicial precisa, em **uma** ida ao banco.
 *
 * Quatro consultas numa transação só. Com `connection_limit=1` elas não
 * paralelizam de qualquer forma, e com o pooler em transaction mode cada
 * consulta solta é uma transação implícita de ~300ms — agrupadas, as quatro
 * custam pouco mais que uma.
 *
 * A montagem usa as funções puras dos serviços — `aggregateFinance` e
 * `buildScheduleWindow` —, de modo que a regra de negócio continua num lugar
 * só; o que muda aqui é apenas quem dispara as consultas.
 */export async function getDashboardData(userId: string) {
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
