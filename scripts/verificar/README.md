# Scripts de verificação

Scripts que rodam contra o banco configurado no `.env` — que é o de
**produção**. Rode um de cada vez e encerre o servidor local antes
(`connection_limit=1` significa uma conexão só).

Todos são de leitura, **com uma exceção marcada na tabela**:
`recorrencia-duplicada.mts` escreve, mas só em registros que ele mesmo cria —
um usuário descartável que ele apaga no `finally`, conferindo a limpeza antes
de sair. A conferência existe porque a limpeza automática já falhou em silêncio
uma vez neste projeto (ver [docs/BACKUP.md](../../docs/BACKUP.md)).

| Script | O que responde |
|---|---|
| `estrategias.mts` | Quanto custa uma ida ao banco, e se `await` em sequência, `Promise.all` ou `$transaction` fazem diferença |
| `medir-telas.mts` | Quanto cada tela demora e quantas consultas ela faz |
| `conexoes.mts` | Se as duas conexões do `.env` respondem, e em que regime cada uma está |
| `recorrencia-duplicada.mts` | Prova que repetir semanal não duplica o plantão do dia escolhido — **este escreve**, num usuário descartável que ele apaga |
| `duplicados.mts` | Quais plantões estão repetidos no banco |
| `explain.mts` | O plano e o tempo de execução real de cada consulta quente |
| `retrato.mts` | Quantos plantões, gastos e unidades existem, e quanto está em aberto |
| `contas.mts` | Quantas contas existem no banco (sem imprimir e-mail) |

```bash
npx tsx scripts/verificar/estrategias.mts
```

## Por que ficam versionados

Cada um existe porque uma decisão do projeto se apoia no número que ele
produz — e número medido envelhece. Quando a região do banco mudou, a regra
sobre `$transaction` no `CLAUDE.md` virou mentira e ninguém percebeu por um
mês. Ter o script ao lado da afirmação é o que permite refazer a conta em vez
de discutir de memória.

`medir-telas.mts` carrega a contagem de consultas de cada tela escrita à mão.
Se o tempo por consulta destoar do que `estrategias.mts` mede, alguém
acrescentou consulta sem notar.
