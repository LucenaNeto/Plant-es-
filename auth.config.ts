import type { NextAuthConfig } from "next-auth";
import {
  DEFAULT_PRIVATE_REDIRECT,
  isPrivateRoute,
  isPublicAuthRoute,
  LOGIN_ROUTE,
} from "@/lib/routes";

export const authConfig = {
  callbacks: {
    /**
     * Callback do middleware nativo do Auth.js. Hoje a proteção de rotas é
     * feita por `proxy.ts` (Edge, sem custo de sessão), então este callback não
     * está no caminho de execução — mas fica derivado da mesma fonte de verdade
     * em `lib/routes.ts` para que não possa divergir se um dia for ligado.
     */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = Boolean(auth?.user);

      if (isPrivateRoute(pathname)) {
        return isLoggedIn;
      }

      if (isLoggedIn && isPublicAuthRoute(pathname)) {
        return Response.redirect(
          new URL(DEFAULT_PRIVATE_REDIRECT, request.nextUrl),
        );
      }

      return true;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
  pages: {
    signIn: LOGIN_ROUTE,
  },
  providers: [],
  session: {
    maxAge: 60 * 60 * 24 * 7,
    strategy: "jwt",
  },
} satisfies NextAuthConfig;
