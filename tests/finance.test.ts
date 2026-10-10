import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import { aggregateFinance } from "@/server/services/finance";

/**
 * Consolidação financeira do mês.
 *
 * Este é o número em que o usuário confia para decidir se cobra alguém, então
 * o que os testes guardam aqui são identidades contábeis — relações que têm
 * que valer sempre, não exemplos que calharam de bater:
 *
 *   bruto            = previsto + pendente + recebido
 *   gastos           = atribuídos a unidade + gerais
 *   líquido recebido = recebido − gastos
 *   líquido previsto = bruto − gastos
 *
 * E uma regra de produto: plantão repassado sai da receita inteira e aparece
 * à parte, porque o dinheiro é de quem assumiu o plantão.
 */

const dec = (valor: number) => new Prisma.Decimal(valor);

type Shifts = Parameters<typeof aggregateFinance>[0];
type Expenses = Parameters<typeof aggregateFinance>[1];

function plantao(partes: Partial<Shifts[number]> = {}): Shifts[number] {
  return {
    handoffTo: null,
    hours: dec(12),
    paymentStatus: "predicted",
    unit: { name: "Hospital Central" },
    unitId: "unit-1",
    value: dec(1000),
    ...partes,
  } as Shifts[number];
}

function gasto(partes: Partial<Expenses[number]> = {}): Expenses[number] {
  return {
    amount: dec(100),
    category: "fuel",
    unit: null,
    unitId: null,
    ...partes,
  } as Expenses[number];
}

describe("identidades contábeis", () => {
  const plantoes = [
    plantao({ paymentStatus: "predicted", value: dec(1000) }),
    plantao({ paymentStatus: "pending", value: dec(2000) }),
    plantao({ paymentStatus: "received", value: dec(3000) }),
    plantao({
      paymentStatus: "received",
      unit: { name: "UPA Norte" },
      unitId: "unit-2",
      value: dec(1500),
    }),
  ];

  const gastos = [
    gasto({ amount: dec(300), unit: { name: "Hospital Central" }, unitId: "unit-1" }),
    gasto({ amount: dec(200), category: "food" }),
  ];

  it("bruto = previsto + pendente + recebido", () => {
    const f = aggregateFinance(plantoes, gastos);

    assert.equal(f.gross, f.predicted + f.pending + f.received);
    assert.equal(f.gross, 7500);
  });

  it("gastos = atribuídos a unidade + gerais", () => {
    const f = aggregateFinance(plantoes, gastos);
    const atribuidos = f.byUnit.reduce((soma, u) => soma + u.expenses, 0);

    assert.equal(f.expenses, atribuidos + f.generalExpenses);
    assert.equal(f.generalExpenses, 200);
  });

  it("líquido recebido = recebido − gastos", () => {
    const f = aggregateFinance(plantoes, gastos);

    assert.equal(f.netReceived, f.received - f.expenses);
  });

  it("líquido previsto = bruto − gastos", () => {
    const f = aggregateFinance(plantoes, gastos);

    assert.equal(f.netProjected, f.gross - f.expenses);
  });

  it("o bruto por unidade soma o bruto do mês", () => {
    const f = aggregateFinance(plantoes, gastos);
    const soma = f.byUnit.reduce((total, u) => total + u.gross, 0);

    assert.equal(soma, f.gross);
  });
});

describe("repasse", () => {
  it("tira o plantão repassado da receita e o mostra à parte", () => {
    const f = aggregateFinance(
      [
        plantao({ paymentStatus: "received", value: dec(1000) }),
        plantao({
          handoffTo: "Dra. Ana",
          paymentStatus: "received",
          value: dec(5000),
        }),
      ],
      [],
    );

    assert.equal(f.received, 1000);
    assert.equal(f.gross, 1000);
    assert.equal(f.shiftCount, 1);
    assert.equal(f.handedOff, 5000);
    assert.equal(f.handedOffCount, 1);
  });

  it("não soma as horas do repassado: elas foram de outra pessoa", () => {
    const f = aggregateFinance(
      [
        plantao({ hours: dec(12) }),
        plantao({ handoffTo: "Dr. Beto", hours: dec(24) }),
      ],
      [],
    );

    assert.equal(f.hours, 12);
  });

  it("mantém a unidade visível mesmo quando só teve repasse", () => {
    const f = aggregateFinance(
      [plantao({ handoffTo: "Dra. Ana", value: dec(5000) })],
      [],
    );

    assert.equal(f.byUnit.length, 1);
    assert.equal(f.byUnit[0].handedOff, 5000);
    assert.equal(f.byUnit[0].gross, 0);
  });
});

describe("gasto de unidade sem plantão no mês", () => {
  /**
   * O bug que isto tranca: `byUnit` era montado só a partir dos plantões,
   * então o gasto de uma unidade sem plantão naquele mês não aparecia em
   * lugar nenhum — não era atribuído (a unidade não estava na lista) nem
   * geral (tinha `unitId`). O total de "gastos gerais" saía inflado e a
   * identidade quebrava em silêncio.
   */
  it("inclui a unidade no agrupamento e não infla os gastos gerais", () => {
    const f = aggregateFinance(
      [plantao({ unitId: "unit-1", value: dec(1000) })],
      [
        gasto({
          amount: dec(400),
          unit: { name: "UPA Norte" },
          unitId: "unit-2",
        }),
      ],
    );

    const upa = f.byUnit.find((u) => u.unitId === "unit-2");

    assert.ok(upa, "a unidade com gasto e sem plantão sumiu do agrupamento");
    assert.equal(upa.expenses, 400);
    assert.equal(f.generalExpenses, 0);
    assert.equal(
      f.expenses,
      f.byUnit.reduce((soma, u) => soma + u.expenses, 0) + f.generalExpenses,
    );
  });

  it("nomeia a unidade apagada em vez de deixar o gasto sem dono", () => {
    const f = aggregateFinance(
      [],
      [gasto({ amount: dec(50), unit: null, unitId: "unit-sumida" })],
    );

    assert.equal(f.byUnit[0].unitName, "Unidade removida");
  });
});

describe("mês vazio", () => {
  it("devolve zeros, não NaN", () => {
    const f = aggregateFinance([], []);

    for (const campo of [
      "expenses",
      "generalExpenses",
      "gross",
      "handedOff",
      "hours",
      "netProjected",
      "netReceived",
      "pending",
      "predicted",
      "received",
    ] as const) {
      assert.equal(f[campo], 0, `${campo} não zerou`);
    }

    assert.deepEqual(f.byUnit, []);
    assert.deepEqual(f.byCategory, []);
  });
});

describe("ordenação", () => {
  it("põe a unidade de maior bruto primeiro", () => {
    const f = aggregateFinance(
      [
        plantao({ unitId: "pequena", unit: { name: "Pequena" }, value: dec(100) }),
        plantao({ unitId: "grande", unit: { name: "Grande" }, value: dec(9000) }),
      ],
      [],
    );

    assert.equal(f.byUnit[0].unitName, "Grande");
  });

  it("põe a maior categoria de gasto primeiro", () => {
    const f = aggregateFinance(
      [],
      [
        gasto({ amount: dec(10), category: "food" }),
        gasto({ amount: dec(900), category: "fuel" }),
      ],
    );

    assert.equal(f.byCategory[0].category, "fuel");
  });
});

describe("centavos", () => {
  it("não deixa o ponto flutuante vazar para o total", () => {
    const f = aggregateFinance(
      [
        plantao({ value: dec(0.1) }),
        plantao({ value: dec(0.2) }),
      ],
      [],
    );

    assert.equal(f.gross, 0.3);
  });
});
