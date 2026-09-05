# Roadmap do MVP — Plantões+

Um bloco por branch. Nada é mesclado no `main` sem revisão e autorização.

## Estado por área

| Área | Antes do Bloco 0 | Agora |
|---|---|---|
| Autenticação | Funcional (Prisma) | Funcional |
| Unidades | CRUD via REST | CRUD via REST + camada de serviço |
| Plantões | 100% mock | **CRUD completo, Server Actions** |
| Agenda | 100% mock | **calendário real** |
| Gastos | 100% mock | **CRUD completo, Server Actions** |
| Finanças | 100% mock | **agregações reais** |
| Dashboard | 100% mock | **agregações reais** |
| Recuperar senha | Decorativo | Aviso honesto (fora do MVP) |

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

Revisão adversarial do próprio bloco encontrou 8 problemas, todos
reproduzidos antes de corrigir e corrigidos em `a1e4e37`. Os quatro
críticos: `Response` compartilhada em escopo de módulo (o segundo 404 do
processo quebrava), `.partial()` do Zod não removendo `.default(false)`
de `isFixed` (todo PATCH parcial desmarcava "unidade fixa"), guard de
`callbackUrl` sem bloquear contrabarra (`/\evil.com` ainda escapava), e
`auth()` fora do `try` (falha de sessão contornava todo o log).

Migration `20260904120000_date_only_shift_and_expense` **aplicada** em
2026-09-04: `shiftDate` e `expenseDate` de `TIMESTAMP(3)` para `DATE`,
com `Shift` e `Expense` vazias. Verificado via `information_schema`.

### ✅ Bloco 1 — `feature/plantoes-crud`

Núcleo do produto, com Server Actions sobre `runAuthenticatedAction`.

- Criar, editar, duplicar, excluir; avançar situação de pagamento.
- Autofill dos padrões da unidade (valor, modalidade e término calculado
  a partir da carga padrão). Só preenche campo vazio.
- Filtros de mês, unidade e situação na query string — o botão voltar
  funciona e `/plantoes?unitId=...` da tela de unidades passa a valer.
- Sobreposição avisa sem bloquear, com confirmação em segundo envio.
  A busca varre 3 dias: plantão noturno invade o dia seguinte.
- Carga horária derivada de início/fim, nunca digitada.
- Unidade inativa recusa plantão novo, mas não trava a edição de um
  plantão histórico que já a referencia.

Verificado contra o banco real com 30 asserções (usuários de teste
criados e removidos em `finally`, banco conferido antes e depois):
derivação de horas em plantão noturno, data sem deslocamento de fuso,
limites do mês (30/09 dentro, 01/10 fora), soma do resumo, e **sete
asserções de isolamento entre contas** — listar, ler, editar, excluir,
mudar pagamento, vincular unidade alheia e detectar conflito.

### ✅ Bloco 2 — `feature/gastos-crud`

Gastos gerais e vinculados a unidade ou plantão, por categoria.

- Vínculo em três modos explícitos (`linkType`: geral / unidade / plantão),
  em vez de inferir pela presença de `unitId`/`shiftId` — o campo explícito
  torna impossível o estado ambíguo com os dois preenchidos.
- **A unidade de um gasto de plantão é derivada do plantão**, nunca aceita
  do cliente. Sem isso daria para gravar um gasto apontando ao plantão do
  Hospital A e à unidade B, e o relatório por unidade do Bloco 4 sairia
  errado sem nenhum sinal.
- Resumo do mês com quebra por categoria e barra proporcional, ordenado do
  maior gasto para o menor.
- `MonthNavigator` e `useFilterParams` extraídos e já compartilhados com
  plantões; agenda e finanças reusam nos próximos blocos.

Verificado contra o banco real com 34 asserções: quatro de integridade do
vínculo (incluindo payload forjado com unidade divergente do plantão), seis
de isolamento entre contas, e a confirmação de que excluir um plantão **não**
leva o gasto junto — `shiftId` vira null por `onDelete: SetNull` e o gasto
permanece vinculado à unidade.

### ✅ Bloco 3 — `feature/agenda-real`

Calendário mensal com dados reais, cores por modalidade, detalhe do dia.

- `buildCalendarGrid` monta a grade em aritmética UTC. Com `getDay()` local,
  o mês começaria na coluna errada sempre que servidor (UTC) e usuário (BRT)
  discordassem sobre o dia da semana do dia 1º — erro que aparece só em
  alguns meses e some quando você vai investigar.
- Semana começa no domingo, como os calendários impressos no Brasil, com
  rótulos de três letras (`dom seg ter…`) para evitar a ambiguidade de
  `S T Q Q S S D`.
- **Mês na URL, dia em estado local.** Trocar de mês busca no servidor;
  selecionar um dia é instantâneo, porque os plantões do mês inteiro já
  vieram. Pôr o dia na URL custaria ~123ms por toque.
- A agenda é para ver; a gestão fica em Plantões. Duplicar o formulário aqui
  criaria dois caminhos para a mesma operação.

Verificado: 48 meses (2024–2027) sem inconsistência de grade, contra
referência independente via `Intl`/UTC — total de dias, coluna do dia 1º,
ausência de buracos, ano bissexto. Mais 8 asserções de virada de mês contra
o banco: plantão noturno de 30/09 pertence a setembro, não vaza para
outubro, e ainda assim conflita com a manhã de 01/10.

### ✅ Bloco 4 — `feature/financas-dashboard`

Agregações reais. **`lib/mock-data.ts` removido** — todas as rotas privadas
agora buildam como dinâmicas, o que prova que nenhuma usa dado falso.

- **Dois líquidos, não um.** "Líquido" sozinho é ambíguo, e a diferença é o
  que mais importa para quem depende de repasse: `netReceived`
  (recebido − gastos, o caixa real) e `netProjected` (bruto − gastos, se
  tudo for pago). Um mês pode parecer ótimo na projeção e não ter entrado
  nada.
- Gasto geral não é atribuível a unidade, então fica fora do líquido por
  unidade e é exposto separadamente — sem esse aviso, a soma por unidade
  não bate com o total do mês e o usuário deixa de confiar nos números.
- Dashboard é sempre o mês corrente, sem navegação; quem quer outro mês vai
  a Finanças. Duplicar o seletor criaria duas telas fazendo o mesmo.
- `findNextShift` compara por data, não por horário: um plantão que começou
  às 19h e ainda está em andamento continua sendo "o próximo" até o dia virar.

Verificado com 36 asserções contra o banco: um cenário de números conferidos
à mão (bruto 4500, gastos 180, líquidos 1820 e 4320), oito **identidades
contábeis** (incluindo `gastos por unidade + gastos gerais = gastos totais`),
precisão de centavos (`1234,56 + 2345,67 = 3580,23`), isolamento entre contas
nos totais e no próximo plantão, e mês vazio sem quebrar.

### ✅ Bloco 5 — `feature/polimento-mvp`

- **Navegação com estado ativo** e ícones SVG inline. Num app de cinco abas,
  sem esse sinal a pessoa toca no item em que já está e conclui que travou.
  `aria-current="page"` acompanha o destaque visual.
- **PWA instalável**: manifesto, ícones 192/512 e apple-touch gerados em build
  por `ImageResponse` — sem binário versionado, a identidade fica junto do
  tema. `start_url` em `/dashboard`, porque quem instalou já tem conta.
- **Favicon padrão do Next removido** — o app servia o logo da Vercel na aba.
- Título com template (`Agenda · Plantões+`), `theme-color`, `viewport-fit:
  cover` para a barra inferior não ficar sob o indicador de home do iPhone.
- Pilha de fontes do sistema no lugar de `Arial, Helvetica` do template.
- Acessibilidade: link "pular para o conteúdo", anel de foco visível e
  consistente, `prefers-reduced-motion`.
- **Honestidade de interface**: a prop `actionLabel` do `PageHeader`
  renderizava um botão sem `onClick`, e `/recuperar-senha` tinha um formulário
  completo que não enviava nada — o usuário digitaria o e-mail e culparia a
  própria caixa de entrada. Os dois foram removidos.
- `.gitattributes` com `text=auto eol=lf`, silenciando o aviso de CRLF.

Verificado no servidor de produção: rotas de ícone servem PNG real (assinatura
`PNG`) e respondem sem a query de cache que o manifesto não carrega;
manifesto válido em `application/manifest+json`; as sete rotas privadas
redirecionam para `/login` com `callbackUrl` **relativo**; e as telas públicas
foram conferidas visualmente em viewport de 375px.

## Melhorias anotadas (pós-MVP)

- **Região do banco.** O Supabase está em `ca-central-1` (Canadá).
  Consultas quentes medem ~123ms constantes a partir do Brasil; a
  primeira conexão chegou a 1269ms. Migrar para `sa-east-1` (São Paulo)
  cortaria cerca de 100ms por consulta. Exige recriar o projeto e mover
  os dados — mais barato agora, com poucos dados, do que depois.
- **`.gitattributes`** com `* text=auto eol=lf`, para silenciar o aviso
  de CRLF do Git em ambiente Windows com deploy Linux.

## Fora do MVP

- Recuperação de senha por e-mail (exige provedor externo).
- Regras de recorrência (`RecurringRule` já existe no schema, sem UI).
- Upload de avatar (`User.avatarUrl` existe, sem UI).
- `server/repositories/`: pasta vazia. Com o Prisma já cumprindo esse papel,
  uma segunda camada seria cerimônia. Sugestão: remover a pasta.
