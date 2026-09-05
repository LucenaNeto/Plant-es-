import { ImageResponse } from "next/og";

/**
 * Ícone do atalho no iOS. Separado de `icon.tsx` porque o iOS não aplica
 * cantos arredondados sozinho em todos os contextos e ignora transparência —
 * então o fundo é sempre sólido e ocupa o quadrado inteiro.
 */
export const size = { height: 180, width: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#09090b",
          color: "#5eead4",
          display: "flex",
          fontSize: 88,
          fontWeight: 700,
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        P+
      </div>
    ),
    size,
  );
}
