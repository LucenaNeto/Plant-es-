/**
 * Passo 4 — conferir que o destino é fiel à origem.
 *
 * Não basta contar linhas: uma contagem igual com ids diferentes quebraria as
 * relações e as sessões sem nenhum sinal. Aqui a comparação é registro a
 * registro, campo a campo, incluindo os hashes de senha (comparados como
 * string; nenhuma senha é lida ou conhecida).
 *
 * Só depois deste passo passar é que faz sentido trocar as variáveis na Vercel.
 *
 *   npx tsx scripts/migracao-regiao/3-verificar.mts
 */
import { PrismaClient } from "@prisma/client";

const ORIGEM = process.env.DATABASE_URL;
const DESTINO = process.env.NEW_DATABASE_URL;

if (!ORIGEM || !DESTINO) {
  console.error("Defina DATABASE_URL e NEW_DATABASE_URL no .env.");
  process.exit(1);
}

const origem = new PrismaClient({ datasourceUrl: ORIGEM });
const destino = new PrismaClient({ datasourceUrl: DESTINO });

let divergencias = 0;

/** Normaliza para comparação: Decimal e Date viram string estável. */
function normalizar(valor: unknown): unknown {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return valor.toISOString();
  if (Array.isArray(valor)) return valor.map(normalizar);
  if (typeof valor === "object" && "toFixed" in (valor as object)) {
    return String(valor); // Prisma.Decimal
  }
  return valor;
}

function comparar(
  tabela: string,
  a: Record<string, unknown>[],
  b: Record<string, unknown>[],
  /** Campos que legitimamente podem diferir (o Prisma reescreve `updatedAt`). */
  ignorar: string[] = [],
) {
  const porId = new Map(b.map((r) => [String(r.id), r]));
  let iguais = 0;

  for (const registroOrigem of a) {
    const registroDestino = porId.get(String(registroOrigem.id));

    if (!registroDestino) {
      divergencias++;
      console.log(`  FALTA  ${tabela} id=${registroOrigem.id} não existe no destino`);
      continue;
    }

    const camposDiferentes = Object.keys(registroOrigem).filter((campo) => {
      if (ignorar.includes(campo)) return false;
      return (
        JSON.stringify(normalizar(registroOrigem[campo])) !==
        JSON.stringify(normalizar(registroDestino[campo]))
      );
    });

    if (camposDiferentes.length > 0) {
      divergencias++;
      console.log(
        `  DIFERE ${tabela} id=${registroOrigem.id} campos: ${camposDiferentes.join(", ")}`,
      );
    } else {
      iguais++;
    }
  }

  const extras = b.length - a.length;
  if (extras !== 0) {
    divergencias++;
    console.log(`  SOBRA  ${tabela}: destino tem ${extras} registro(s) a mais`);
  }

  console.log(`  ${tabela.padEnd(16)} ${iguais}/${a.length} idênticos`);
}

try {
  console.log("Comparando origem e destino registro a registro...\n");

  const tabelas = [
    ["User", origem.user, destino.user],
    ["Unit", origem.unit, destino.unit],
    ["RecurringRule", origem.recurringRule, destino.recurringRule],
    ["Shift", origem.shift, destino.shift],
    ["Expense", origem.expense, destino.expense],
  ] as const;

  for (const [nome, tabelaOrigem, tabelaDestino] of tabelas) {
    const [a, b] = await Promise.all([
      // @ts-expect-error — os delegates têm o mesmo findMany, mas o união dos
      // tipos não colapsa; a chamada é idêntica em todos.
      tabelaOrigem.findMany({ orderBy: { id: "asc" } }),
      // @ts-expect-error — idem.
      tabelaDestino.findMany({ orderBy: { id: "asc" } }),
    ]);

    comparar(nome, a, b, ["updatedAt"]);
  }

  /**
   * As chaves estrangeiras do Postgres já impedem registro órfão — conferir
   * isso seria conferir o banco, não a migração. O que pode dar errado de
   * verdade é o id de um pai mudar: a relação passa a apontar para outra
   * unidade sem violar restrição nenhuma. Por isso a conferência é pelo nome
   * que a relação resolve dos dois lados.
   */
  console.log("\n=== as relações resolvem para os mesmos registros? ===");

  const [shiftsOrigem, shiftsDestino] = await Promise.all([
    origem.shift.findMany({
      include: { unit: { select: { name: true } } },
      orderBy: { id: "asc" },
    }),
    destino.shift.findMany({
      include: { unit: { select: { name: true } } },
      orderBy: { id: "asc" },
    }),
  ]);

  const unidadeNoDestino = new Map(
    shiftsDestino.map((plantao) => [plantao.id, plantao.unit.name]),
  );
  const relacoesErradas = shiftsOrigem.filter(
    (plantao) => unidadeNoDestino.get(plantao.id) !== plantao.unit.name,
  );

  if (relacoesErradas.length > 0) {
    divergencias += relacoesErradas.length;

    for (const plantao of relacoesErradas) {
      console.log(
        `  ERRADA plantão ${plantao.id}: origem aponta para "${plantao.unit.name}", ` +
          `destino para "${unidadeNoDestino.get(plantao.id) ?? "(nenhuma)"}"`,
      );
    }
  } else {
    console.log(
      `  ${shiftsOrigem.length}/${shiftsOrigem.length} plantões apontam para a mesma unidade`,
    );
  }

  console.log(
    divergencias === 0
      ? "\n=== OK: destino é fiel à origem. Pode trocar as variáveis na Vercel. ==="
      : `\n=== ${divergencias} divergência(s). NÃO troque as variáveis ainda. ===`,
  );

  if (divergencias > 0) process.exitCode = 1;
} finally {
  await origem.$disconnect();
  await destino.$disconnect();
}
