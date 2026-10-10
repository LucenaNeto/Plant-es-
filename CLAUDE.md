@AGENTS.md

# Convenções do Plantões+

## Governança

- Nada é commitado direto no `main`. Toda mudança nasce em branch `feature/`, `fix/` ou `hotfix/`.
- Nada vai para produção (merge, push, deploy) sem autorização explícita do dono do projeto.
- O `.env` aponta para o **Supabase de produção**. Nenhum comando que escreva no banco
  (`prisma migrate deploy`, `prisma db push`, `prisma migrate reset`) deve ser executado
  automaticamente. Escrever o arquivo de migration é permitido; aplicá-lo não.
- **A `DATABASE_URL` usa a porta 6543 com `?pgbouncer=true&connection_limit=1`.**
  Nenhuma das três partes é opcional, e cada uma tem uma cicatriz:
  - **Porta 6543 (transaction mode).** Em session mode (5432) cada instância
    serverless prende uma conexão pela vida inteira dela; a Vercel cria quantas
    quiser, e 15 esgotam o pool. Derrubou produção em 2026-09-06 com
    `FATAL (EMAXCONNSESSION)`. `connection_limit=1` **não** resolve isso — ele
    limita por instância, e o número de instâncias é ilimitado.
  - **`pgbouncer=true`** desliga prepared statements. Sem ele, sob concorrência,
    quebra com `prepared statement "sN" does not exist` (medido: 12 falhas em 12
    clientes).
  - **`connection_limit=1`** porque o padrão do Prisma é (núcleos × 2 + 1) — 17
    numa máquina de 8 núcleos.
  - A `DIRECT_URL` continua na **5432 sem parâmetros**: migrations precisam de
    sessão dedicada para DDL.
- **Agrupe consultas em `$transaction`.** O custo do `pgbouncer=true` é pago por
  transação, não por consulta, e uma consulta solta é uma transação implícita.
  Medido em 2026-09-06: quatro consultas soltas ~1130ms, agrupadas ~630ms.
  Remedido em 2026-10-10, mesmo resultado: ~1002ms contra ~553ms, ou 4.0 idas
  contra 2.2. É o que torna o transaction mode viável.
- **Gaste menos consultas também.** Com `connection_limit=1` nada paraleliza —
  `Promise.all` só enfileira na única conexão. Buscar o mesmo mês duas vezes
  mudando o `select` custa o dobro, dentro ou fora de transação.
- **Meça sempre com a `DATABASE_URL` da produção (6543 + `pgbouncer=true`).**
  Na 5432 a conta se inverte: sem o pooler, `$transaction` só acrescenta BEGIN
  e COMMIT e parece custar duas viagens a mais. Em 2026-10-10 eu medi na 5432,
  concluí que a regra acima estava errada, troquei as transações por
  `Promise.all` e deixei a produção **duas vezes mais lenta** antes de
  perceber. O `.env` local precisa ser o mesmo da produção, ou a medição mente.
  Reproduza com `npx tsx scripts/verificar/estrategias.mts`.
- Scripts de verificação abrem conexão: rode um de cada vez, sempre com
  `$disconnect()` em `finally`, e encerre servidores locais antes.

## Camadas

```
app/(private)/*/page.tsx   →  render, sem regra de negócio
app/**/actions.ts          →  Server Actions: auth + validação + chamada de serviço
app/api/**/route.ts        →  REST: auth + validação + chamada de serviço
server/services/*.ts       →  regra de negócio; não conhece HTTP
lib/                       →  utilitários puros, sem I/O
```

- **Todo serviço recebe `userId` como primeiro parâmetro e o inclui no `where`.**
  É o que garante o isolamento entre contas. Nenhuma função de serviço busca por
  id sem o dono junto.
- Serviços retornam dados **já serializados** — nada de `Decimal` ou `Date` do
  Prisma cruzando a fronteira servidor→cliente.
- Quando um registro não existe ou pertence a outra conta, o serviço retorna
  `null` nos dois casos, indistintamente. Não revelar a existência de dados alheios.

## Mutações

- Escritas novas usam **Server Actions**, envolvidas em `runAuthenticatedAction`
  (`server/action-runner.ts`). Ele cuida de sessão, `requestId`, log e tradução
  de erro. As rotas REST de unidades usam o equivalente `withApiAuth`.
- Toda action retorna `ActionResult` (`lib/action-result.ts`): tipo discriminado
  por `ok`, com `code`, `message` em português e `errors` por campo.
- Erro **esperado** (validação, não encontrado) é valor de retorno, nunca `throw`.
  `throw` fica reservado a bug de verdade.
- Em `catch` dentro de código Next, chamar `unstable_rethrow(error)` antes de
  qualquer tratamento — senão o catch engole `redirect()` e `notFound()`.

## Datas

- `Shift.shiftDate` e `Expense.expenseDate` são `DATE` no Postgres (sem hora).
- **Toda** leitura e escrita dessas colunas passa por `lib/dates/calendar-date.ts`,
  que formata com `timeZone: "UTC"` fixo. Formatar com fuso local mostra o dia
  anterior (Vercel roda em UTC, o aparelho em BRT).
- Filtro por mês usa `monthRange()`: `gte` no início e `lt` no início do mês
  seguinte. Nunca `lte` no último dia.
- Hora do plantão vive em `startTime`/`endTime` (`"HH:mm"`); a duração sai de
  `calculateShiftHours()`, que trata a virada de meia-noite.

## Logs

- Usar `logger` de `lib/logger.ts`. Nunca `console.log` direto.
- Nomear eventos em `dominio.acao` (`unit.created`, `shift.payment_updated`).
- **Nunca logar PII**: e-mail, telefone, senha. Só `userId`. O logger redige
  esses campos automaticamente, mas isso é rede de segurança, não permissão.
- Sempre propagar o `requestId` do contexto da action/rota.
