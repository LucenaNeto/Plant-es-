/**
 * Reproduz o bug do plantão duplicado ao marcar "repetir", e confirma o
 * conserto.
 *
 * **Escreve no banco**, mas só em registros que ele mesmo cria: um usuário
 * descartável, uma unidade e os plantões da série. Tudo é apagado no `finally`,
 * e o script confere a limpeza antes de sair — a limpeza automática já falhou
 * em silêncio uma vez neste projeto (ver docs/BACKUP.md).
 *
 *   npx tsx scripts/verificar/recorrencia-duplicada.mts
 */
import { prisma } from "../../lib/db/prisma.js";
import {
  toDateInputValue,
  todayAsCalendarDate,
} from "../../lib/dates/calendar-date.js";
import { createShift } from "../../server/services/shifts.js";
import {
  createRuleFromShift,
  generateShifts,
} from "../../server/services/recurring-rules.js";

const MARCA = `verificacao-${Date.now()}@descartavel.invalid`;

let userId: string | null = null;
let falhas = 0;

function conferir(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) {
    console.log(`  ok    ${nome}`);
  } else {
    falhas += 1;
    console.log(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  }
}

/** A próxima ocorrência de um dia da semana, a partir de hoje. */
function proximoDiaDaSemana(weekday: number) {
  const hoje = todayAsCalendarDate();
  const delta = (weekday - hoje.getUTCDay() + 7) % 7;

  return new Date(hoje.getTime() + delta * 86400000);
}

try {
  const user = await prisma.user.create({
    data: {
      email: MARCA,
      name: "Verificação descartável",
      passwordHash: "nao-e-um-hash-valido-de-proposito",
      profession: "medico",
    },
  });
  userId = user.id;

  const unit = await prisma.unit.create({
    data: { city: "Teste", name: "Unidade descartável", type: "hospital", userId },
  });

  // Uma terça-feira à frente, como no caso relatado.
  const semente = proximoDiaDaSemana(2);
  const shiftDate = toDateInputValue(semente);

  console.log(`Semente em ${shiftDate} (terça), repetindo toda terça.\n`);

  const payload = {
    category: "green" as const,
    confirmOverlap: true,
    endTime: "08:00",
    notes: null,
    paymentStatus: "predicted" as const,
    shiftDate,
    shiftType: "fixed" as const,
    startTime: "08:00",
    unitId: unit.id,
    value: 1800,
  };

  const criado = await createShift(userId, payload);

  if (!criado?.ok) {
    throw new Error("não consegui criar o plantão semente");
  }

  const rule = await createRuleFromShift(userId, payload, [2], criado.shift.id);

  if (!rule) {
    throw new Error("não consegui criar a regra");
  }

  const gerados = await generateShifts(userId, rule.id);

  const noDia = await prisma.shift.count({
    where: { shiftDate: semente, userId },
  });

  console.log(`Gerados ${gerados?.created ?? 0} plantões pela regra.\n`);

  conferir(
    "o dia da semente tem exatamente um plantão",
    noDia === 1,
    `tem ${noDia}`,
  );

  const sementeAtualizada = await prisma.shift.findUniqueOrThrow({
    select: { recurringRuleId: true },
    where: { id: criado.shift.id },
  });

  conferir(
    "o plantão semente ficou vinculado à regra",
    sementeAtualizada.recurringRuleId === rule.id,
  );

  // A série inteira: uma ocorrência por terça, sem repetida.
  const daSerie = await prisma.shift.findMany({
    select: { shiftDate: true },
    where: { recurringRuleId: rule.id, userId },
  });

  const datas = daSerie.map((s) => toDateInputValue(s.shiftDate));
  const unicas = new Set(datas);

  conferir(
    "nenhuma data repetida na série inteira",
    datas.length === unicas.size,
    `${datas.length} plantões em ${unicas.size} datas`,
  );

  conferir(
    "todas as ocorrências caem numa terça",
    daSerie.every((s) => s.shiftDate.getUTCDay() === 2),
  );

  // Gerar de novo não pode criar nada: a idempotência é o que protege de
  // duplicata quando a rotina roda mais de uma vez.
  const segunda = await generateShifts(userId, rule.id);
  const depois = await prisma.shift.count({ where: { recurringRuleId: rule.id, userId } });

  conferir(
    "gerar de novo não cria nada",
    segunda?.created === 0 && depois === daSerie.length,
    `criou ${segunda?.created}, total ${depois}`,
  );

  /**
   * O caminho antigo, reproduzido de propósito: criar a regra **sem** vincular
   * o semente é exatamente o que o código fazia. Se isto parar de duplicar, o
   * bug deixou de existir por outro motivo e este teste virou decorativo —
   * melhor descobrir aqui do que confiar num teste que não testa nada.
   */
  console.log("\nReproduzindo o comportamento antigo, para confirmar o bug:");

  // Quinta-feira, não terça: a série de cima já cobre todas as terças, e
  // contar num dia que ela toca misturaria os dois efeitos.
  const quinta = proximoDiaDaSemana(4);
  const avulso = await createShift(userId, {
    ...payload,
    shiftDate: toDateInputValue(quinta),
  });

  if (!avulso?.ok) {
    throw new Error("não consegui criar o plantão avulso");
  }

  const regraSemVinculo = await prisma.recurringRule.create({
    data: {
      defaultCategory: "green",
      defaultShiftType: "fixed",
      defaultValue: 1800,
      endTime: "08:00",
      startTime: "08:00",
      unitId: unit.id,
      userId,
      weekdays: [4],
    },
  });

  await generateShifts(userId, regraSemVinculo.id);

  const noDiaDoAvulso = await prisma.shift.count({
    where: { shiftDate: quinta, unitId: unit.id, userId },
  });

  conferir(
    "sem o vínculo, o dia do semente fica com dois plantões (o bug)",
    noDiaDoAvulso === 2,
    `tem ${noDiaDoAvulso}`,
  );

  console.log(
    falhas === 0
      ? "\nO conserto funciona, e o bug era real."
      : `\n${falhas} verificação(ões) falharam.`,
  );
  process.exitCode = falhas === 0 ? 0 : 1;
} finally {
  if (userId) {
    // Ordem inversa das dependências. `onDelete: Cascade` no User cobriria,
    // mas apagar explicitamente deixa o erro visível se algo ficar preso.
    await prisma.expense.deleteMany({ where: { userId } });
    await prisma.shift.deleteMany({ where: { userId } });
    await prisma.recurringRule.deleteMany({ where: { userId } });
    await prisma.unit.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });

    const sobrou =
      (await prisma.shift.count({ where: { userId } })) +
      (await prisma.unit.count({ where: { userId } })) +
      (await prisma.user.count({ where: { id: userId } }));

    console.log(
      sobrou === 0
        ? "Limpeza confirmada: nada do usuário de teste ficou no banco."
        : `ATENÇÃO: sobraram ${sobrou} registro(s) do usuário ${userId}.`,
    );
  }

  await prisma.$disconnect();
}
