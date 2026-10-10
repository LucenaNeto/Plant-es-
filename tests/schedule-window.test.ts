import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import {
  todayAsCalendarDate,
  toDateInputValue,
  weekRange,
} from "@/lib/dates/calendar-date";
import { serializeShift } from "@/lib/shifts/serializer";
import { serializeUnit } from "@/lib/units/serializer";
import { formatCurrency } from "@/lib/format";
import { buildScheduleWindow } from "@/server/services/shifts";

/**
 * A faixa da semana e os próximos plantões da tela inicial.
 *
 * Tudo aqui é relativo a "hoje", então os testes constroem as datas a partir
 * de `todayAsCalendarDate()` em vez de fixar um dia — um teste que só passasse
 * numa terça-feira seria pior que nenhum.
 */

const hoje = todayAsCalendarDate();
const emDias = (dias: number) => new Date(hoje.getTime() + dias * 86400000);

type LinhaDePlantao = Parameters<typeof buildScheduleWindow>[0][number];

let proximoId = 0;

function linha(shiftDate: Date, partes: Partial<LinhaDePlantao> = {}) {
  proximoId += 1;

  return {
    category: "green",
    createdAt: new Date(),
    endTime: "19:00",
    handoffTo: null,
    hours: new Prisma.Decimal(12),
    id: `shift-${proximoId}`,
    notes: null,
    paymentStatus: "predicted",
    recurringRuleId: null,
    shiftDate,
    shiftType: "fixed",
    startTime: "07:00",
    unit: { name: "Hospital Central" },
    unitId: "unit-1",
    updatedAt: new Date(),
    userId: "user-1",
    value: new Prisma.Decimal(1000),
    ...partes,
  } as LinhaDePlantao;
}

describe("buildScheduleWindow", () => {
  it("devolve sempre sete dias, começando no domingo", () => {
    const janela = buildScheduleWindow([]);

    assert.equal(janela.week.length, 7);
    assert.equal(janela.week[0].date, toDateInputValue(weekRange(hoje).start));
    assert.deepEqual(
      janela.week.map((dia) => dia.weekday),
      [0, 1, 2, 3, 4, 5, 6],
    );
  });

  it("marca exatamente um dia como hoje", () => {
    const janela = buildScheduleWindow([]);

    assert.equal(janela.week.filter((dia) => dia.isToday).length, 1);
    assert.equal(
      janela.week.find((dia) => dia.isToday)?.date,
      toDateInputValue(hoje),
    );
  });

  it("não marca hoje como passado", () => {
    const hojeNaSemana = buildScheduleWindow([]).week.find((d) => d.isToday);

    assert.equal(hojeNaSemana?.isPast, false);
  });

  it("põe cada plantão no dia certo da faixa", () => {
    const janela = buildScheduleWindow([linha(hoje)]);
    const diaDeHoje = janela.week.find((dia) => dia.isToday);

    assert.equal(diaDeHoje?.shifts.length, 1);
    assert.equal(
      janela.week.reduce((total, dia) => total + dia.shifts.length, 0),
      1,
    );
  });

  it("lista os próximos a partir de hoje, nunca o passado", () => {
    const janela = buildScheduleWindow([
      linha(emDias(-3)),
      linha(hoje),
      linha(emDias(5)),
    ]);

    assert.equal(janela.upcoming.length, 2);
    assert.ok(janela.upcoming.every((p) => p.shiftDate >= toDateInputValue(hoje)));
  });

  it("respeita o limite de quantos próximos mostrar", () => {
    const linhas = Array.from({ length: 10 }, (_, i) => linha(emDias(i)));

    assert.equal(buildScheduleWindow(linhas, 4).upcoming.length, 4);
    assert.equal(buildScheduleWindow(linhas, 2).upcoming.length, 2);
  });

  /**
   * O rótulo relativo sai do servidor justamente porque depende de "hoje" no
   * fuso do app. Se ele voltasse a ser calculado no cliente, um plantão desta
   * noite apareceria como "amanhã" para quem abrisse o app depois das 21h.
   */
  it("rotula hoje e amanhã, e desiste passada uma semana", () => {
    const janela = buildScheduleWindow(
      [linha(hoje), linha(emDias(1)), linha(emDias(20))],
      10,
    );

    assert.equal(janela.upcoming[0].relativeLabel, "hoje");
    assert.equal(janela.upcoming[1].relativeLabel, "amanhã");
    assert.equal(janela.upcoming[2].relativeLabel, null);
  });

  it("mantém o plantão passado desta semana visível na faixa", () => {
    // O domingo desta semana é passado sempre que hoje não é domingo.
    const domingo = weekRange(hoje).start;

    if (toDateInputValue(domingo) === toDateInputValue(hoje)) {
      return; // hoje é domingo: não há dia passado nesta semana
    }

    const janela = buildScheduleWindow([linha(domingo)]);
    const primeiro = janela.week[0];

    assert.equal(primeiro.isPast, true);
    assert.equal(primeiro.shifts.length, 1, "o plantão já cumprido sumiu");
    assert.equal(janela.upcoming.length, 0, "o passado vazou para os próximos");
  });

  it("aguenta semana sem plantão nenhum", () => {
    const janela = buildScheduleWindow([]);

    assert.deepEqual(janela.upcoming, []);
    assert.ok(janela.week.every((dia) => dia.shifts.length === 0));
  });
});

describe("serializeShift", () => {
  it("não deixa Decimal nem Date atravessarem para o cliente", () => {
    const serializado = serializeShift(linha(hoje));

    assert.equal(typeof serializado.value, "number");
    assert.equal(typeof serializado.hours, "number");
    assert.equal(typeof serializado.shiftDate, "string");
    assert.match(serializado.shiftDate, /^\d{4}-\d{2}-\d{2}$/);
  });

  it("deriva isHandedOff de handoffTo, sem uma terceira flag para discordar", () => {
    assert.equal(serializeShift(linha(hoje)).isHandedOff, false);
    assert.equal(
      serializeShift(linha(hoje, { handoffTo: "Dra. Ana" })).isHandedOff,
      true,
    );
  });

  it("traz o nome da unidade junto, para a lista não precisar de outro passe", () => {
    assert.equal(serializeShift(linha(hoje)).unitName, "Hospital Central");
  });
});

describe("serializeUnit", () => {
  it("converte os padrões opcionais sem transformar ausência em zero", () => {
    const base = {
      active: true,
      city: "Arapiraca",
      contactName: null,
      contactPhone: null,
      createdAt: new Date("2026-09-05T12:00:00.000Z"),
      defaultCategory: null,
      defaultShiftHours: null,
      defaultShiftValue: null,
      id: "unit-1",
      isFixed: false,
      name: "UPA",
      notes: null,
      type: "upa",
      updatedAt: new Date("2026-09-05T12:00:00.000Z"),
      userId: "user-1",
    } as Parameters<typeof serializeUnit>[0];

    const semPadrao = serializeUnit(base);

    assert.equal(semPadrao.defaultShiftValue, null);
    assert.equal(semPadrao.defaultShiftHours, null);

    const comPadrao = serializeUnit({
      ...base,
      defaultShiftHours: new Prisma.Decimal(12),
      defaultShiftValue: new Prisma.Decimal(1500.5),
    });

    assert.equal(comPadrao.defaultShiftValue, 1500.5);
    assert.equal(comPadrao.defaultShiftHours, 12);
  });
});

describe("formatCurrency", () => {
  it("formata em real, no padrão brasileiro", () => {
    // O separador de milhar do Intl em pt-BR é um espaço não quebrável em
    // alguns runtimes — por isso a comparação é por partes, não literal.
    const texto = formatCurrency(1234.5);

    assert.match(texto, /R\$/);
    assert.match(texto, /1\D?234,50/);
  });

  it("formata zero sem virar vazio", () => {
    assert.match(formatCurrency(0), /0,00/);
  });

  it("formata negativo, que aparece quando o gasto supera o recebido", () => {
    assert.match(formatCurrency(-250), /250,00/);
    assert.match(formatCurrency(-250), /-/);
  });
});
