-- Converte as datas de calendário de TIMESTAMP(3) para DATE.
--
-- Motivo: um plantão e um gasto são ancorados a um DIA ("plantão do dia 20"),
-- não a um instante. Guardados como TIMESTAMP, o valor 2026-08-20T00:00:00Z
-- gravado pelo servidor (Vercel roda em UTC) é lido no fuso do aparelho
-- (BRT, UTC-3) como 19/08 às 21h — o registro aparece no dia anterior no
-- calendário, e servidor e cliente discordam entre si.
--
-- Com DATE não existe componente de hora, então o valor é o mesmo em qualquer
-- fuso. A hora do plantão continua em "startTime"/"endTime" (texto "HH:mm") e a
-- duração em "hours", que já tratam a virada de meia-noite.
--
-- Conversão sem perda: as linhas existentes têm hora 00:00 e a coerção do
-- Postgres apenas trunca o componente de tempo.

ALTER TABLE "Shift"
  ALTER COLUMN "shiftDate" TYPE DATE USING "shiftDate"::DATE;

ALTER TABLE "Expense"
  ALTER COLUMN "expenseDate" TYPE DATE USING "expenseDate"::DATE;
