import type { ExpenseCategory, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { monthRange } from "@/lib/dates/calendar-date";

/**
 * Consolidação financeira do mês.
 *
 * **O que "líquido" significa aqui.** A palavra é ambígua e vale fixar o
 * sentido num lugar só, porque é o número em que o usuário vai confiar para
 * tomar decisão. Publicamos dois, cada um respondendo a uma pergunta diferente:
 *
 * - `netReceived` = recebido − gastos. **Dinheiro que já entrou**, descontado o
 *   que já saiu. É o caixa real do mês.
 * - `netProjected` = bruto − gastos. **O que o mês deve fechar** se tudo que
 *   está previsto e pendente for pago.
 *
 * **Repasse.** Plantão com `handoffTo` preenchido foi passado a outra pessoa: o
 * valor sai de previsto/pendente/recebido e passa a somar em `handedOff`,
 * exibido à parte. Some da receita porque o dinheiro não é seu; continua
 * visível porque saber quanto você passou adiante é informação, não ruído.
 *
 * **Duas consultas, não seis.** A versão anterior fazia seis `groupBy` — e com
 * `connection_limit=1` (ver CLAUDE.md) consultas não paralelizam, então cada
 * uma custava uma ida ao banco inteira. Aqui buscamos as linhas do mês uma vez
 * e agregamos em JavaScript. A troca se sustenta na escala real do domínio: uma
 * pessoa faz no máximo ~30 plantões e algumas dezenas de gastos por mês, então
 * trafegar essas linhas é mais barato que seis viagens de rede. Se algum dia
 * um usuário passar de alguns milhares de registros por mês, vale reverter
 * para agregação no banco.
 */

export type UnitPerformance = {
  expenses: number;
  gross: number;
  handedOff: number;
  hours: number;
  /** `gross − expenses`. Não inclui gasto geral, que não é atribuível. */
  net: number;
  received: number;
  shiftCount: number;
  unitId: string;
  unitName: string;
};

type UnitAcumulador = UnitPerformance;

function unidadeVazia(unitId: string, unitName: string): UnitAcumulador {
  return {
    expenses: 0,
    gross: 0,
    handedOff: 0,
    hours: 0,
    net: 0,
    received: 0,
    shiftCount: 0,
    unitId,
    unitName,
  };
}

/** Arredonda para centavos, evitando o lixo de ponto flutuante nas somas. */
function centavos(valor: number) {
  return Math.round(valor * 100) / 100;
}

export async function getMonthlyFinance(
  userId: string,
  year: number,
  month: number,
) {
  const { start, end } = monthRange(year, month);

  /**
   * `$transaction` em vez de `Promise.all`: agrupa as duas consultas numa ida
   * só ao banco. Com o pooler em transaction mode cada consulta carrega um
   * custo fixo alto (medido: 256ms contra 57ms em session mode), e agrupar
   * derruba pela metade o tempo de tela. Em session mode não atrapalha.
   */
  const [shifts, expenses] = await prisma.$transaction([
    prisma.shift.findMany({
      select: {
        handoffTo: true,
        hours: true,
        paymentStatus: true,
        unit: { select: { name: true } },
        unitId: true,
        value: true,
      },
      where: { shiftDate: { gte: start, lt: end }, userId },
    }),
    prisma.expense.findMany({
      select: {
        amount: true,
        category: true,
        unit: { select: { name: true } },
        unitId: true,
      },
      where: { expenseDate: { gte: start, lt: end }, userId },
    }),
  ]);

  const totals: Record<PaymentStatus, number> = {
    pending: 0,
    predicted: 0,
    received: 0,
  };

  const porUnidade = new Map<string, UnitAcumulador>();
  const porCategoria = new Map<ExpenseCategory, { amount: number; count: number }>();

  let gross = 0;
  let hours = 0;
  let shiftCount = 0;
  let handedOff = 0;
  let handedOffCount = 0;

  for (const shift of shifts) {
    const valor = shift.value.toNumber();
    const horas = shift.hours.toNumber();

    const unidade =
      porUnidade.get(shift.unitId) ??
      unidadeVazia(shift.unitId, shift.unit.name);
    porUnidade.set(shift.unitId, unidade);

    if (shift.handoffTo) {
      // Repassado: não é receita, mas conta como plantão trabalhado por outra
      // pessoa no lugar — as horas não são suas, então também não entram.
      handedOff += valor;
      handedOffCount += 1;
      unidade.handedOff += valor;
      continue;
    }

    gross += valor;
    hours += horas;
    shiftCount += 1;
    totals[shift.paymentStatus] += valor;

    unidade.gross += valor;
    unidade.hours += horas;
    unidade.shiftCount += 1;

    if (shift.paymentStatus === "received") {
      unidade.received += valor;
    }
  }

  let expensesTotal = 0;
  let attributedExpenses = 0;

  for (const expense of expenses) {
    const valor = expense.amount.toNumber();
    expensesTotal += valor;

    const categoria = porCategoria.get(expense.category) ?? { amount: 0, count: 0 };
    categoria.amount += valor;
    categoria.count += 1;
    porCategoria.set(expense.category, categoria);

    if (!expense.unitId) {
      continue;
    }

    /**
     * A unidade entra no mapa mesmo sem plantão no mês. A versão anterior
     * montava `byUnit` só a partir dos plantões, então o gasto de uma unidade
     * sem plantão naquele mês não aparecia em lugar nenhum: não era atribuído
     * (a unidade não estava na lista) nem geral (tinha `unitId`). O total de
     * "gastos gerais" saía inflado e a identidade contábil quebrava em
     * silêncio.
     */
    const unidade =
      porUnidade.get(expense.unitId) ??
      unidadeVazia(expense.unitId, expense.unit?.name ?? "Unidade removida");
    porUnidade.set(expense.unitId, unidade);

    unidade.expenses += valor;
    attributedExpenses += valor;
  }

  const byUnit = [...porUnidade.values()]
    .map((unidade) => ({
      ...unidade,
      expenses: centavos(unidade.expenses),
      gross: centavos(unidade.gross),
      handedOff: centavos(unidade.handedOff),
      hours: centavos(unidade.hours),
      net: centavos(unidade.gross - unidade.expenses),
      received: centavos(unidade.received),
    }))
    .sort((a, b) => b.gross - a.gross);

  const byCategory = [...porCategoria.entries()]
    .map(([category, dados]) => ({
      amount: centavos(dados.amount),
      category,
      count: dados.count,
    }))
    // Maior gasto primeiro: é o que o usuário procura ao abrir a tela.
    .sort((a, b) => b.amount - a.amount);

  return {
    byCategory,
    byUnit,
    expenseCount: expenses.length,
    expenses: centavos(expensesTotal),
    generalExpenses: centavos(expensesTotal - attributedExpenses),
    gross: centavos(gross),
    /** Total repassado a outras pessoas — fora da receita, visível à parte. */
    handedOff: centavos(handedOff),
    handedOffCount,
    hours: centavos(hours),
    netProjected: centavos(gross - expensesTotal),
    netReceived: centavos(totals.received - expensesTotal),
    pending: centavos(totals.pending),
    predicted: centavos(totals.predicted),
    received: centavos(totals.received),
    shiftCount,
    /** Ainda não pago: previsto + pendente. */
    toReceive: centavos(totals.predicted + totals.pending),
  };
}

export type MonthlyFinance = Awaited<ReturnType<typeof getMonthlyFinance>>;
