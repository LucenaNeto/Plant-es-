-- Registra para quem um plantão foi repassado.
--
-- Coluna anulável e sem default: plantões existentes continuam com NULL, que
-- significa "não repassado". Nenhum número muda retroativamente — a base tinha
-- 10 plantões, todos do tipo `fixed`, nenhum repasse.
--
-- Regra de negócio associada (em server/services/finance.ts): quando
-- "handoffTo" está preenchido, o valor do plantão sai de previsto/pendente/
-- recebido e passa a somar no total "repassado", exibido separadamente.

ALTER TABLE "Shift" ADD COLUMN "handoffTo" TEXT;

-- Filtrar por "repassado ou não" é operação de todo resumo mensal.
CREATE INDEX "Shift_userId_handoffTo_idx" ON "Shift"("userId", "handoffTo");
