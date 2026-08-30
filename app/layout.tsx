import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plantões+",
  description: "Organizador pessoal de plantões e finanças para profissionais da saúde",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full bg-stone-50 text-zinc-950">{children}</body>
    </html>
  );
}
