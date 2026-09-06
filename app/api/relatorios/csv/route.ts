import { withApiAuth } from "@/server/api-handler";
import { getReport, type ReportFilters } from "@/server/services/reports";
import { todayAsCalendarDate } from "@/lib/dates/calendar-date";

/**
 * Exportação do relatório em CSV.
 *
 * Rota, e não Server Action: baixar um arquivo depende de cabeçalhos HTTP
 * (`Content-Type` e `Content-Disposition`), que uma action não controla. O
 * navegador salva direto, sem passar por JavaScript no cliente.
 */

/**
 * Escapa um campo de CSV.
 *
 * Nome de hospital com vírgula — "UPA Norte, Zona 2" — quebraria as colunas
 * sem isso, e a planilha do contador abriria embaralhada. Aspas internas viram
 * aspas duplas, como manda o RFC 4180.
 */
function campo(valor: string | number | null | undefined) {
  const texto = String(valor ?? "");

  return /[",;\n\r]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

const ROTULOS_STATUS: Record<string, string> = {
  pending: "Pendente",
  predicted: "Previsto",
  received: "Recebido",
};

const ROTULOS_TIPO: Record<string, string> = {
  extra: "Extra",
  fixed: "Fixo",
  handoff: "Repasse",
};

export const GET = withApiAuth("reports.csv", async ({ logger, userId }, request) => {
  const params = new URL(request.url).searchParams;
  const hoje = todayAsCalendarDate();

  const ano = Number(params.get("year"));
  const mes = Number(params.get("month"));
  const comValores = params.get("valores") === "1";

  const filtros: ReportFilters = {
    month: Number.isInteger(mes) && mes >= 1 && mes <= 12 ? mes : undefined,
    unitId: params.get("unitId") || undefined,
    year:
      Number.isInteger(ano) && ano >= 2000 && ano <= 2100
        ? ano
        : hoje.getUTCFullYear(),
  };

  const relatorio = await getReport(userId, filtros);

  const cabecalho = [
    "Profissional",
    "Data",
    "Dia da semana",
    "Unidade",
    "Início",
    "Término",
    "Horas",
    "Tipo",
    ...(comValores ? ["Valor", "Situação"] : []),
    "Repassado para",
  ];

  const linhas = relatorio.byUnit.flatMap((unidade) =>
    unidade.shifts.map((plantao) =>
      [
        relatorio.user.name,
        plantao.isoDate,
        plantao.weekday,
        plantao.unitName,
        plantao.startTime,
        plantao.endTime,
        plantao.hours,
        ROTULOS_TIPO[plantao.shiftType] ?? plantao.shiftType,
        ...(comValores
          ? [
              // Vírgula decimal: é o que o Excel em português espera. Com
              // ponto, a planilha lê 1400.00 como texto e não soma.
              plantao.handoffTo ? "" : String(plantao.value).replace(".", ","),
              plantao.handoffTo
                ? "Repassado"
                : (ROTULOS_STATUS[plantao.paymentStatus] ?? plantao.paymentStatus),
            ]
          : []),
        plantao.handoffTo ?? "",
      ].map(campo),
    ),
  );

  const total = comValores
    ? [
        [
          "TOTAL",
          "",
          "",
          "",
          "",
          "",
          String(relatorio.totals.hours).replace(".", ","),
          `${relatorio.totals.shiftCount} plantões`,
          String(relatorio.totals.value).replace(".", ","),
          "",
          "",
        ].map(campo),
      ]
    : [];

  /**
   * Ponto e vírgula como separador e BOM no início: é o que faz o Excel em
   * português abrir o arquivo com as colunas separadas e os acentos corretos.
   * Com vírgula e sem BOM, "Alimentação" vira "AlimentaÃ§Ã£o" numa só coluna.
   */
  const csv =
    "﻿" +
    [cabecalho.map(campo), ...linhas, ...total]
      .map((linha) => linha.join(";"))
      .join("\r\n");

  const periodo = filtros.month
    ? `${filtros.year}-${String(filtros.month).padStart(2, "0")}`
    : String(filtros.year);
  const nome = `plantoes-${periodo}${comValores ? "-financeiro" : ""}.csv`;

  logger.info("report.exported", {
    format: "csv",
    rows: linhas.length,
    withValues: comValores,
  });

  return new Response(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
});
