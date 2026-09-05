/**
 * Fonte única de verdade sobre quais rotas exigem sessão.
 *
 * Antes essa lista estava duplicada em `proxy.ts` e `auth.config.ts`. Duas
 * cópias de uma regra de segurança divergem cedo ou tarde, e o modo como
 * divergem é silencioso: uma rota nova protegida em um arquivo e esquecida no
 * outro não quebra nada visível — só deixa a rota aberta.
 *
 * Este módulo roda no Edge runtime (`proxy.ts`), então não pode importar nada
 * de Node, Prisma ou React.
 */

export const PRIVATE_ROUTES = [
  "/agenda",
  "/dashboard",
  "/financas",
  "/gastos",
  "/perfil",
  "/plantoes",
  "/unidades",
] as const;

export const PUBLIC_AUTH_ROUTES = [
  "/cadastro",
  "/login",
  "/recuperar-senha",
] as const;

export const DEFAULT_PRIVATE_REDIRECT = "/dashboard";
export const LOGIN_ROUTE = "/login";

export function isPrivateRoute(pathname: string) {
  return PRIVATE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isPublicAuthRoute(pathname: string) {
  return PUBLIC_AUTH_ROUTES.some((route) => pathname === route);
}
