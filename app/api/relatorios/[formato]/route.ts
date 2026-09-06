import { withApiAuth } from "@/server/api-handler";
import { formatMonthLabel, todayAsCalendarDate } from "@/lib/dates/calendar-date";
import { formatCurrency } from "@/lib/format";
import {
  getReport,
  type Report,
  type ReportFilters,
} from "@/server/services/reports";

/**
 * Exportação do relatório em CSV ou TXT.
 *
 * Rota, e não Server Action: baixar um arquivo depende de cabeçalhos HTTP
 * (`Content-Type` e `Content-Disposition`), que uma action não controla.
 *
 * Os dois formatos servem leitores diferentes. O **CSV** vai para planilha e
 * contador: colunas, separador, números que somam. O **TXT** vai para gente —
 * é o texto que se cola numa mensagem para avisar a escala a um colega ou ao
 * hospital, e por isso é escrito para ser lido, não processado.
 */

const ROTULOS_STATUS: Record<string, string> = {
  pending: "Pendente",
  predicted: "Previsto",
  received: "Recebido",
};

/** "1 plantão" / "2 plantões" — o singular quebrado salta aos olhos no texto. */
function plural(quantidade: number, singular: string, plural: string) {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

const ROTULOS_TIPO: Record<string, string> = {
  extra: "Extra",
  fixed: "Fixo",
  handoff: "Repasse",
};

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

/** Vírgula decimal: com ponto, o Excel em português lê como texto e não soma. */
function numeroBr(valor: number) {
  return String(valor).replace(".", ",");
}

function montarCsv(relatorio: Report, comValores: boolean) {
  const cabecalho = [
    "Profissional",
    "Data",
    "Dia da semana",
    "Unidade",
    "Início",
    "Término",
    "Horas",
    "Duração",
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
        numeroBr(plantao.hours),
        `${plantao.hours}h`,
        ROTULOS_TIPO[plantao.shiftType] ?? plantao.shiftType,
        ...(comValores
          ? [
              plantao.handoffTo ? "" : numeroBr(plantao.value),
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
          "", "", "", "", "",
          numeroBr(relatorio.totals.hours),
          "",
          plural(relatorio.totals.shiftCount, "plantão", "plantões"),
          numeroBr(relatorio.totals.value),
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
  return (
    "﻿" +
    [cabecalho.map(campo), ...linhas, ...total]
      .map((linha) => linha.join(";"))
      .join("\r\n")
  );
}

function montarTxt(relatorio: Report, periodo: string, comValores: boolean) {
  const linhas: string[] = [
    relatorio.user.name,
    [relatorio.user.profession, relatorio.user.specialty]
      .filter(Boolean)
      .join(" · "),
    "",
    `Plantões · ${periodo}`,
    "",
  ];

  for (const unidade of relatorio.byUnit) {
    linhas.push(unidade.unitName.toUpperCase());

    for (const plantao of unidade.shifts) {
      // A duração vem primeiro depois da data: "12h" ou "24h" é o que se quer
      // saber de relance ao ler a escala numa mensagem.
      const partes = [
        `${plantao.dateLabel} (${plantao.weekday})`,
        `${plantao.hours}h`,
        `${plantao.startTime} às ${plantao.endTime}`,
      ];

      if (plantao.handoffTo) {
        partes.push(`repassado a ${plantao.handoffTo}`);
      } else if (comValores) {
        partes.push(formatCurrency(plantao.value));
        partes.push(
          (ROTULOS_STATUS[plantao.paymentStatus] ?? "").toLowerCase(),
        );
      }

      linhas.push(`  ${partes.join(" · ")}`);
    }

    const resumo = [
      plural(
        unidade.shifts.filter((s) => !s.handoffTo).length,
        "plantão",
        "plantões",
      ),
      `${unidade.hours}h`,
    ];

    if (comValores) {
      resumo.push(formatCurrency(unidade.value));
    }

    linhas.push(`  — ${resumo.join(" · ")}`, "");
  }

  const total = [
    plural(relatorio.totals.shiftCount, "plantão", "plantões"),
    `${relatorio.totals.hours}h`,
  ];

  if (comValores) {
    total.push(
      `bruto ${formatCurrency(relatorio.totals.value)}`,
      `recebido ${formatCurrency(relatorio.totals.received)}`,
    );
  }

  linhas.push(`TOTAL: ${total.join(" · ")}`);

  if (relatorio.handedOffCount > 0) {
    linhas.push(
      "",
      relatorio.handedOffCount === 1
        ? "1 plantão foi repassado a outra pessoa — aparece na escala, fora dos totais."
        : `${relatorio.handedOffCount} plantões foram repassados a outras pessoas — aparecem na escala, fora dos totais.`,
    );
  }

  // CRLF: o Bloco de Notas do Windows ainda mostra tudo numa linha só com \n.
  return linhas.join("\r\n");
}

type RouteArg = { params: Promise<{ formato: string }> };

export const GET = withApiAuth<RouteArg>(
  "reports.export",
  async ({ logger, userId }, request, { params }) => {
    const { formato } = await params;

    if (formato !== "csv" && formato !== "txt") {
      return new Response("Formato não suportado.", { status: 404 });
    }

    const searchParams = new URL(request.url).searchParams;
    const hoje = todayAsCalendarDate();
    const ano = Number(searchParams.get("year"));
    const mes = Number(searchParams.get("month"));
    const comValores = searchParams.get("valores") === "1";

    const filtros: ReportFilters = {
      month: Number.isInteger(mes) && mes >= 1 && mes <= 12 ? mes : undefined,
      unitId: searchParams.get("unitId") || undefined,
      year:
        Number.isInteger(ano) && ano >= 2000 && ano <= 2100
          ? ano
          : hoje.getUTCFullYear(),
    };

    const relatorio = await getReport(userId, filtros);
    const periodo = filtros.month
      ? formatMonthLabel(filtros.year, filtros.month)
      : `Ano de ${filtros.year}`;

    const conteudo =
      formato === "csv"
        ? montarCsv(relatorio, comValores)
        : montarTxt(relatorio, periodo, comValores);

    const sufixo = filtros.month
      ? `${filtros.year}-${String(filtros.month).padStart(2, "0")}`
      : String(filtros.year);
    const nome = `plantoes-${sufixo}${comValores ? "-financeiro" : ""}.${formato}`;

    logger.info("report.exported", {
      format: formato,
      shiftCount: relatorio.totals.shiftCount,
      withValues: comValores,
    });

    return new Response(conteudo, {
      headers: {
        "Content-Disposition": `attachment; filename="${nome}"`,
        "Content-Type":
          formato === "csv"
            ? "text/csv; charset=utf-8"
            : "text/plain; charset=utf-8",
      },
    });
  },
);
