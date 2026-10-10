import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança aplicados a toda resposta.
 *
 * São os quatro que não exigem nada do app em troca: não dependem de inventário
 * de script, não quebram recurso nenhum e não precisam ser revisados a cada
 * tela nova. Valem especialmente num app que fica aberto no navegador do
 * celular, ao lado de outras abas.
 *
 * **Falta aqui a `Content-Security-Policy`**, que é a mais valiosa das cinco e
 * a única que pode quebrar a página: ela exige listar de onde script, estilo e
 * imagem podem vir, e o Next injeta script inline com nonce. Fazer certo é um
 * trabalho próprio, com teste tela a tela — está anotado em `docs/BACKLOG.md`
 * em vez de entrar meia-boca aqui.
 */
const securityHeaders = [
  {
    // Sem isto, um arquivo servido como texto pode ser interpretado como
    // script se o navegador "adivinhar" o tipo.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Impede que o app seja carregado dentro de um iframe de outro site, que
    // é como se monta um clickjacking: a página real por baixo, invisível, e
    // a pessoa clicando no que acha que é outra coisa.
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    // Ao sair para um link externo, manda só a origem — nunca o caminho
    // completo, que aqui carrega mês, unidade e filtros da tela.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // O app não usa câmera, microfone nem localização. Declarar isso fecha a
    // porta para qualquer script de terceiro que venha a pedir.
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ headers: securityHeaders, source: "/:path*" }];
  },
};

export default nextConfig;
