# Backlog — o que depende de uma decisão sua

Tudo aqui está parado de propósito: ou precisa de uma escolha de produto, ou
escreve em produção, ou custa dinheiro, ou mexe em segredo. Nada nesta lista
foi feito.

Última revisão: 2026-10-10.

---

## 1. Pendências que já estavam combinadas

### 1.1 Dois segredos no GitHub, para o backup começar a rodar

O workflow de backup está no `main` desde ontem, mas **falha de propósito** até
os segredos existirem. Em `Settings → Secrets and variables → Actions`:

| Segredo | Valor |
|---|---|
| `BACKUP_DATABASE_URL` | Connection string do Supabase, **porta 5432, sem `pgbouncer`** |
| `BACKUP_PASSPHRASE` | Senha forte só para isto. **Guarde fora do GitHub** — sem ela nenhum backup é recuperável |

Depois, `Actions → Backup do banco → Run workflow` para a primeira execução.

Enquanto isso não acontece, **não existe cópia de nada**. São 122 plantões e
2.617 horas de histórico.

### 1.2 Rotacionar o `AUTH_SECRET`

Eu imprimi o valor num transcript meu, em setembro. O filtro que eu usava para
mascarar só cobria credencial dentro de URL, e a variável solta passou.

Rotacionar invalida todas as sessões ativas — todo mundo refaz login, o que
hoje significa você. Gere um novo (`openssl rand -base64 32`), troque na Vercel
e faça redeploy.

---

## 2. Segurança

### 2.1 Oito avisos `high` que sobraram, todos de ferramenta de build

A atualização de hoje fechou os nove críticos do Next. O que resta são falhas
de exaustão de pilha em utilitários de caminho de arquivo:

| Pacote | Chega por | Fecha com |
|---|---|---|
| `braces`, `micromatch`, `fast-glob` | `eslint-config-next` | ESLint 9 → 10 |
| `deepmerge-ts`, `@prisma/config` | `prisma` (CLI) | Prisma 6 → 7 |

Nenhum é alcançável por requisição: rodam em build e em lint, sobre caminhos de
arquivo do próprio repositório. **Decisão sua:** subir os dois majors de uma
vez (Prisma 7 muda a API de client em alguns pontos; ESLint 10 muda a config
flat) ou conviver com os avisos até ter motivo melhor.

### 2.2 Rate limiting no login

Não existe nenhum limite de tentativa. Com o app público, uma lista de senhas
comuns roda contra `/login` sem nada no caminho.

Dá para fazer sem dependência nova — contador em memória no `proxy.ts` —, mas
em serverless cada instância tem a própria memória, então o limite real é
"N tentativas por instância", o que é bem mais frouxo do que parece. Fazer
direito pede um armazenamento compartilhado (o próprio Postgres serve).

**Decisão sua:** agora, com um usuário, ou quando a segunda pessoa criar conta.
Minha opinião: vale no dia em que a segunda conta existir — hoje o alvo é uma
senha só, a sua, e rotacioná-la (item 1.2) protege mais que o limite.

### 2.3 `Content-Security-Policy`

Os outros quatro cabeçalhos de segurança já foram: `X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy` estão no
`next.config.ts` e conferidos na resposta.

Falta a CSP, que é a mais valiosa e a única que pode quebrar a página: exige
listar de onde script, estilo e imagem podem vir, e o Next injeta script inline
com nonce. É um trabalho próprio, com teste tela a tela. **Decisão sua:** se
vale o esforço agora.

### 2.4 Três contas de teste no banco de produção

| Conta | Plantões | Criada |
|---|---|---|
| real | 122 | 2026-09-05 |
| `@plantoes.app` | **23** | 2026-08-30 |
| `@plantoes.app` | 0 | 2026-08-30 |
| outra | 0 | 2026-08-30 |

A de 23 plantões é a que incomoda: qualquer número que você olhe somando o
banco inteiro — e o próprio backup — carrega dados inventados por mim em
agosto. Apagar é escrita em produção, então fica com você. Se autorizar, eu
escrevo o script com conferência antes e depois.

---

## 3. Produto — o que os dados estão dizendo

Números de 2026-10-10, da sua conta.

### 3.1 R$ 116.306 em aberto contra R$ 92.669 recebidos

| Situação | Plantões | Valor |
|---|---|---|
| Previsto | 62 | R$ 111.682 |
| Pendente | 3 | R$ 4.624 |
| Recebido | 57 | R$ 92.669 |

**56% de tudo que você já lançou ainda não entrou.** O app registra isso mas
não faz nada com a informação: não há tela que responda "quem me deve, há
quanto tempo".

A ideia é um painel de cobrança: agrupado por unidade, ordenado pelo plantão
mais antigo ainda não recebido, com o total por unidade. Quem está devendo há
quatro meses aparece primeiro.

**Decisão sua:** vale a tela? E, se vale, o critério de "atrasado" é quantos
dias depois do plantão? Isso muda conforme o hospital, e eu não sei o seu.

### 3.2 Zero gastos em 122 plantões

A tela de gastos existe, funciona, e nunca foi usada. Das duas uma: ou o gasto
operacional não é relevante para você, ou lançar exige abrir outra tela e
ninguém faz isso depois de um plantão de 24h.

Se for a segunda, o conserto é um campo de gasto rápido no próprio card do
plantão — "combustível R$ 80" em dois toques, já vinculado ao plantão e à
unidade. Se for a primeira, a tela deveria sumir da navegação principal.

**Decisão sua:** qual das duas?

### 3.3 Repasse: zero usos

A funcionalidade foi construída em setembro e nunca foi acionada. Pode ser que
não tenha havido ocasião — ou que ela esteja escondida demais no card. Não
proponho mexer sem você dizer qual é o caso.

### 3.4 R$/hora comparado entre unidades

Já dá para calcular com o que existe: valor e horas estão lá, por unidade. A
pergunta que isso responde é "qual plantão vale mais a pena", que é decisão de
agenda, não de contabilidade.

| Unidade | Plantões |
|---|---|
| Santana | 57 |
| HRDM | 33 |
| UPA Noel Macedo | 19 |
| Hospital de Calçado | 6 |
| Hospital de São Joao | 3 |
| Brejão | 3 |
| CHAMA | 1 |

**Decisão sua:** o R$/hora bruto basta, ou precisa descontar deslocamento e
imposto para ser honesto? As duas perguntas abaixo saem daqui.

### 3.5 Impostos e custo de deslocamento

Hoje o "líquido" é receita menos gastos lançados. Não há imposto nem
quilometragem. Para quem dirige de Arapiraca a Garanhuns, o R$/hora real é
bem diferente do bruto.

**Decisão sua, e são três:** (a) entra imposto? com que regime — simples,
alíquota fixa que você informa? (b) entra custo de deslocamento? por km rodado
ou valor por plantão? (c) isso vira um terceiro "líquido" ou substitui o atual?

Esta é a mudança de maior alcance da lista: mexe no financeiro, no relatório e
no significado da palavra "líquido" em todas as telas.

### 3.6 Renomear "modalidade"

Verde, amarelo e vermelho estão rotulados como "modalidade" na interface. A
palavra não diz nada sozinha. **Decisão sua:** trocar por quê? "Risco"?
"Complexidade"? Você sabe o que esses nomes significam na prática; eu não.

---

## 4. Funcionalidades que dependem de escopo

### 4.1 Exportar a agenda em `.ics`

Um arquivo `.ics` que o Google Agenda e o iPhone importam, com os plantões do
mês. Sem dependência nova — `.ics` é texto.

**Decisão sua:** download avulso (simples, estático) ou um link de assinatura
que o calendário atualiza sozinho (mais útil, mas é uma URL pública com os
seus plantões, protegida só por um token no endereço).

### 4.2 Buscar unidade pelo CNES

O CNES é o cadastro nacional de estabelecimentos de saúde. Daria para digitar o
nome do hospital e preencher nome, município e tipo automaticamente, sem errar
grafia.

**Decisão sua:** vale a dependência de um serviço externo (DataSUS) para
economizar a digitação de sete unidades que já estão cadastradas? Minha opinião:
não vale hoje. Valeria se o app fosse para várias pessoas.

### 4.3 Lembrete de plantão

Notificação na véspera ou algumas horas antes. Push no navegador exige
service worker, chave VAPID e permissão do usuário.

**Decisão sua:** push mesmo, ou um e-mail diário resolveria? E-mail precisa de
um serviço de envio (Resend, por exemplo) — gratuito até certo volume, mas é
mais uma conta e mais um segredo.

---

## 5. Técnico

### 5.1 Fase 2 dos testes: banco descartável no CI

A suíte de hoje cobre lógica pura — 100 testes, sem banco. O que ela **não**
cobre é a regra mais importante do projeto: todo serviço recebe `userId` e o
inclui no `where`. Hoje nada verifica isso automaticamente, e é a regra que, se
quebrar, vaza dados entre contas.

Testar de verdade exige um Postgres descartável no CI (serviço do GitHub
Actions, `prisma migrate deploy`, dados de fixture). Dobra o tempo do workflow
e cria uma segunda fonte de verdade de schema para manter.

**Decisão sua:** vale? Minha opinião: vale, e é o item técnico de maior retorno
da lista — mas só faz sentido depois que você decidir sobre impostos e
deslocamento, porque isso mexe justamente nos serviços que os testes
cobririam.

### 5.2 Índices: nada a fazer hoje, revisitar na casa dos milhares

Medido em 2026-10-10: toda consulta quente executa em menos de 1,1ms, e 99% do
tempo de tela é rede. Os índices atuais cobrem os caminhos por usuário e por
data. Reabrir quando a tabela de plantões passar de alguns milhares de linhas —
`npx tsx scripts/verificar/explain.mts` refaz a conta.

### 5.3 O `.env` local discorda da produção — e isso já me fez errar

O `.env` desta máquina tem a `DATABASE_URL` na **porta 5432, sem
`pgbouncer=true`**. A produção usa **6543 com `pgbouncer=true`**. São dois
regimes de conexão com comportamento oposto, e o `CLAUDE.md` exige o segundo.

Duas consequências, uma já aconteceu:

1. **Toda medição feita localmente mente.** Hoje eu medi nessa URL, concluí que
   agrupar consultas em `$transaction` custava caro, troquei as transações por
   `Promise.all` no app inteiro e escrevi no `CLAUDE.md` que a regra antiga
   estava errada. Na URL da produção a conta se inverte: `$transaction` custa
   2.2 idas contra 4.0. Eu teria dobrado o tempo de toda tela. Está desfeito,
   mas só porque fui conferir outra coisa e esbarrei no `.env`.
2. **Session mode prende conexão.** Foi o que derrubou a produção em setembro:
   um `npm run dev` segurando conexões do mesmo pool que a Vercel usa.

Corrigir é trocar a porta e acrescentar `?pgbouncer=true&connection_limit=1` no
`.env` local — mas é o seu arquivo de credenciais, então não mexi.

### 5.4 Banco de homologação

Você já mencionou querer um quando houver usuário de verdade. Hoje o `.env`
local aponta para produção, o que significa que qualquer engano meu numa
migration é um engano em produção.

**Decisão sua:** criar agora (um segundo projeto Supabase, gratuito) ou quando
entrar a segunda pessoa. Minha opinião: agora, porque o custo é zero e a
proteção é imediata — e porque hoje a única coisa entre um `migrate reset` e os
seus dados é eu lembrar de não digitar.

### 5.5 Quatorze branches antigas já mescladas

`feature/agenda-real`, `feature/gastos-crud`, `feature/plantoes-crud` e mais
onze estão no `main` há semanas e continuam na lista. Apagar é um comando, mas
apagar branch é irreversível no local — então fica com você.

### 5.6 Recuperação de senha

Ficou fora do MVP por decisão sua. Continua fora. Hoje, se você perder a senha,
a saída é um `UPDATE` manual no banco. Depende de serviço de e-mail, então
anda junto com o 4.3.

---

## 6. Interação

- **Confirmação de exclusão sem `window.confirm`.** O diálogo nativo do
  navegador no celular é feio e fácil de errar o toque. Trocar por um painel
  dentro do card é mudança de gosto visual, então prefiro que você escolha.
- **Mês anterior e próximo pré-carregados na agenda.** O gesto mais comum ali é
  navegar entre meses vizinhos, e cada um custa uma ida ao servidor. Fazer isso
  de verdade exige `cacheComponents` e `partialPrefetching` do Next 16.4, que
  mudam como **toda** página renderiza e é cacheada. Num app onde a tela mostra
  quanto você tem a receber, servir dado de alguns segundos atrás é decisão de
  produto, não de implementação. **Decisão sua.**

A atualização otimista do selo de pagamento foi feita — está em
`features/shifts/shift-card.tsx`. É a única mudança de hoje que eu **não**
consegui ver rodando: testá-la exige login, e login exige uma conta que eu não
tenho. Vale ser a primeira coisa que você abre no localhost.
