export type NavIcon =
  | "home"
  | "calendar"
  | "clipboard"
  | "wallet"
  | "user"
  | "report"
  | "more";

export type NavItem = {
  href: string;
  icon: NavIcon;
  label: string;
};

/**
 * As quatro telas do dia a dia, sempre visíveis na barra inferior.
 *
 * A quinta vaga é o botão "Mais", que abre o resto. A versão anterior tinha
 * cinco destinos aqui e deixava Gastos, Unidades e Relatórios **só no
 * desktop** — num app mobile-first, três seções inacessíveis no celular.
 */
export const bottomNavItems: NavItem[] = [
  { href: "/dashboard", icon: "home", label: "Início" },
  { href: "/agenda", icon: "calendar", label: "Agenda" },
  { href: "/plantoes", icon: "clipboard", label: "Plantões" },
  { href: "/financas", icon: "wallet", label: "Finanças" },
];

/**
 * O que abre pelo "Mais" no celular, e fica na lateral no desktop.
 *
 * São destinos de visita ocasional: lançar gasto, cadastrar unidade, tirar
 * relatório, editar o perfil. Perfil saiu da barra fixa porque se visita uma
 * vez por mês, enquanto Finanças se olha toda semana.
 */
export const moreNavItems: NavItem[] = [
  { href: "/gastos", icon: "wallet", label: "Gastos" },
  { href: "/relatorios", icon: "report", label: "Relatórios" },
  { href: "/unidades", icon: "clipboard", label: "Unidades" },
  { href: "/perfil", icon: "user", label: "Perfil" },
];

/**
 * A rota atual corresponde a este item?
 *
 * Compara o segmento inteiro (`/plantoes` ou `/plantoes/...`) em vez de usar
 * `startsWith` puro, que marcaria `/agenda` como ativa ao visitar uma
 * hipotética `/agendamentos`.
 */
export function isActiveNavItem(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
