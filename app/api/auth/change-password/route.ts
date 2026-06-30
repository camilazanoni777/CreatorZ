/**
 * POST /api/auth/change-password
 * Altera a senha usando a API server-side do Better Auth.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth";
import { requireSession } from "@/lib/session";
import { json, badRequest, serverError, parseBody } from "@/lib/api";
import { headers } from "next/headers";
import { z } from "zod";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8, "A nova senha deve ter no mínimo 8 caracteres"),
});

export async function POST(request: Request) {
  try {
    await requireSession(request);

    const body = await parseBody(request);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

    const { env } = await getCloudflareContext({ async: true });
    const secret = (env.BETTER_AUTH_SECRET as string | undefined) ?? process.env.BETTER_AUTH_SECRET;
    const auth = createAuth(env.DB, secret);
    const headersList = await headers();

    await auth.api.changePassword({
      headers: headersList,
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword:     parsed.data.newPassword,
        revokeOtherSessions: false,
      },
    });

    return json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    // Better Auth lança erro específico para senha incorreta
    if (err instanceof Error && err.message.toLowerCase().includes("password")) {
      return badRequest("Senha atual incorreta.");
    }
    return serverError(err);
  }
}
