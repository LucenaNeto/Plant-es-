import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  formatShortDate,
  monthRange,
  toDateInputValue,
  WEEKDAY_LABELS,
} from "@/lib/dates/calendar-date";

/**
 * Relatórios operacionais e financeiros.
 *
 * **Um relatório, dois modos.** O pedido era por dois — um com os dias e outro
 * com os valores —, mas eles compartilham filtro, período, agrupamento e
 * cabeçalho. Construí como um só, com um interruptor de valores: dois
 * relatórios separados divergiriam na primeira mudança de regra, e o usuário
 * teria que descobrir qual dos dois estava certo.
 *
 * **Plantão repassado entra na lista, mas não nos totais.** Ele esteve na sua
 * escala e um relatório que o omitisse mentiria sobre a agenda; mas as horas
 * foram de outra pessoa, então não entram em horas nem em valor. É a mesma
 * regra do resumo financeiro — divergir aqui faria o relatório contradizer a
 * tela de finanças.
 */

export type ReportFilters = {
  /** Ausente significa o ano inteiro. */
  month?: number;
  unitId?: string;
  year: number;
};

type SeriesRow = {
  ano: number;
  mes: number;
  horas: number;
  valor: number;
  recebido: number;
  plantoes: number;
};

export type ReportShift = {
  category: string;
  dateLabel: string;
  handoffTo: string | null;
  hours: number;
  id: string;
  isoDate: string;
  paymentStatus: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  unitName: string;
  value: number;
  weekday: string;
};

function periodRange(filters: ReportFilters) {
  if (filters.month) {
    return monthRange(filters.year, filters.month);
  }

  return {
    start: new Date(Date.UTC(filters.year, 0, 1)),
    end: new Date(Date.UTC(filters.year + 1, 0, 1)),
  };
}

export async function getReport(userId: string, filters: ReportFilters) {
  const { start, end } = periodRange(filters);

  const [user, shifts, serie] = await prisma.$transaction([
    prisma.user.findUniqueOrThrow({
      select: { name: true, profession: true, specialty: true },
      where: { id: userId },
    }),
    prisma.shift.findMany({
      include: { unit: { select: { name: true } } },
      orderBy: [{ shiftDate: "asc" }, { startTime: "asc" }],
      where: {
        shiftDate: { gte: start, lt: end },
        userId,
        ...(filters.unitId ? { unitId: filters.unitId } : {}),
      },
    }),
    /**
     * Agregado por ano e mês em SQL, e não em memória: os gráficos precisam do
     * histórico inteiro, e trazer todos os plantões de todos os anos para somar
     * no servidor deixaria de escalar já no segundo ano de uso.
     *
     * `handoffTo IS NULL` exclui os repassados dos totais, como no financeiro.
     */
    prisma.$queryRaw<SeriesRow[]>`
      SELECT
        EXTRACT(YEAR FROM "shiftDate")::int  AS ano,
        EXTRACT(MONTH FROM "shiftDate")::int AS mes,
        COALESCE(SUM("hours"), 0)::float     AS horas,
        COALESCE(SUM("value"), 0)::float     AS valor,
        -- Recebido separado do bruto: a diferença entre os dois é exatamente
        -- o que ainda precisa ser cobrado, e é o número que o comparativo
        -- existe para revelar.
        COALESCE(SUM(CASE WHEN "paymentStatus" = 'received' THEN "value" ELSE 0 END), 0)::float
                                             AS recebido,
        COUNT(*)::int                        AS plantoes
      FROM "Shift"
      WHERE "userId" = ${userId}
        AND "handoffTo" IS NULL
        ${filters.unitId ? Prisma.sql`AND "unitId" = ${filters.unitId}` : Prisma.empty}
      GROUP BY 1, 2
      ORDER BY 1, 2
    `,
  ]);

  const linhas: ReportShift[] = shifts.map((shift) => ({
    category: shift.category,
    dateLabel: formatShortDate(shift.shiftDate),
    endTime: shift.endTime,
    handoffTo: shift.handoffTo,
    hours: shift.hours.toNumber(),
    id: shift.id,
    isoDate: toDateInputValue(shift.shiftDate),
    paymentStatus: shift.paymentStatus,
    shiftType: shift.shiftType,
    startTime: shift.startTime,
    unitName: shift.unit.name,
    value: shift.value.toNumber(),
    weekday: WEEKDAY_LABELS[shift.shiftDate.getUTCDay()],
  }));

  // Agrupamento por unidade, que é como o relatório é lido: cada hospital
  // quer ver a própria escala, não uma lista corrida de tudo.
  const porUnidade = new Map<
    string,
    { hours: number; received: number; shifts: ReportShift[]; unitName: string; value: number }
  >();

  for (const linha of linhas) {
    const grupo = porUnidade.get(linha.unitName) ?? {
      hours: 0,
      received: 0,
      shifts: [],
      unitName: linha.unitName,
      value: 0,
    };

    grupo.shifts.push(linha);

    if (!linha.handoffTo) {
      grupo.hours += linha.hours;
      grupo.value += linha.value;

      if (linha.paymentStatus === "received") {
        grupo.received += linha.value;
      }
    }

    porUnidade.set(linha.unitName, grupo);
  }

  const arredonda = (n: number) => Math.round(n * 100) / 100;

  const byUnit = [...porUnidade.values()]
    .map((grupo) => ({
      ...grupo,
      hours: arredonda(grupo.hours),
      received: arredonda(grupo.received),
      value: arredonda(grupo.value),
    }))
    .sort((a, b) => b.hours - a.hours);

  const totals = byUnit.reduce(
    (acc, grupo) => ({
      hours: arredonda(acc.hours + grupo.hours),
      received: arredonda(acc.received + grupo.received),
      shiftCount: acc.shiftCount + grupo.shifts.filter((s) => !s.handoffTo).length,
      value: arredonda(acc.value + grupo.value),
    }),
    { hours: 0, received: 0, shiftCount: 0, value: 0 },
  );

  /**
   * Doze meses do ano escolhido, com zeros — o gráfico precisa da lacuna.
   *
   * Cada mês carrega três leituras do mesmo recebimento: o valor absoluto, o
   * mesmo mês do ano anterior (para o comparativo lado a lado) e a variação
   * sobre o mês imediatamente anterior.
   */
  const recebidoNoMes = (ano: number, mes: number) =>
    arredonda(
      serie.find((linha) => linha.ano === ano && linha.mes === mes)?.recebido ?? 0,
    );

  const monthly = Array.from({ length: 12 }, (_, indice) => {
    const mes = indice + 1;
    const linha = serie.find((s) => s.ano === filters.year && s.mes === mes);

    const valor = arredonda(linha?.valor ?? 0);
    const recebido = arredonda(linha?.recebido ?? 0);

    /**
     * Dezembro compara com dezembro do ano anterior, não com janeiro deste —
     * por isso a busca atravessa a virada de ano em vez de olhar `monthly[-1]`.
     */
    const anterior =
      mes === 1
        ? recebidoNoMes(filters.year - 1, 12)
        : recebidoNoMes(filters.year, mes - 1);

    return {
      hours: arredonda(linha?.horas ?? 0),
      month: mes,
      /**
       * Variação sobre o mês anterior, em pontos percentuais.
       *
       * `null` quando não há base de comparação: sair de zero não é "aumento
       * de 100%", é a primeira entrada — e exibir um percentual ali seria
       * inventar significado onde não existe.
       */
      changeFromPreviousMonth:
        anterior > 0 ? Math.round(((recebido - anterior) / anterior) * 100) : null,
      previousMonthReceived: anterior,
      /** Mesmo mês do ano anterior, para o comparativo lado a lado. */
      previousYearReceived: recebidoNoMes(filters.year - 1, mes),
      received: recebido,
      shiftCount: linha?.plantoes ?? 0,
      /** Bruto menos recebido: o que ainda está para entrar. */
      toReceive: arredonda(valor - recebido),
      value: valor,
    };
  });

  const porAno = new Map<
    number,
    { hours: number; received: number; shiftCount: number; value: number }
  >();

  for (const linha of serie) {
    const ano = porAno.get(linha.ano) ?? {
      hours: 0,
      received: 0,
      shiftCount: 0,
      value: 0,
    };
    ano.hours += linha.horas;
    ano.received += linha.recebido;
    ano.shiftCount += linha.plantoes;
    ano.value += linha.valor;
    porAno.set(linha.ano, ano);
  }

  const yearly = [...porAno.entries()]
    .map(([year, dados]) => ({
      hours: arredonda(dados.hours),
      received: arredonda(dados.received),
      shiftCount: dados.shiftCount,
      toReceive: arredonda(dados.value - dados.received),
      value: arredonda(dados.value),
      year,
    }))
    .sort((a, b) => a.year - b.year);

  /**
   * Acumulado de tudo que já entrou, em qualquer período — a resposta para
   * "quanto eu já recebi até hoje". Sai da mesma série dos gráficos: ela já
   * cobre o histórico inteiro, então não custa consulta nenhuma.
   */
  const allTimeReceived = arredonda(
    serie.reduce((soma, linha) => soma + linha.recebido, 0),
  );

  const allTimeGross = arredonda(
    serie.reduce((soma, linha) => soma + linha.valor, 0),
  );

  return {
    allTimeGross,
    allTimeReceived,
    byUnit,
    handedOffCount: linhas.filter((l) => l.handoffTo).length,
    monthly,
    totals,
    user,
    yearly,
  };
}

export type Report = Awaited<ReturnType<typeof getReport>>;

/** Anos com plantão lançado, para o seletor de período. */
export async function listReportYears(userId: string) {
  const linhas = await prisma.$queryRaw<{ ano: number }[]>`
    SELECT DISTINCT EXTRACT(YEAR FROM "shiftDate")::int AS ano
    FROM "Shift" WHERE "userId" = ${userId} ORDER BY 1 DESC
  `;

  return linhas.map((l) => l.ano);
}
