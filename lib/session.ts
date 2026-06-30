import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth";
import { unauthorized } from "@/lib/api";
import type { SessionUser } from "@/types";

export type { SessionUser };

export type Session = {
  user: SessionUser;
  session: {
    id: string;
    token: string;
    expiresAt: Date;
    userId: string;
  };
};

export async function getSession(req?: Request): Promise<Session | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const secret = (env.BETTER_AUTH_SECRET as string | undefined) ?? process.env.BETTER_AUTH_SECRET;
    const auth = createAuth(env.DB, secret);
    // Route Handlers: use request.headers directly (avoids next/headers async context issues).
    // Server Components / layouts: fall back to headers() from next/headers.
    const hdrs = req ? req.headers : await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    if (!session?.user?.id) return null;
    return session as Session;
  } catch {
    return null;
  }
}

export async function requireSession(req?: Request): Promise<Session> {
  const session = await getSession(req);
  if (!session) throw unauthorized();
  return session;
}
