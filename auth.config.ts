import type { NextAuthConfig } from "next-auth";

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

export const authConfig = {
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = Boolean(auth?.user);
      const isPrivateRoute = privateRoutes.some((route) =>
        pathname.startsWith(route),
      );

      if (isPrivateRoute) {
        return isLoggedIn;
      }

      if (isLoggedIn && publicAuthRoutes.includes(pathname)) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
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
    signIn: "/login",
  },
  providers: [],
  session: {
    maxAge: 60 * 60 * 24 * 7,
    strategy: "jwt",
  },
} satisfies NextAuthConfig;
