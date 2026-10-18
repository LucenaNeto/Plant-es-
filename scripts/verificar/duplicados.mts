/** Procura plantoes duplicados deixados pelo bug da recorrencia. So leitura. */
import { prisma } from "../../lib/db/prisma.js";

try {
  const dups = await prisma.$queryRaw<
    {
      shiftDate: Date;
      unitName: string;
      startTime: string;
      endTime: string;
      quantas: bigint;
      comRegra: bigint;
      valor: number;
    }[]
  >`SELECT s."shiftDate", u."name" AS "unitName", s."startTime", s."endTime",
           COUNT(*) AS quantas,
           COUNT(s."recurringRuleId") AS "comRegra",
           MAX(s."value")::float AS valor
    FROM "Shift" s JOIN "Unit" u ON u.id = s."unitId"
    GROUP BY 1,2,3,4
    HAVING COUNT(*) > 1
    ORDER BY 1`;

  if (dups.length === 0) {
    console.log("Nenhum plantao duplicado no banco.");
  } else {
    const total = dups.reduce((n, d) => n + Number(d.quantas) - 1, 0);
    console.log(`${dups.length} dia(s) com plantao repetido · ${total} plantao(oes) a mais:\n`);

    for (const d of dups) {
      console.log(
        `  ${d.shiftDate.toISOString().slice(0, 10)}  ${String(d.quantas)}x  ` +
          `${d.unitName}  ${d.startTime}-${d.endTime}  ` +
          `R$ ${d.valor.toLocaleString("pt-BR")}  ` +
          `(${d.comRegra} com regra)`,
      );
    }

    const soma = dups.reduce((n, d) => n + (Number(d.quantas) - 1) * d.valor, 0);
    console.log(`\nValor inflado pelos duplicados: R$ ${soma.toLocaleString("pt-BR")}`);
  }
} finally {
  await prisma.$disconnect();
}
