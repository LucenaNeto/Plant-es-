import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Plantões+",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Plantões+",
  },
  description:
    "Organizador pessoal de plantões e controle financeiro para profissionais da saúde.",
  /**
   * O `template` faz cada página contribuir só com o próprio nome — a aba do
   * navegador mostra "Agenda · Plantões+" sem que nenhuma página repita a
   * marca. O `default` cobre as rotas que não declaram título.
   */
  title: {
    default: "Plantões+",
    template: "%s · Plantões+",
  },
};

export const viewport: Viewport = {
  initialScale: 1,
  /**
   * `viewportFit: "cover"` é o que habilita `env(safe-area-inset-*)`, usado na
   * barra de navegação inferior para ela não ficar embaixo do indicador de
   * home do iPhone.
   */
  viewportFit: "cover",
  themeColor: "#09090b",
  width: "device-width",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full bg-stone-50 text-zinc-950">{children}</body>
    </html>
  );
}
