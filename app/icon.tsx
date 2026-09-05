import { ImageResponse } from "next/og";

/**
 * Ícone do app, gerado em build em vez de versionado como binário.
 *
 * Os dois tamanhos são os que o manifesto do PWA exige: 192 para o atalho na
 * tela inicial do Android e 512 para a splash de instalação. Gerando por
 * código, a identidade visual fica junto do resto do tema — mudar a cor da
 * marca não exige reabrir um editor de imagem.
 *
 * O ids viram as rotas `/icon/192` e `/icon/512`, referenciadas em
 * `app/manifest.ts`.
 */
export function generateImageMetadata() {
  return [
    { alt: "Plantões+", contentType: "image/png", id: "192", size: { height: 192, width: 192 } },
    { alt: "Plantões+", contentType: "image/png", id: "512", size: { height: 512, width: 512 } },
  ];
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const iconId = await id;
  const size = Number(iconId);

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#09090b",
          color: "#5eead4",
          display: "flex",
          fontSize: size * 0.5,
          fontWeight: 700,
          height: "100%",
          justifyContent: "center",
          letterSpacing: -size * 0.02,
          width: "100%",
        }}
      >
        P+
      </div>
    ),
    { height: size, width: size },
  );
}
