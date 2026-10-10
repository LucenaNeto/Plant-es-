import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addHoursToTime,
  buildCalendarGrid,
  calculateShiftHours,
  daysBetween,
  formatMonthLabel,
  formatShortDate,
  monthRange,
  parseCalendarDate,
  relativeDayLabel,
  shiftsOverlap,
  toDateInputValue,
  todayAsCalendarDate,
  weekDays,
  weekRange,
} from "@/lib/dates/calendar-date";

/**
 * O módulo de datas é onde moram as cicatrizes do projeto: o dia que aparecia
 * errado por causa do fuso, o plantão noturno com duração negativa, o filtro de
 * mês que perdia o último dia. Cada teste aqui corresponde a um erro que já
 * aconteceu ou que a implementação atual existe para impedir.
 */

describe("parseCalendarDate", () => {
  it("ancora a data à meia-noite UTC", () => {
    const data = parseCalendarDate("2026-09-05");

    assert.equal(data.toISOString(), "2026-09-05T00:00:00.000Z");
  });

  it("recusa formato fora de YYYY-MM-DD", () => {
    for (const ruim of ["05/09/2026", "2026-9-5", "", "2026-09-05T10:00"]) {
      assert.throws(() => parseCalendarDate(ruim), /inválida/);
    }
  });

  it("recusa data que não existe no calendário", () => {
    assert.throws(() => parseCalendarDate("2026-02-30"), /inválida/);
  });

  it("faz o caminho de volta com toDateInputValue", () => {
    for (const dia of ["2026-01-01", "2026-02-28", "2026-12-31"]) {
      assert.equal(toDateInputValue(parseCalendarDate(dia)), dia);
    }
  });
});

describe("formatação em UTC", () => {
  /**
   * O erro original: com o fuso local (BRT, UTC-3), a meia-noite UTC do dia 5
   * é 21h do dia 4, e o app mostrava o dia anterior. O teste força o processo
   * para um fuso a oeste de Greenwich, onde o erro apareceria.
   */
  it("mostra o mesmo dia independentemente do fuso do processo", () => {
    const original = process.env.TZ;

    try {
      process.env.TZ = "America/Sao_Paulo";
      const emBrasilia = formatShortDate(parseCalendarDate("2026-09-05"));

      process.env.TZ = "UTC";
      const emUtc = formatShortDate(parseCalendarDate("2026-09-05"));

      assert.equal(emBrasilia, emUtc);
      assert.match(emBrasilia, /05/);
    } finally {
      process.env.TZ = original;
    }
  });

  it("escreve o mês com inicial maiúscula", () => {
    assert.equal(formatMonthLabel(2026, 9), "Setembro de 2026");
  });

  it("aceita o mês como 1-12, não como índice do Date", () => {
    assert.equal(formatMonthLabel(2026, 1), "Janeiro de 2026");
    assert.equal(formatMonthLabel(2026, 12), "Dezembro de 2026");
  });
});

describe("monthRange", () => {
  it("usa intervalo meio-aberto: início do mês até o início do seguinte", () => {
    const { start, end } = monthRange(2026, 9);

    assert.equal(start.toISOString(), "2026-09-01T00:00:00.000Z");
    assert.equal(end.toISOString(), "2026-10-01T00:00:00.000Z");
  });

  it("inclui o último dia do mês, que o lte clássico perdia", () => {
    const { start, end } = monthRange(2026, 9);
    const ultimoDia = parseCalendarDate("2026-09-30");

    assert.ok(ultimoDia >= start && ultimoDia < end);
  });

  it("vira o ano em dezembro", () => {
    const { end } = monthRange(2026, 12);

    assert.equal(end.toISOString(), "2027-01-01T00:00:00.000Z");
  });

  it("acerta fevereiro em ano bissexto", () => {
    const { start, end } = monthRange(2028, 2);

    assert.equal(daysBetween(start, end), 29);
  });
});

describe("calculateShiftHours", () => {
  it("conta um plantão diurno comum", () => {
    assert.equal(calculateShiftHours("07:00", "19:00"), 12);
  });

  it("atravessa a meia-noite sem dar número negativo", () => {
    assert.equal(calculateShiftHours("19:00", "07:00"), 12);
  });

  it("trata início igual a fim como plantão de 24 horas", () => {
    assert.equal(calculateShiftHours("07:00", "07:00"), 24);
  });

  it("acerta os minutos quebrados", () => {
    assert.equal(calculateShiftHours("07:30", "13:45"), 6.25);
  });

  it("devolve null para horário malformado", () => {
    for (const ruim of ["7:00", "24:00", "07:60", "", "0700"]) {
      assert.equal(calculateShiftHours(ruim, "19:00"), null);
      assert.equal(calculateShiftHours("07:00", ruim), null);
    }
  });
});

describe("addHoursToTime", () => {
  it("soma dentro do mesmo dia", () => {
    assert.equal(addHoursToTime("07:00", 12), "19:00");
  });

  it("dá a volta em 24h em vez de produzir 31:00", () => {
    assert.equal(addHoursToTime("19:00", 12), "07:00");
  });

  it("soma 24h e volta ao mesmo horário", () => {
    assert.equal(addHoursToTime("07:00", 24), "07:00");
  });

  it("recusa duração não positiva ou horário inválido", () => {
    assert.equal(addHoursToTime("07:00", 0), null);
    assert.equal(addHoursToTime("07:00", -1), null);
    assert.equal(addHoursToTime("7:00", 12), null);
    assert.equal(addHoursToTime("07:00", Number.NaN), null);
  });
});

describe("buildCalendarGrid", () => {
  it("entrega semanas completas de sete células", () => {
    for (let mes = 1; mes <= 12; mes++) {
      const grade = buildCalendarGrid(2026, mes);

      assert.equal(grade.length % 7, 0, `mês ${mes} ficou irregular`);
    }
  });

  it("põe o dia 1º na coluna do dia da semana certo", () => {
    // 1º de setembro de 2026 é uma terça-feira: índice 2, contando do domingo.
    const grade = buildCalendarGrid(2026, 9);

    assert.equal(grade[0].date, null);
    assert.equal(grade[1].date, null);
    assert.equal(grade[2].date, "2026-09-01");
  });

  it("acerta a quantidade de dias de cada mês, inclusive fevereiro", () => {
    const dias = (ano: number, mes: number) =>
      buildCalendarGrid(ano, mes).filter((celula) => celula.day !== null).length;

    assert.equal(dias(2026, 2), 28);
    assert.equal(dias(2028, 2), 29);
    assert.equal(dias(2026, 4), 30);
    assert.equal(dias(2026, 12), 31);
  });

  it("numera os dias em sequência, sem buraco", () => {
    const dias = buildCalendarGrid(2026, 9)
      .filter((celula) => celula.day !== null)
      .map((celula) => celula.day);

    assert.deepEqual(
      dias,
      Array.from({ length: 30 }, (_, indice) => indice + 1),
    );
  });
});

describe("shiftsOverlap", () => {
  const dia = (iso: string) => parseCalendarDate(iso);

  it("detecta dois plantões no mesmo horário", () => {
    assert.equal(
      shiftsOverlap(
        { date: dia("2026-09-05"), startTime: "07:00", endTime: "19:00" },
        { date: dia("2026-09-05"), startTime: "13:00", endTime: "19:00" },
      ),
      true,
    );
  });

  it("não acusa conflito entre plantões encostados", () => {
    assert.equal(
      shiftsOverlap(
        { date: dia("2026-09-05"), startTime: "07:00", endTime: "19:00" },
        { date: dia("2026-09-05"), startTime: "19:00", endTime: "23:00" },
      ),
      false,
    );
  });

  /**
   * O caso que motivou a janela de três dias na busca: o plantão noturno
   * invade a manhã seguinte, e filtrar só pela data exata deixaria passar
   * justamente o conflito mais provável na prática.
   */
  it("pega o noturno que invade a manhã do dia seguinte", () => {
    assert.equal(
      shiftsOverlap(
        { date: dia("2026-09-05"), startTime: "19:00", endTime: "07:00" },
        { date: dia("2026-09-06"), startTime: "06:00", endTime: "12:00" },
      ),
      true,
    );
  });

  it("libera a manhã seguinte quando o noturno já terminou", () => {
    assert.equal(
      shiftsOverlap(
        { date: dia("2026-09-05"), startTime: "19:00", endTime: "07:00" },
        { date: dia("2026-09-06"), startTime: "07:00", endTime: "13:00" },
      ),
      false,
    );
  });

  it("não acusa conflito entre dias distantes", () => {
    assert.equal(
      shiftsOverlap(
        { date: dia("2026-09-05"), startTime: "07:00", endTime: "19:00" },
        { date: dia("2026-09-12"), startTime: "07:00", endTime: "19:00" },
      ),
      false,
    );
  });

  /**
   * Antes havia um `?? 0` que colapsava o intervalo num ponto: a função
   * respondia "sem conflito" para um plantão que sequer pôde ser avaliado.
   * Falso negativo silencioso numa checagem de conflito é pior que erro.
   */
  it("explode em vez de responder sem conflito para horário inválido", () => {
    assert.throws(
      () =>
        shiftsOverlap(
          { date: dia("2026-09-05"), startTime: "25:00", endTime: "19:00" },
          { date: dia("2026-09-05"), startTime: "07:00", endTime: "19:00" },
        ),
      /inválido/,
    );
  });
});

describe("semana", () => {
  it("começa no domingo, como o calendário impresso", () => {
    // 2026-09-05 é um sábado; o domingo da semana dele é 2026-08-30.
    const { start, end } = weekRange(parseCalendarDate("2026-09-05"));

    assert.equal(toDateInputValue(start), "2026-08-30");
    assert.equal(toDateInputValue(end), "2026-09-06");
  });

  it("devolve o próprio domingo quando a data já é domingo", () => {
    const { start } = weekRange(parseCalendarDate("2026-08-30"));

    assert.equal(toDateInputValue(start), "2026-08-30");
  });

  it("lista sete dias em sequência a partir do domingo", () => {
    const dias = weekDays(parseCalendarDate("2026-09-05"));

    assert.equal(dias.length, 7);
    assert.equal(dias[0].date, "2026-08-30");
    assert.equal(dias[6].date, "2026-09-05");
    assert.deepEqual(
      dias.map((d) => d.weekday),
      [0, 1, 2, 3, 4, 5, 6],
    );
  });
});

describe("relativeDayLabel", () => {
  const hoje = parseCalendarDate("2026-09-05");
  const em = (dias: number) => new Date(hoje.getTime() + dias * 86400000);

  it("nomeia os dias próximos", () => {
    assert.equal(relativeDayLabel(hoje, hoje), "hoje");
    assert.equal(relativeDayLabel(em(1), hoje), "amanhã");
    assert.equal(relativeDayLabel(em(3), hoje), "em 3 dias");
    assert.equal(relativeDayLabel(em(6), hoje), "em 6 dias");
  });

  it("desiste a partir de uma semana, quando a data informa mais", () => {
    assert.equal(relativeDayLabel(em(7), hoje), null);
    assert.equal(relativeDayLabel(em(30), hoje), null);
  });

  it("não rotula o passado", () => {
    assert.equal(relativeDayLabel(em(-1), hoje), null);
  });
});

describe("todayAsCalendarDate", () => {
  /**
   * A cicatriz: a Vercel roda em UTC e o usuário está em Brasília. Entre 21h e
   * a meia-noite de Brasília o servidor já virou o dia, e o plantão desta noite
   * seria descartado como passado. A data tem que sair do fuso do app, não do
   * fuso do processo.
   */
  it("usa o fuso informado, não o do processo", () => {
    const saoPaulo = todayAsCalendarDate("America/Sao_Paulo");
    const kiritimati = todayAsCalendarDate("Pacific/Kiritimati");

    // Kiritimati é UTC+14 e São Paulo UTC-3: a diferença entre os dois é de
    // zero ou um dia, nunca mais que isso.
    const diferenca = daysBetween(saoPaulo, kiritimati);

    assert.ok(
      diferenca === 0 || diferenca === 1,
      `diferença inesperada de ${diferenca} dia(s)`,
    );
  });

  it("devolve sempre meia-noite UTC, comparável com shiftDate", () => {
    const hoje = todayAsCalendarDate();

    assert.equal(hoje.getUTCHours(), 0);
    assert.equal(hoje.getUTCMinutes(), 0);
    assert.equal(hoje.getUTCSeconds(), 0);
    assert.equal(hoje.getUTCMilliseconds(), 0);
  });
});
