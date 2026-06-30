import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PRIVATE_PATHS = [
  "/hoje",
  "/agenda",
  "/daily",
  "/habitos",
  "/check-in",
  "/financas",
  "/metas",
  "/diario",
  "/tarefas",
  "/perfil",
  "/mais",
];

const AUTH_ONLY_PATHS = ["/login", "/cadastro"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Better Auth salva a sessão no cookie "better-auth.session_token"
  const hasSession = request.cookies.has("better-auth.session_token");

  const isPrivate = PRIVATE_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  const isAuthOnly = AUTH_ONLY_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  // Visitante tentando acessar rota privada → login com ?next=<rota>
  if (!hasSession && isPrivate) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Usuária logada tentando acessar login/cadastro → dashboard
  if (hasSession && isAuthOnly) {
    const url = request.nextUrl.clone();
    url.pathname = "/hoje";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
