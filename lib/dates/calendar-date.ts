/**
 * Datas de calendário (plantão, gasto).
 *
 * As colunas `Shift.shiftDate` e `Expense.expenseDate` são `DATE` no Postgres.
 * O Prisma as devolve como `Date` de JavaScript posicionado à **meia-noite
 * UTC** — o `Date` do JS não tem representação para "data sem hora".
 *
 * Consequência prática, e a razão de este módulo existir: formatar esse `Date`
 * com o fuso local (BRT, UTC-3) mostra o **dia anterior**. Toda leitura e toda
 * escrita de data de calendário passa por aqui, com `timeZone: "UTC"` fixo.
 * Nenhum outro arquivo deve chamar `toLocaleDateString` sobre essas colunas.
 *
 * Horas do plantão vivem separadas, em `startTime`/`endTime` ("HH:mm"), porque
 * um plantão noturno atravessa a meia-noite mas continua pertencendo ao dia em
 * que começou.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_OF_DAY = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const UTC = "UTC";

/**
 * Converte "YYYY-MM-DD" (o que um `<input type="date">` envia) no `Date`
 * que o Prisma grava numa coluna `DATE`. Lança para entrada malformada:
 * é erro de programação, não de usuário — a validação Zod barra antes.
 */
export function parseCalendarDate(value: string): Date {
  if (!ISO_DATE.test(value)) {
    throw new Error(`Data de calendário inválida: ${value}`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Data de calendário inválida: ${value}`);
  }

  return date;
}

/** Formato "YYYY-MM-DD", para preencher `<input type="date">`. */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "20 de ago." — rótulo curto para cards e listas. */
export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: UTC,
  }).format(date);
}

/** "quinta, 20 de agosto de 2026" — cabeçalho de detalhe. */
export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: UTC,
    weekday: "long",
    year: "numeric",
  }).format(date);
}

/** "Agosto de 2026" — título de agenda e de resumo mensal. */
export function formatMonthLabel(year: number, month: number): string {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: UTC,
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Intervalo `[início, fim)` de um mês, em UTC — a forma correta de filtrar
 * `shiftDate` no Prisma (`gte` no início, `lt` no início do mês seguinte).
 * Usar `lte` no último dia do mês é o erro clássico que perde registros.
 *
 * @param month 1-12, não o índice 0-11 do `Date` do JavaScript.
 */
export function monthRange(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

/** Dia do mês (1-31) lido em UTC. */
export function getCalendarDay(date: Date): number {
  return date.getUTCDate();
}

/**
 * Fuso de referência do produto. O app é de uso pessoal, no Brasil, e "hoje"
 * precisa significar o hoje do usuário — não o do processo que executa o
 * código.
 */
export const APP_TIME_ZONE = "America/Sao_Paulo";

/**
 * Hoje, normalizado para meia-noite UTC — comparável com `shiftDate`.
 *
 * Ler `getFullYear/getMonth/getDate` daria a data do fuso do **processo**, e na
 * Vercel o processo roda em UTC: entre 21h e a meia-noite de Brasília o
 * servidor já está no dia seguinte e um plantão de hoje seria tratado como
 * passado. Por isso a data sai do `Intl` no fuso do app.
 *
 * `en-CA` é usado por produzir exatamente "YYYY-MM-DD", que
 * `parseCalendarDate` consome sem reordenar nada.
 */
export function todayAsCalendarDate(timeZone: string = APP_TIME_ZONE): Date {
  const isoDate = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).format(new Date());

  return parseCalendarDate(isoDate);
}

/**
 * Duração em horas entre dois horários "HH:mm", tratando a virada de
 * meia-noite: um plantão 19:00 → 07:00 dura 12h, não -12h.
 *
 * Retorna `null` para entrada malformada, para que o chamador decida se isso é
 * erro de validação ou apenas ausência de dado.
 */
export function calculateShiftHours(
  startTime: string,
  endTime: string,
): number | null {
  const start = TIME_OF_DAY.exec(startTime);
  const end = TIME_OF_DAY.exec(endTime);

  if (!start || !end) {
    return null;
  }

  const startMinutes = Number(start[1]) * 60 + Number(start[2]);
  const endMinutes = Number(end[1]) * 60 + Number(end[2]);
  const rawDiff = endMinutes - startMinutes;

  // Fim menor ou igual ao início significa que o plantão atravessou a
  // meia-noite. Igual (ex.: 07:00 → 07:00) é o plantão de 24 horas.
  const minutes = rawDiff > 0 ? rawDiff : rawDiff + 24 * 60;

  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * Os dois plantões se sobrepõem no tempo?
 *
 * Compara em minutos absolutos a partir da meia-noite do dia de início, o que
 * faz plantões noturnos (que invadem o dia seguinte) serem comparados
 * corretamente com o plantão da manhã seguinte.
 */
export function shiftsOverlap(
  a: { date: Date; startTime: string; endTime: string },
  b: { date: Date; startTime: string; endTime: string },
): boolean {
  const toAbsoluteRange = (shift: {
    date: Date;
    startTime: string;
    endTime: string;
  }) => {
    const duration = calculateShiftHours(shift.startTime, shift.endTime);

    // Antes havia um `?? 0` aqui. Ele colapsava o intervalo num ponto, e a
    // função respondia "sem sobreposição" para um plantão que sequer pôde ser
    // avaliado — um falso negativo silencioso numa checagem de conflito. Falhar
    // alto é melhor: horário malformado é erro de programação, já que o Zod
    // valida o formato antes de qualquer coisa chegar aqui.
    if (duration === null) {
      throw new Error(
        `Horário de plantão inválido: ${shift.startTime}-${shift.endTime}`,
      );
    }

    const dayOffset = Math.floor(shift.date.getTime() / 60000);
    const [startHour, startMinute] = shift.startTime.split(":").map(Number);
    const start = dayOffset + startHour * 60 + startMinute;

    return { start, end: start + duration * 60 };
  };

  const rangeA = toAbsoluteRange(a);
  const rangeB = toAbsoluteRange(b);

  return rangeA.start < rangeB.end && rangeB.start < rangeA.end;
}
