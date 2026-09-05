export type NavIcon = "home" | "calendar" | "clipboard" | "wallet" | "user";

export type NavItem = {
  href: string;
  icon: NavIcon;
  label: string;
};

export const bottomNavItems: NavItem[] = [
  { href: "/dashboard", icon: "home", label: "Início" },
  { href: "/agenda", icon: "calendar", label: "Agenda" },
  { href: "/plantoes", icon: "clipboard", label: "Plantões" },
  { href: "/financas", icon: "wallet", label: "Finanças" },
  { href: "/perfil", icon: "user", label: "Perfil" },
];

/**
 * Itens que não cabem na barra inferior de cinco posições, mas precisam de
 * acesso direto no desktop.
 */
export const secondaryNavItems: NavItem[] = [
  { href: "/gastos", icon: "wallet", label: "Gastos" },
  { href: "/unidades", icon: "clipboard", label: "Unidades" },
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
