import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expensePayloadSchema } from "@/lib/validators/expenses";
import {
  duplicationSchema,
  handoffSchema,
  recurrenceSchema,
  shiftFiltersSchema,
  shiftPayloadSchema,
} from "@/lib/validators/shifts";

/**
 * Validação de entrada.
 *
 * O que entra pelo formulário chega como `FormData`: tudo é string, checkbox
 * não marcado simplesmente não vem, e `<select>` vazio manda `""`. Cada teste
 * aqui corresponde a uma dessas armadilhas — a maioria já produziu bug.
 */

const plantaoValido = {
  category: "green",
  endTime: "19:00",
  paymentStatus: "predicted",
  shiftDate: "2026-09-05",
  shiftType: "fixed",
  startTime: "07:00",
  unitId: "unit-1",
  value: "1200",
};

describe("shiftPayloadSchema", () => {
  it("aceita um plantão bem formado e converte o valor para número", () => {
    const resultado = shiftPayloadSchema.safeParse(plantaoValido);

    assert.ok(resultado.success);
    assert.equal(resultado.data.value, 1200);
    assert.equal(typeof resultado.data.value, "number");
  });

  it("aceita valor zero: repasse pode ser sem remuneração", () => {
    const resultado = shiftPayloadSchema.safeParse({
      ...plantaoValido,
      value: "0",
    });

    assert.ok(resultado.success);
    assert.equal(resultado.data.value, 0);
  });

  it("recusa valor negativo", () => {
    assert.equal(
      shiftPayloadSchema.safeParse({ ...plantaoValido, value: "-1" }).success,
      false,
    );
  });

  /**
   * Checkbox não marcado não é enviado pelo navegador. Se ausência virasse
   * erro, o formulário ficaria impossível de enviar sem marcar a caixa.
   */
  it("trata checkbox ausente como false", () => {
    const resultado = shiftPayloadSchema.safeParse(plantaoValido);

    assert.ok(resultado.success);
    assert.equal(resultado.data.confirmOverlap, false);
  });

  it("entende as formas que um checkbox marcado assume", () => {
    for (const marcado of ["on", "true", true]) {
      const resultado = shiftPayloadSchema.safeParse({
        ...plantaoValido,
        confirmOverlap: marcado,
      });

      assert.ok(resultado.success);
      assert.equal(resultado.data.confirmOverlap, true);
    }
  });

  it("recusa horário fora do formato HH:MM", () => {
    for (const ruim of ["7:00", "24:00", "07:60", "0700", ""]) {
      assert.equal(
        shiftPayloadSchema.safeParse({ ...plantaoValido, startTime: ruim })
          .success,
        false,
        `aceitou ${ruim}`,
      );
    }
  });

  /**
   * Formato certo, dia inexistente. Sem a checagem de calendário, o `Date` do
   * JavaScript transbordava em silêncio e o plantão era gravado em 1º de
   * março.
   */
  it("recusa 29 de fevereiro em ano comum", () => {
    const resultado = shiftPayloadSchema.safeParse({
      ...plantaoValido,
      shiftDate: "2026-02-29",
    });

    assert.equal(resultado.success, false);
  });

  it("aceita 29 de fevereiro em ano bissexto", () => {
    assert.ok(
      shiftPayloadSchema.safeParse({
        ...plantaoValido,
        shiftDate: "2028-02-29",
      }).success,
    );
  });

  it("recusa 31 de abril", () => {
    assert.equal(
      shiftPayloadSchema.safeParse({
        ...plantaoValido,
        shiftDate: "2026-04-31",
      }).success,
      false,
    );
  });

  it("exige a unidade: sem ela o plantão não tem dono", () => {
    assert.equal(
      shiftPayloadSchema.safeParse({ ...plantaoValido, unitId: "  " }).success,
      false,
    );
  });

  it("transforma observação vazia em null, não em string vazia", () => {
    const resultado = shiftPayloadSchema.safeParse({
      ...plantaoValido,
      notes: "   ",
    });

    assert.ok(resultado.success);
    assert.equal(resultado.data.notes, null);
  });
});

/**
 * A armadilha do Zod que já custou um bug: `.partial()` torna os campos
 * opcionais mas **não** remove o `.default()`. Um schema parcial com default
 * continua injetando o valor padrão quando o campo está ausente — numa
 * atualização, isso sobrescreve o que estava gravado.
 */
describe("partial não apaga default", () => {
  it("o default sobrevive ao .partial(), e por isso o update não usa partial cru", () => {
    const parcial = shiftPayloadSchema.partial();
    const resultado = parcial.safeParse({ value: "500" });

    assert.ok(resultado.success);
    // Se algum dia isto virar `undefined`, o Zod mudou de comportamento e a
    // ressalva pode sair do código.
    assert.equal(
      resultado.data.confirmOverlap,
      false,
      "o Zod parou de manter o default no partial — reveja os updates",
    );
  });
});

describe("shiftFiltersSchema", () => {
  it("converte mês e ano da query string para número", () => {
    const resultado = shiftFiltersSchema.safeParse({
      month: "9",
      year: "2026",
    });

    assert.ok(resultado.success);
    assert.equal(resultado.data.month, 9);
    assert.equal(resultado.data.year, 2026);
  });

  it("recusa mês fora de 1-12", () => {
    for (const mes of ["0", "13", "-1"]) {
      assert.equal(
        shiftFiltersSchema.safeParse({ month: mes, year: "2026" }).success,
        false,
      );
    }
  });

  it("recusa ano fora da faixa plausível", () => {
    for (const ano of ["1999", "2101"]) {
      assert.equal(
        shiftFiltersSchema.safeParse({ month: "9", year: ano }).success,
        false,
      );
    }
  });
});

describe("recurrenceSchema", () => {
  it("aceita um único dia que o FormData entrega fora de array", () => {
    const resultado = recurrenceSchema.safeParse({
      repeatWeekdays: "2",
      repeatWeekly: "on",
    });

    assert.ok(resultado.success);
    assert.deepEqual(resultado.data.repeatWeekdays, [2]);
  });

  it("aceita vários dias", () => {
    const resultado = recurrenceSchema.safeParse({
      repeatWeekdays: ["0", "3", "6"],
      repeatWeekly: "on",
    });

    assert.ok(resultado.success);
    assert.deepEqual(resultado.data.repeatWeekdays, [0, 3, 6]);
  });

  it("trata ausência como lista vazia", () => {
    const resultado = recurrenceSchema.safeParse({});

    assert.ok(resultado.success);
    assert.deepEqual(resultado.data.repeatWeekdays, []);
    assert.equal(resultado.data.repeatWeekly, false);
  });

  it("recusa dia da semana fora de 0-6", () => {
    assert.equal(
      recurrenceSchema.safeParse({ repeatWeekdays: ["7"] }).success,
      false,
    );
  });
});

describe("duplicationSchema", () => {
  it("exige ao menos um dia da semana", () => {
    assert.equal(duplicationSchema.safeParse({ weekdays: [] }).success, false);
  });

  it("assume zero meses à frente quando nada é informado", () => {
    const resultado = duplicationSchema.safeParse({ weekdays: ["1"] });

    assert.ok(resultado.success);
    assert.equal(resultado.data.monthsAhead, 0);
  });

  it("limita o horizonte a doze meses", () => {
    assert.equal(
      duplicationSchema.safeParse({ monthsAhead: "13", weekdays: ["1"] })
        .success,
      false,
    );
  });
});

describe("handoffSchema", () => {
  it("nome vazio desfaz o repasse", () => {
    const resultado = handoffSchema.safeParse({ handoffTo: "   " });

    assert.ok(resultado.success);
    assert.equal(resultado.data.handoffTo, null);
  });

  it("guarda o nome sem espaço em volta", () => {
    const resultado = handoffSchema.safeParse({ handoffTo: "  Dra. Ana  " });

    assert.ok(resultado.success);
    assert.equal(resultado.data.handoffTo, "Dra. Ana");
  });

  it("recusa nome absurdamente longo", () => {
    assert.equal(
      handoffSchema.safeParse({ handoffTo: "x".repeat(121) }).success,
      false,
    );
  });
});

describe("expensePayloadSchema", () => {
  const gastoValido = {
    amount: "150.50",
    category: "fuel",
    description: "Combustível",
    expenseDate: "2026-09-05",
  };

  it("aceita um gasto bem formado", () => {
    const resultado = expensePayloadSchema.safeParse(gastoValido);

    assert.ok(resultado.success);
    assert.equal(resultado.data.amount, 150.5);
  });

  /**
   * `<select>` sem escolha manda string vazia. Sem o preprocess, ela viraria
   * um id de unidade literalmente vazio e o vínculo apontaria para lugar
   * nenhum.
   */
  it("trata select vazio como ausência de vínculo", () => {
    const resultado = expensePayloadSchema.safeParse({
      ...gastoValido,
      shiftId: "",
      unitId: "",
    });

    assert.ok(resultado.success);
    assert.equal(resultado.data.unitId, undefined);
    assert.equal(resultado.data.shiftId, undefined);
  });

  it("recusa data que não existe no calendário", () => {
    assert.equal(
      expensePayloadSchema.safeParse({
        ...gastoValido,
        expenseDate: "2026-02-30",
      }).success,
      false,
    );
  });
});
