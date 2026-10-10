import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterByPaymentStatus,
  summarizeSerializedShifts,
} from "@/server/services/shifts";
import type { SerializedShift } from "@/lib/shifts/serializer";

/**
 * Totais do mês na tela de plantões.
 *
 * O que estes testes protegem é uma identidade contábil e uma regra de
 * produto. A identidade: o total tem que ser a soma exata de previsto,
 * pendente e recebido. A regra: plantão repassado sai dos totais e vai para
 * `handedOff`, porque o dinheiro é de quem assumiu. Se as duas coisas
 * divergirem, o usuário vê números diferentes para o mesmo mês em telas
 * vizinhas e não sabe em qual acreditar.
 */

let proximoId = 0;

function plantao(partes: Partial<SerializedShift> = {}): SerializedShift {
  proximoId += 1;

  return {
    category: "green",
    dateLabel: "05 de set.",
    endTime: "19:00",
    fullDateLabel: "sábado, 5 de setembro de 2026",
    handoffTo: null,
    hours: 12,
    id: `shift-${proximoId}`,
    isHandedOff: false,
    isRecurring: false,
    notes: null,
    paymentStatus: "predicted",
    shiftDate: "2026-09-05",
    shiftType: "fixed",
    startTime: "07:00",
    unitId: "unit-1",
    unitName: "Hospital",
    value: 1000,
    ...partes,
  };
}

describe("summarizeSerializedShifts", () => {
  it("devolve tudo zerado para um mês sem plantão", () => {
    const resumo = summarizeSerializedShifts([]);

    for (const chave of [
      "handedOff",
      "pending",
      "predicted",
      "received",
      "total",
    ] as const) {
      assert.deepEqual(resumo[chave], { count: 0, hours: 0, value: 0 });
    }
  });

  it("separa os plantões por situação de pagamento", () => {
    const resumo = summarizeSerializedShifts([
      plantao({ paymentStatus: "predicted", value: 1000 }),
      plantao({ paymentStatus: "pending", value: 2000 }),
      plantao({ paymentStatus: "received", value: 3000 }),
    ]);

    assert.equal(resumo.predicted.value, 1000);
    assert.equal(resumo.pending.value, 2000);
    assert.equal(resumo.received.value, 3000);
    assert.equal(resumo.total.value, 6000);
    assert.equal(resumo.total.count, 3);
  });

  it("mantém a identidade total = previsto + pendente + recebido", () => {
    const resumo = summarizeSerializedShifts([
      plantao({ paymentStatus: "predicted", value: 1234.56 }),
      plantao({ paymentStatus: "predicted", value: 10.01 }),
      plantao({ paymentStatus: "pending", value: 999.99 }),
      plantao({ paymentStatus: "received", value: 0.03 }),
    ]);

    assert.equal(
      resumo.total.value,
      Math.round(
        (resumo.predicted.value + resumo.pending.value + resumo.received.value) *
          100,
      ) / 100,
    );
  });

  it("tira o plantão repassado dos totais e o põe em handedOff", () => {
    const resumo = summarizeSerializedShifts([
      plantao({ paymentStatus: "received", value: 1000 }),
      plantao({
        handoffTo: "Dra. Ana",
        isHandedOff: true,
        paymentStatus: "received",
        value: 5000,
      }),
    ]);

    assert.equal(resumo.received.value, 1000);
    assert.equal(resumo.total.value, 1000);
    assert.equal(resumo.total.count, 1);
    assert.equal(resumo.handedOff.value, 5000);
    assert.equal(resumo.handedOff.count, 1);
  });

  it("não conta as horas do plantão repassado: elas foram de outra pessoa", () => {
    const resumo = summarizeSerializedShifts([
      plantao({ hours: 12 }),
      plantao({ handoffTo: "Dr. Beto", hours: 24, isHandedOff: true }),
    ]);

    assert.equal(resumo.total.hours, 12);
    assert.equal(resumo.handedOff.hours, 24);
  });

  it("arredonda centavos uma vez no fim, não a cada soma", () => {
    // Três décimos somados em ponto flutuante dariam 0.30000000000000004.
    const resumo = summarizeSerializedShifts([
      plantao({ value: 0.1 }),
      plantao({ value: 0.1 }),
      plantao({ value: 0.1 }),
    ]);

    assert.equal(resumo.total.value, 0.3);
  });
});

describe("filterByPaymentStatus", () => {
  const mes = [
    plantao({ paymentStatus: "predicted" }),
    plantao({ paymentStatus: "pending" }),
    plantao({ paymentStatus: "received" }),
    plantao({ paymentStatus: "received" }),
  ];

  it("sem filtro, devolve o mês inteiro sem copiar nada", () => {
    assert.equal(filterByPaymentStatus(mes, undefined), mes);
  });

  it("filtra pela situação pedida", () => {
    assert.equal(filterByPaymentStatus(mes, "received").length, 2);
    assert.equal(filterByPaymentStatus(mes, "pending").length, 1);
  });

  /**
   * É isto que permite buscar o mês uma vez só e servir lista e totais: os
   * totais somam o mês inteiro, a lista é o mesmo conjunto peneirado. Se a
   * peneira mexesse na ordem ou nos objetos, a tela mostraria coisa diferente
   * do que o resumo contou.
   */
  it("preserva a ordem e as referências originais", () => {
    const recebidos = filterByPaymentStatus(mes, "received");

    assert.equal(recebidos[0], mes[2]);
    assert.equal(recebidos[1], mes[3]);
  });
});
