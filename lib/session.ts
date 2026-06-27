import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth";

const VISITOR_USER_ID = "visitor";

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

async function getVisitorSession(): Promise<Session> {
  const { env } = await getCloudflareContext({ async: true });
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT OR IGNORE INTO "user" (id, name, email, emailVerified, image, createdAt, updatedAt)
       VALUES (?, ?, ?, 1, NULL, unixepoch(), unixepoch())`,
    ).bind(VISITOR_USER_ID, "Visitante", "visitante@creatorz.local"),
    env.DB.prepare(
      `INSERT OR IGNORE INTO profiles (id, plan, timezone, created_at, updated_at)
       VALUES (?, 'free', 'America/Sao_Paulo', unixepoch(), unixepoch())`,
    ).bind(VISITOR_USER_ID),
  ]);

  return {
    user: {
      id: VISITOR_USER_ID,
      name: "Visitante",
      email: "visitante@creatorz.local",
      emailVerified: true,
      image: null,
      plan: "free",
      createdAt: now,
      updatedAt: now,
    },
    session: {
      id: "visitor-session",
      token: "visitor-session",
      expiresAt,
      userId: VISITOR_USER_ID,
    },
  };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  return session ?? getVisitorSession();
}
