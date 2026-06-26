/**
 * Helper de sessão para uso em Route Handlers e Server Components.
 * Valida a sessão usando Better Auth e retorna o usuário autenticado.
 * NUNCA usar em código client-side.
 */
import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  plan?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Session = {
  user: SessionUser;
  session: {
    id: string;
    token: string;
    expiresAt: Date;
    userId: string;
  };
};

/**
 * Retorna a sessão do usuário atual ou null se não autenticado.
 * Lança erro se chamado fora do contexto Cloudflare (local dev via `next dev`).
 */
export async function getSession(): Promise<Session | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const auth = createAuth(env.DB);
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    return session as Session | null;
  } catch {
    return null;
  }
}

/**
 * Retorna a sessão ou lança 401 se não autenticado.
 * Usar em Route Handlers que exigem autenticação.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new Response("Não autorizado", { status: 401 });
  }
  return session;
}
