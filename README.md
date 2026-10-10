# Plantões+

App mobile-first para um profissional de saúde organizar os próprios plantões e
o financeiro operacional deles: a escala do mês, quanto cada plantão rende,
quanto já entrou e quanto ainda falta receber.

Em produção na Vercel, com Postgres no Supabase. Uso pessoal, uma conta.

## ⚠️ Antes de rodar qualquer comando de banco

**O `.env` aponta para a produção.** Não há banco de homologação. Isso significa
que estes comandos escrevem nos dados reais e não devem ser rodados por
impulso:

```
prisma migrate dev        prisma migrate deploy
prisma db push            prisma migrate reset
```

Escrever o arquivo de migration é seguro; aplicá-lo é a parte que exige
decisão. As regras completas estão no [CLAUDE.md](CLAUDE.md), que vale tanto
para quem programa quanto para agente.

Antes de qualquer migration arriscada:

```bash
npm run backup
```

## Rodar local

```bash
npm install
npm run dev
```

Variáveis necessárias no `.env` (modelo em `.env.example`):

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | Conexão poolada, **porta 6543 com `?pgbouncer=true&connection_limit=1`** |
| `DIRECT_URL` | Conexão direta, **porta 5432 sem parâmetros** — só migrations usam |
| `AUTH_SECRET` | Assinatura da sessão |
| `AUTH_TRUST_HOST` | `true` |

As três partes da `DATABASE_URL` não são opcionais, e cada uma tem uma
cicatriz: session mode derrubou a produção em setembro, sem `pgbouncer=true` as
consultas quebram sob concorrência, e sem `connection_limit=1` o Prisma abre
dezessete conexões por instância. O [CLAUDE.md](CLAUDE.md) conta a história de
cada uma.

## Verificar

```bash
npm run verificar    # tipos + lint + testes
npm test             # só os testes
npm run build
```

São 132 testes de lógica pura — datas, identidades contábeis, validação,
redação de PII no logger — e nenhum toca o banco. Rodam em menos de um segundo.
O mesmo conjunto roda no CI em todo push e todo PR.

Para medir desempenho contra o banco real, veja
[`scripts/verificar/`](scripts/verificar/README.md). São scripts de leitura;
rode um de cada vez, com o servidor local parado.

## Como o código é organizado

```
app/(private)/*/page.tsx   →  render, sem regra de negócio
app/**/actions.ts          →  Server Actions: auth + validação + chamada de serviço
app/api/**/route.ts        →  REST: auth + validação + chamada de serviço
server/services/*.ts       →  regra de negócio; não conhece HTTP
server/services/screens.ts →  junta as consultas que cada tela precisa
lib/                       →  utilitários puros, sem I/O
```

Duas regras que atravessam tudo:

- **Todo serviço recebe `userId` como primeiro parâmetro e o inclui no
  `where`.** É o que garante o isolamento entre contas.
- **Nenhum `Decimal` ou `Date` do Prisma cruza a fronteira servidor→cliente.**
  Datas de calendário passam todas por `lib/dates/calendar-date.ts`, com fuso
  UTC fixo — formatar com fuso local mostra o dia anterior.

## O que o app faz

- **Agenda** — calendário mensal, lançamento tocando no dia, plantão semanal
  recorrente, duplicação em lote.
- **Plantões** — ciclo de recebimento (previsto → pendente → recebido), repasse
  de uma ocorrência a outra pessoa, detecção de sobreposição de horário.
- **Unidades** — valores e carga padrão que preenchem o lançamento sozinhos.
- **Gastos** — operacionais, gerais ou vinculados a unidade e plantão.
- **Finanças** — bruto, recebido, a receber e líquido do mês, por unidade.
- **Relatórios** — operacional e financeiro, gráficos de horas, comparativo
  mês a mês e ano a ano, exportação em CSV e TXT.

## Documentação

| Arquivo | O que tem |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Convenções e as decisões que custaram caro |
| [docs/BACKLOG.md](docs/BACKLOG.md) | O que está parado esperando decisão |
| [docs/BACKUP.md](docs/BACKUP.md) | Backup diário e como restaurar |
| [docs/MIGRACAO-REGIAO.md](docs/MIGRACAO-REGIAO.md) | A troca de região do banco e o que ela mediu |
| [docs/ROADMAP-MVP.md](docs/ROADMAP-MVP.md) | Histórico dos blocos do MVP |

## Segurança

Não versionar `.env` nem nenhum segredo. **O repositório é público** — o que
significa que backup, dump e log não podem sair daqui em claro: o workflow de
backup criptografa antes de guardar, e o logger redige e-mail, telefone e senha
automaticamente.
