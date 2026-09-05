import type { MetadataRoute } from "next";

/**
 * Manifesto do PWA.
 *
 * Instalar na tela inicial não é enfeite para este app: o uso acontece com o
 * celular na mão, muitas vezes dentro do hospital e com internet ruim. Um
 * atalho que abre em tela cheia, sem barra de endereço, é a diferença entre
 * "abrir o app" e "achar o site no navegador".
 *
 * `start_url` aponta para `/dashboard` — quem instalou já tem conta, e cair na
 * raiz só produziria um redirecionamento a mais.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#fafaf9",
    categories: ["medical", "productivity", "finance"],
    description:
      "Organizador pessoal de plantões e controle financeiro para profissionais da saúde.",
    display: "standalone",
    icons: [
      {
        purpose: "any",
        sizes: "192x192",
        src: "/icon/192",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "512x512",
        src: "/icon/512",
        type: "image/png",
      },
      // `maskable` deixa o Android recortar no formato do lançador sem cortar
      // o conteúdo. Como o ícone é fundo sólido com a marca centralizada, ele
      // sobrevive a qualquer máscara.
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/icon/512",
        type: "image/png",
      },
    ],
    lang: "pt-BR",
    name: "Plantões+",
    orientation: "portrait",
    short_name: "Plantões+",
    start_url: "/dashboard",
    theme_color: "#09090b",
  };
}
