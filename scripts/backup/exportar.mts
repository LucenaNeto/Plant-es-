/**
 * Exporta o banco inteiro para um JSON.
 *
 * **Por que JSON e não `pg_dump`.** O schema já está versionado nas migrations
 * do Prisma, então o que falta guardar são só os dados. JSON evita a dor
 * clássica do `pg_dump`: incompatibilidade entre a versão do cliente local e a
 * do servidor, que costuma aparecer justamente no dia em que você precisa
 * restaurar. Restaurar aqui é `prisma migrate deploy` seguido de
 * `restaurar.mts` — duas etapas previsíveis.
 *
 * **O arquivo é sensível.** Contém e-mails e hashes de senha. Nunca commitar,
 * nunca subir sem criptografia a lugar público. O workflow que roda isto
 * criptografa antes de guardar; ver `docs/BACKUP.md`.
 *
 *   npm run backup
 *   npm run backup -- --saida caminho/arquivo.json
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Ordem das tabelas, das que não dependem de ninguém para as que dependem.
 * O restaurador percorre esta mesma lista na ordem direta — se mudar aqui,
 * muda lá.
 */
const ORDEM = [
  "users",
  "units",
  "recurringRules",
  "shifts",
  "expenses",
] as const;

function destino() {
  const indice = process.argv.indexOf("--saida");

  if (indice !== -1 && process.argv[indice + 1]) {
    return process.argv[indice + 1];
  }

  // Data no nome: o artefato do CI guarda vários dias, e abrir o arquivo
  // para descobrir de quando ele é seria um passo a mais na hora errada.
  const dia = new Date().toISOString().slice(0, 10);

  return `backups/plantoes-${dia}.json`;
}

try {
  // Uma transação: o backup é uma foto consistente, não cinco leituras
  // tiradas em momentos diferentes enquanto alguém usa o app.
  const [users, units, recurringRules, shifts, expenses] =
    await prisma.$transaction([
      prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.unit.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.recurringRule.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.shift.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.expense.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

  const dados = { users, units, recurringRules, shifts, expenses };

  /**
   * As migrations aplicadas entram no arquivo. Sem isso, um backup antigo
   * restaurado sobre um schema novo falharia com erro de coluna, e a causa só
   * apareceria depois de muita investigação.
   */
  const migrations = await prisma.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL ORDER BY finished_at
  `;

  const conteudo = {
    _meta: {
      contagem: Object.fromEntries(
        ORDEM.map((tabela) => [tabela, dados[tabela].length]),
      ),
      exportadoEm: new Date().toISOString(),
      // Só o host, nunca a URL completa — ela carrega a senha.
      origem: process.env.DATABASE_URL?.match(/@([^:/]+)/)?.[1] ?? "desconhecida",
      migrations: migrations.map((linha) => linha.migration_name),
      versao: 1,
    },
    ...dados,
  };

  const caminho = destino();
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, JSON.stringify(conteudo, null, 2), "utf8");

  const total = ORDEM.reduce((soma, tabela) => soma + dados[tabela].length, 0);

  console.log(`Backup gravado em ${caminho}`);
  console.log(`  ${total} registros · ${migrations.length} migrations`);

  for (const tabela of ORDEM) {
    console.log(`  ${tabela.padEnd(16)} ${dados[tabela].length}`);
  }

  /**
   * Um backup vazio é quase sempre sinal de banco errado na variável de
   * ambiente, não de banco realmente vazio. Falhar alto aqui evita que o CI
   * fique verde por semanas guardando arquivos sem nada dentro.
   */
  if (total === 0) {
    console.error(
      "\nERRO: o banco não retornou nenhum registro. Confira a DATABASE_URL.",
    );
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}
