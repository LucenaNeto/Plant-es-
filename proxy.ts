import { NextResponse, type NextRequest } from "next/server";

const privateRoutes = [
  "/agenda",
  "/dashboard",
  "/financas",
  "/gastos",
  "/perfil",
  "/plantoes",
  "/unidades",
];

const publicAuthRoutes = ["/cadastro", "/login", "/recuperar-senha"];
const sessionCookieNames = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

function hasSessionCookie(request: NextRequest) {
  return sessionCookieNames.some((name) => request.cookies.has(name));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = hasSessionCookie(request);
  const isPrivateRoute = privateRoutes.some((route) => pathname.startsWith(route));

  if (isPrivateRoute && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && publicAuthRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/agenda/:path*",
    "/dashboard/:path*",
    "/financas/:path*",
    "/gastos/:path*",
    "/perfil/:path*",
    "/plantoes/:path*",
    "/unidades/:path*",
    "/login",
    "/cadastro",
    "/recuperar-senha",
  ],
};
