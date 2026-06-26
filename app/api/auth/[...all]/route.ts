/**
 * Route Handler do Better Auth.
 * Todas as rotas de auth são tratadas aqui: login, cadastro, logout, sessão, etc.
 * O D1 é acessado via Cloudflare context — nunca exposto ao client.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export async function GET(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const auth = createAuth(env.DB);
  const handlers = toNextJsHandler(auth.handler);
  return handlers.GET(request);
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const auth = createAuth(env.DB);
  const handlers = toNextJsHandler(auth.handler);
  return handlers.POST(request);
}
