# Migração do banco para `sa-east-1` (São Paulo)

> **Executada em 2026-09-05.** Este documento virou registro histórico do
> procedimento; os passos abaixo continuam válidos caso seja preciso repetir a
> operação (outra região, outro projeto).

## Resultado

| Configuração | 1 consulta | 3 em paralelo |
|---|---|---|
| Canadá, session 5432 *(antes)* | 122ms | 605ms |
| **São Paulo, session 5432** *(agora)* | **52ms** | **254ms** |
| São Paulo, transaction 6543 | 254ms | 760ms |

Tempo real das páginas, com conexão quente:

| Tela | Consultas | São Paulo | Canadá *(derivado)* |
|---|---|---|---|
| Plantões | 2 | 166ms | ~390ms |
| Dashboard | 8 | 477ms | ~980ms |

**Uma previsão que se mostrou errada:** eu estimava que em São Paulo o
transaction mode custaria 60–100ms. Custa 254ms — continua ~5x mais caro que o
session mode, a mesma proporção observada no Canadá (784 vs 131). O custo do
transaction mode não é distância, é processamento do pooler por consulta.
Mudar de continente não resolve isso, então seguimos em session mode com
`connection_limit=1`, que já elimina o risco de esgotamento.

Verificação: registros comparados campo a campo, relações conferidas dos dois
lados, e a camada de serviço do app produzindo saída **byte a byte idêntica**
nos dois bancos. Nenhum registro foi escrito no banco antigo entre a cópia e a
troca das variáveis.

## Por que foi feito

O Supabase estava em `ca-central-1` (Canadá). A distância era a causa raiz de
dois problemas:

| Configuração no Canadá | 1 consulta | `Promise.all` de 3 |
|---|---|---|
| Session 5432, `limit=1` | 131ms | 819ms |
| Transaction 6543, `limit=1` | 784ms | 2273ms |

Toda consulta pagava ~120ms só de ida e volta transatlântica, e o dashboard —
que faz oito consultas — chegava perto de um segundo.

O transaction mode (6543) é o modo **correto** para serverless: devolve a
conexão ao pool a cada transação, em vez de prendê-la à vida do processo. A
expectativa era que, com o banco perto, ele ficasse barato o suficiente para
adotarmos, resolvendo velocidade e escala de uma vez. **Não foi o que
aconteceu** — ver "Resultado", acima. Seguimos em session mode com
`connection_limit=1`, que já elimina o risco de esgotamento por outro caminho.

## O que não dá para fazer

**Não é possível trocar a região de um projeto Supabase existente.** A região é
fixada na criação. O caminho oficial é criar outro projeto e migrar.

## Por que a nossa migração é simples

O guia genérico da Supabase fala em migrar Auth, Storage, RLS e chaves anônimas.
**Nada disso se aplica aqui.** Este app usa Supabase como um Postgres e mais
nada: a autenticação é Auth.js com a tabela `User` própria, via Prisma. Não há
RLS, não há SDK da Supabase, não há chave anônima. É uma connection string.

Como os arquivos de migration do Prisma estão versionados, o schema se
reconstrói sozinho no destino. Só os dados precisam ser copiados — e são poucos.

---

## Passo a passo

### 1. Criar o projeto novo (você)

No painel da Supabase, novo projeto, e **selecionar `South America (São Paulo)`
`sa-east-1`** no dropdown de região. Guarde a senha do banco.

Em *Project Settings → Database → Connection string → URI*, copie a string.

### 2. Colocar a URL no `.env` (você)

Adicione ao `.env` local — **não cole a string no chat**:

```
NEW_DATABASE_URL="postgresql://...@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?connection_limit=1"
```

### 3. Medir antes de mover

```bash
npx tsx scripts/migracao-regiao/1-medir-latencia.mts
```

Compara Canadá e São Paulo nos dois modos do pooler. **Se São Paulo não
entregar o ganho, pare aqui** — a migração inteira parte dessa premissa, e
custa dois minutos confirmá-la antes de tocar em qualquer dado.

### 4. Criar o schema no destino

```bash
DATABASE_URL="$NEW_DATABASE_URL" DIRECT_URL="$NEW_DATABASE_URL" npx prisma migrate deploy
```

Roda as duas migrations versionadas contra o banco novo. De quebra, prova que
elas reconstroem o schema do zero.

### 5. Copiar os dados

```bash
npx tsx scripts/migracao-regiao/2-copiar-dados.mts
```

Copia preservando os **ids**. Isso não é detalhe: `Shift.unitId` e
`Shift.userId` apontam para os pais, e o id do usuário é o `sub` do JWT — com
ids novos, as relações se perdem e todo mundo é deslogado. Os hashes de senha
vão verbatim, então os logins continuam funcionando.

O script recusa rodar se o destino já tiver dados.

### 6. Conferir

```bash
npx tsx scripts/migracao-regiao/3-verificar.mts
```

Compara registro a registro, campo a campo, e confere que as relações resolvem
para os mesmos registros dos dois lados. **Só troque as variáveis na Vercel
depois deste passo passar.**

### 7. Trocar as variáveis na Vercel (você)

Em *Settings → Environment Variables*:

- `DATABASE_URL` → a URL nova. Se o passo 3 mostrou o transaction mode viável,
  use a porta **6543** com `?pgbouncer=true&connection_limit=1`. Senão, **5432**
  com `?connection_limit=1`.
- `DIRECT_URL` → a URL nova na porta **5432**, sem parâmetros.

Redeploy.

### 8. Atualizar o `.env` local (você)

Troque `DATABASE_URL` pela nova e remova `NEW_DATABASE_URL`.

---

## Rollback

**Não apague o projeto antigo por alguns dias.** Se algo aparecer depois,
reverter é trocar as variáveis de volta na Vercel — o banco antigo continua
intacto, porque a migração só lê dele.

## Janela de indisponibilidade

Entre o passo 5 e o passo 7, o que for escrito no banco antigo não vai para o
novo. Sendo uso individual, basta não usar o app durante a migração. Se demorar
ou houver outras pessoas usando, rode o passo 5 novamente com o destino limpo.
