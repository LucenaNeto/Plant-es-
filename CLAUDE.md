@AGENTS.md

# Convenções do Plantões+

## Governança

- Nada é commitado direto no `main`. Toda mudança nasce em branch `feature/`, `fix/` ou `hotfix/`.
- Nada vai para produção (merge, push, deploy) sem autorização explícita do dono do projeto.
- O `.env` aponta para o **Supabase de produção**. Nenhum comando que escreva no banco
  (`prisma migrate deploy`, `prisma db push`, `prisma migrate reset`) deve ser executado
  automaticamente. Escrever o arquivo de migration é permitido; aplicá-lo não.

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
