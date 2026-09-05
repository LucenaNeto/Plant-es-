import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_PRIVATE_REDIRECT,
  isPrivateRoute,
  isPublicAuthRoute,
  LOGIN_ROUTE,
} from "@/lib/routes";

/**
 * `proxy.ts` roda no Edge runtime, antes de qualquer render. Aqui a checagem é
 * deliberadamente rasa: só a *presença* do cookie de sessão, sem validar
 * assinatura (o que exigiria o segredo e uma ida ao banco em toda navegação).
 *
 * Isso é seguro porque este arquivo é otimização de UX, não a fronteira de
 * segurança. A fronteira real é a verificação de sessão no servidor — em
 * `requireSession()` nas páginas e em `runAuthenticatedAction()` nas actions.
 * Um cookie forjado passa por aqui e é barrado lá.
 */

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

function hasSessionCookie(request: NextRequest) {
  return SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = hasSessionCookie(request);

  if (isPrivateRoute(pathname) && !hasSession) {
    const loginUrl = new URL(LOGIN_ROUTE, request.url);

    // Só o caminho relativo, nunca a URL absoluta: `callbackUrl` com host
    // externo é vetor clássico de open redirect.
    loginUrl.searchParams.set(
      "callbackUrl",
      `${pathname}${request.nextUrl.search}`,
    );

    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && isPublicAuthRoute(pathname)) {
    return NextResponse.redirect(
      new URL(DEFAULT_PRIVATE_REDIRECT, request.url),
    );
  }

  return NextResponse.next();
}

/**
 * O `matcher` precisa ser literal estático — o compilador do Next o lê em
 * build time e não consegue avaliar uma constante importada.
 *
 * Em vez de manter aqui uma segunda lista de rotas (que é exatamente a
 * duplicação que este bloco veio eliminar), o matcher é deliberadamente amplo e
 * quem decide é `isPrivateRoute` / `isPublicAuthRoute`, acima. Assim, registrar
 * uma rota nova em `lib/routes.ts` passa a bastar: não existe mais o modo de
 * falha "protegi a rota mas esqueci de incluí-la no matcher".
 *
 * Exclusões: `/api` (as rotas REST fazem a própria checagem em `withApiAuth`, e
 * redirecionar um fetch para o HTML de /login quebraria o cliente), os assets
 * internos do Next e qualquer caminho com extensão de arquivo.
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
