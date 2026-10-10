import { prisma } from "@/lib/db/prisma";
import { todayAsCalendarDate } from "@/lib/dates/calendar-date";
import { aggregateFinance, financeQueries } from "@/server/services/finance";
import { buildScheduleWindow, scheduleQuery } from "@/server/services/shifts";

/**
 * Tudo que a tela inicial precisa, no menor número de idas ao banco.
 *
 * Quatro consultas, quatro viagens: com `connection_limit=1` nada paraleliza
 * de verdade, então o que importa é quantas consultas existem, não como são
 * disparadas. A montagem usa as funções puras dos serviços —
 * `aggregateFinance` e `buildScheduleWindow` —, de modo que a regra de negócio
 * continua num lugar só; o que muda aqui é apenas quem dispara as consultas.
 *
 * Isto já esteve dentro de um `$transaction`. Saiu porque BEGIN e COMMIT são
 * duas viagens a mais (medido: 5.9 contra 3.9 para o mesmo conjunto, em
 * `scripts/verificar/estrategias.mts`) e a consistência que a transação
 * garantia era cosmética: são leituras da própria conta, e um total que
 * discordasse por um instante se corrigiria no próximo render.
 */
export async function getDashboardData(userId: string) {
  const today = todayAsCalendarDate();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;

  const [shifts, expenses, scheduleShifts, activeUnitCount] = await Promise.all([
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
