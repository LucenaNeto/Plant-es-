# Roadmap do MVP — Plantões+

Um bloco por branch. Nada é mesclado no `main` sem revisão e autorização.

## Estado por área

| Área | Antes do Bloco 0 | Agora |
|---|---|---|
| Autenticação | Funcional (Prisma) | Funcional |
| Unidades | CRUD via REST | CRUD via REST + camada de serviço |
| Plantões | 100% mock | 100% mock |
| Agenda | 100% mock | 100% mock |
| Gastos | 100% mock | 100% mock |
| Finanças | 100% mock | 100% mock |
| Dashboard | 100% mock | 100% mock |
| Recuperar senha | Decorativo | Decorativo (fora do MVP) |

## Blocos

### ✅ Bloco 0 — `feature/fundacao-observabilidade`

Fundação enxuta, só o que os blocos seguintes consomem.

- Logger estruturado JSON com redação automática de PII (`lib/logger.ts`).
- `requestId` correlacionando todos os logs de uma operação; devolvido ao
  usuário na mensagem de erro para rastreio na Vercel.
- Envelope de Server Action (`server/action-runner.ts`) e de rota REST
  (`server/api-handler.ts`): sessão, log, tradução de erro do Prisma.
- Contrato `ActionResult` (`lib/action-result.ts`).
- Camada `server/services/`, estreada com unidades.
- Fonte única de rotas privadas (`lib/routes.ts`), antes duplicada.
- `lib/dates/calendar-date.ts`: fuso, virada de meia-noite, sobreposição.
- `error.tsx`, `loading.tsx`, `not-found.tsx`, `global-error.tsx`.
- Instrumentação do Prisma: erros e consultas lentas.

Correções de bug incluídas:

- `PATCH /api/units/:id` exigia payload completo e **reativava silenciosamente**
  uma unidade inativada quando o campo `active` não vinha no corpo.
- `callbackUrl` do login aceitava URL absoluta — open redirect.

Migration escrita e **não aplicada**: `shiftDate` e `expenseDate` de
`TIMESTAMP(3)` para `DATE`.

### Bloco 1 — `feature/plantoes-crud`

Núcleo do produto. Criar, editar, duplicar, excluir plantão; marcar recebido;
preencher automaticamente a partir dos padrões da unidade; filtrar por mês,
unidade e status; avisar (sem bloquear) sobre sobreposição de horário.

### Bloco 2 — `feature/gastos-crud`

Gastos gerais e vinculados a unidade ou plantão, por categoria.

### Bloco 3 — `feature/agenda-real`

Calendário mensal com dados reais, cores por modalidade, detalhe do dia.

### Bloco 4 — `feature/financas-dashboard`

Agregações reais: previsto, pendente, recebido, gastos, líquido; receita por
unidade; gastos por categoria. Remoção de `lib/mock-data.ts`.

### Bloco 5 — `feature/polimento-mvp`

Estado ativo na navegação, empty states, PWA/manifest, metadata, acessibilidade.

## Fora do MVP

- Recuperação de senha por e-mail (exige provedor externo).
- Regras de recorrência (`RecurringRule` já existe no schema, sem UI).
- Upload de avatar (`User.avatarUrl` existe, sem UI).
- `server/repositories/`: pasta vazia. Com o Prisma já cumprindo esse papel,
  uma segunda camada seria cerimônia. Sugestão: remover a pasta.
