import type { NavIcon } from "@/lib/navigation";

/**
 * Ícones da navegação, em SVG inline.
 *
 * Sem biblioteca de ícones: cinco traçados simples não justificam somar um
 * pacote inteiro ao bundle de um app que roda com internet de hospital.
 * `currentColor` deixa o estado ativo/inativo ser resolvido por classe do
 * Tailwind no elemento pai.
 */
const PATHS: Record<NavIcon, React.ReactNode> = {
  calendar: (
    <>
      <rect height="16" rx="2" width="18" x="3" y="5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  clipboard: (
    <>
      <path d="M9 4h6v3H9z" />
      <path d="M9 5.5H6.5A1.5 1.5 0 0 0 5 7v12a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V7a1.5 1.5 0 0 0-1.5-1.5H15" />
      <path d="M9 12h6M9 16h4" />
    </>
  ),
  report: (
    <>
      <path d="M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M8.5 16.5v-3M12 16.5v-6M15.5 16.5v-4" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 8a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v1" />
      <rect height="11" rx="2" width="16" x="4" y="8" />
      <circle cx="16" cy="13.5" r="1.2" />
    </>
  ),
};

export function NavIconSvg({ name }: { name: NavIcon }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="22"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
      width="22"
    >
      {PATHS[name]}
    </svg>
  );
}
