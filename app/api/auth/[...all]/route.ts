/**
 * Route Handler do Better Auth.
 * Todas as rotas de auth são tratadas aqui: login, cadastro, logout, sessão, etc.
 * O D1 é acessado via Cloudflare context — nunca exposto ao client.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

async function makeHandlers() {
  const { env } = await getCloudflareContext({ async: true });
  const secret = (env.BETTER_AUTH_SECRET as string | undefined) ?? process.env.BETTER_AUTH_SECRET;
  const auth = createAuth(env.DB, secret);
  return toNextJsHandler(auth.handler);
}

export async function GET(request: Request) {
  const handlers = await makeHandlers();
  return handlers.GET(request);
}

export async function POST(request: Request) {
  const handlers = await makeHandlers();
  return handlers.POST(request);
}
