import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCalendarDate, toDateInputValue } from "@/lib/dates/calendar-date";
import {
  coberturaAte,
  describeWeekdays,
  MESES_DE_COBERTURA,
} from "@/server/services/recurring-rules";
import { duplicationDates } from "@/server/services/shifts";

/**
 * Geração de datas em lote — duplicação e cobertura das regras de repetição.
 *
 * É o código que cria plantões sozinho, então errar aqui não dá erro: dá
 * plantão no dia errado, ou plantão a menos, e a pessoa só descobre quando
 * chega no hospital. Os testes fixam as bordas: o dia de origem, o fim do mês,
 * a virada de ano e fevereiro.
 */

const datasDe = (...args: Parameters<typeof duplicationDates>) =>
  duplicationDates(...args).map(toDateInputValue);

describe("duplicationDates", () => {
  /**
   * 2026-09-01 é terça. Duplicar "toda terça" a partir dele deve produzir as
   * terças seguintes do mês — e não a própria origem, que já existe.
   */
  it("começa no dia seguinte ao de origem, nunca no próprio", () => {
    const datas = datasDe(parseCalendarDate("2026-09-01"), [2], 0);

    assert.ok(!datas.includes("2026-09-01"));
    assert.deepEqual(datas, ["2026-09-08", "2026-09-15", "2026-09-22", "2026-09-29"]);
  });

  it("para no fim do mês de origem quando monthsAhead é zero", () => {
    const datas = datasDe(parseCalendarDate("2026-09-01"), [2], 0);

    assert.ok(datas.every((d) => d.startsWith("2026-09")));
  });

  it("avança meses inteiros, não trinta dias", () => {
    const datas = datasDe(parseCalendarDate("2026-09-01"), [2], 1);

    assert.equal(datas.at(-1), "2026-10-27");
    assert.ok(datas.includes("2026-10-06"));
  });

  it("aceita vários dias da semana de uma vez", () => {
    // Segunda (1) e sexta (5), a partir de uma terça.
    const datas = datasDe(parseCalendarDate("2026-09-01"), [1, 5], 0);

    assert.deepEqual(datas, [
      "2026-09-04",
      "2026-09-07",
      "2026-09-11",
      "2026-09-14",
      "2026-09-18",
      "2026-09-21",
      "2026-09-25",
      "2026-09-28",
    ]);
  });

  it("atravessa a virada de ano", () => {
    const datas = datasDe(parseCalendarDate("2026-12-01"), [2], 1);

    assert.ok(datas.some((d) => d.startsWith("2027-01")));
    assert.equal(datas.at(-1), "2027-01-26");
  });

  it("acerta fevereiro, inclusive em ano bissexto", () => {
    const comum = datasDe(parseCalendarDate("2026-02-01"), [0], 0);
    const bissexto = datasDe(parseCalendarDate("2028-02-01"), [2], 0);

    assert.ok(comum.every((d) => d <= "2026-02-28"));
    assert.ok(bissexto.includes("2028-02-29"));
  });

  it("devolve lista vazia quando nenhum dia da semana foi escolhido", () => {
    assert.deepEqual(datasDe(parseCalendarDate("2026-09-01"), [], 3), []);
  });

  it("devolve só datas que caem nos dias pedidos", () => {
    const datas = duplicationDates(parseCalendarDate("2026-09-01"), [0, 6], 2);

    for (const data of datas) {
      assert.ok(
        [0, 6].includes(data.getUTCDay()),
        `${toDateInputValue(data)} não é fim de semana`,
      );
    }
  });

  it("mantém as datas em ordem crescente", () => {
    const datas = datasDe(parseCalendarDate("2026-09-01"), [1, 3, 5], 2);

    assert.deepEqual(datas, [...datas].sort());
  });

  it("toda data sai ancorada à meia-noite UTC", () => {
    for (const data of duplicationDates(parseCalendarDate("2026-09-01"), [2], 1)) {
      assert.equal(data.getUTCHours(), 0);
      assert.equal(data.getUTCMinutes(), 0);
    }
  });
});

describe("coberturaAte", () => {
  it("avança os meses de cobertura configurados", () => {
    const ate = coberturaAte(parseCalendarDate("2026-09-05"));

    assert.equal(ate.getUTCMonth() + 1, 9 + MESES_DE_COBERTURA);
    assert.equal(toDateInputValue(ate), "2026-12-05");
  });

  it("atravessa a virada de ano", () => {
    const ate = coberturaAte(parseCalendarDate("2026-11-20"));

    assert.equal(toDateInputValue(ate), "2027-02-20");
  });

  /**
   * 31 de dezembro mais três meses não é 31 de março no `Date.UTC` — 31 de
   * fevereiro não existe. O importante é que a data continue válida e à
   * frente, não que caia no mesmo dia do mês.
   */
  it("produz data válida mesmo partindo do dia 31", () => {
    const ate = coberturaAte(parseCalendarDate("2026-12-31"));

    assert.ok(!Number.isNaN(ate.getTime()));
    assert.ok(ate > parseCalendarDate("2026-12-31"));
  });
});

describe("describeWeekdays", () => {
  it("ordena os dias, mesmo recebendo fora de ordem", () => {
    assert.equal(describeWeekdays([5, 1, 3]), "seg, qua, sex");
  });

  it("usa domingo como zero, igual ao calendário", () => {
    assert.equal(describeWeekdays([0]), "dom");
    assert.equal(describeWeekdays([6]), "sáb");
  });

  it("não quebra com lista vazia", () => {
    assert.equal(describeWeekdays([]), "");
  });
});
