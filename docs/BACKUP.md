# Backup do banco

## Por que existe

Em outubro de 2026 o projeto Supabase foi **pausado por inatividade** — o plano
gratuito pausa após alguns dias sem acesso — e o app ficou fora do ar. Os dados
voltaram intactos, mas só porque era pausa e não exclusão. Na época havia 145
plantões e R$ 252 mil de histórico sem nenhuma cópia.

A rotina resolve duas coisas de uma vez:

1. **Guarda uma cópia diária** dos dados, criptografada.
2. **Impede a pausa**, porque tocar o banco todo dia já conta como atividade.

## Como funciona

Um workflow do GitHub Actions roda todo dia às 06:00 UTC (03:00 em Brasília):

```
exporta o banco → JSON → criptografa com GPG → guarda como artefato (90 dias)
```

O schema não entra no arquivo: ele já está versionado nas migrations do Prisma.
Restaurar é `prisma migrate deploy` seguido do script de restauração.

## ⚠️ Por que a criptografia não é opcional

**Este repositório é público.** Artefato de Actions em repositório público é
baixável por qualquer pessoa, e o dump contém **e-mails e hashes de senha dos
usuários**. Sem criptografia, o backup seria uma publicação de dados pessoais.

O workflow **falha de propósito** se o segredo da senha não existir — para que a
ausência apareça como erro vermelho, e não como um arquivo em claro guardado em
silêncio.

## O que você precisa configurar (uma vez)

No GitHub, em **Settings → Secrets and variables → Actions → New repository
secret**, crie dois:

| Segredo | Valor |
|---|---|
| `BACKUP_DATABASE_URL` | A connection string do Supabase, **porta 5432, sem `pgbouncer`**. A rotina roda uma transação longa de leitura, e o transaction mode não traz ganho aqui |
| `BACKUP_PASSPHRASE` | Uma senha forte, só para o backup. **Guarde fora do GitHub** — sem ela, nenhum backup é recuperável |

Depois, na aba **Actions → Backup do banco → Run workflow**, rode uma vez à mão
para confirmar que passa.

## Restaurar

1. Baixe o artefato em **Actions → (a execução desejada) → Artifacts**.

2. Decifre:
   ```bash
   gpg --decrypt --output backup.json backup.json.gpg
   ```

3. Prepare o schema no destino:
   ```bash
   npx prisma migrate deploy
   ```

4. Restaure:
   ```bash
   npm run backup:restaurar backup.json
   ```

O script **recusa banco que já tenha dados**. Para sobrescrever de propósito,
acrescente `--forcar` — ele apaga tudo antes. Também confere se o destino tem as
mesmas migrations do backup: dados antigos num schema diferente falhariam no
meio, deixando o banco pela metade.

## Backup sob demanda

```bash
npm run backup
```

Grava em `backups/plantoes-AAAA-MM-DD.json`, **sem criptografia e sem
versionamento** (`/backups` está no `.gitignore`). Útil antes de uma migration
arriscada. Apague depois: o arquivo em claro tem e-mails e hashes.

## Verificação feita

O ciclo completo foi testado em 2026-10-10 contra a produção, restaurando num
**schema isolado** (`?schema=backup_teste`) no mesmo banco — o `public` nunca
foi tocado — e comparando registro a registro:

| Conferido | Resultado |
|---|---|
| User · Unit · RecurringRule · Shift · Expense | 166 registros idênticos, campo a campo |
| Hash de senha | preservado — os logins continuam funcionando |
| Ids | preservados — relações e sessões sobrevivem |
| Relação plantão → unidade | resolve para a mesma unidade |
| Data de calendário | sem deslocamento de fuso |
| `Decimal` de valor e horas | exatos; somas batem (R$ 252.399 / 3.157h) |
| Array de dias da semana da recorrência | preservado |

Um ponto a repetir se o teste for refeito: a limpeza automática do schema
**falhou silenciosamente** na primeira tentativa. O schema só foi removido
porque houve conferência depois. Nunca encerre esse teste sem checar que
`backup_teste` sumiu.

## Limites conhecidos

- **Retenção de 90 dias.** É o teto do plano gratuito do GitHub. Com execução
  diária, há sempre três meses de pontos de restauração.
- **Agendamento pausa com o repositório.** O GitHub desativa workflows agendados
  após 60 dias **sem nenhuma atividade no repositório**. Enquanto houver commits,
  não acontece — mas se o projeto hibernar, o backup para junto, e com ele a
  proteção contra a pausa do Supabase. Nesse caso, rode o workflow à mão.
- **O horário é aproximado.** O cron do GitHub é best-effort e atrasa em picos.
- **A restauração repõe dados, não schema.** Sempre `prisma migrate deploy`
  antes.
