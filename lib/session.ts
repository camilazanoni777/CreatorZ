import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth";
import { unauthorized } from "@/lib/api";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  status?: string;
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

export async function getSession(): Promise<Session | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const auth = createAuth(env.DB);
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user?.id) return null;

    const user = await env.DB.prepare(
      `SELECT status, deleted_at
       FROM "user"
       WHERE id = ?`,
    ).bind(session.user.id).first<{ status?: string | null; deleted_at?: number | null }>();

    if (user?.deleted_at || user?.status === "deleted" || user?.status === "suspended") {
      return null;
    }

    return {
      ...(session as Session),
      user: {
        ...(session.user as SessionUser),
        status: user?.status ?? "active",
      },
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw unauthorized();
  return session;
}
