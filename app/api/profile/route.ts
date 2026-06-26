/**
 * Route Handler: /api/profile
 * Perfil do usuário (dados do Better Auth + extensão profiles).
 */
import { requireSession } from "@/lib/session";
import { queryOne, execute } from "@/lib/db";
import { json, badRequest, serverError, parseBody } from "@/lib/api";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  timezone: z.string().optional(),
});

// GET /api/profile — retorna dados do usuário + perfil
export async function GET() {
  try {
    const session = await requireSession();

    const profile = await queryOne(
      "SELECT * FROM profiles WHERE id = ?",
      session.user.id,
    );

    return json({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
      plan: (profile?.plan as string) ?? "free",
      timezone: (profile?.timezone as string) ?? "America/Sao_Paulo",
      createdAt: session.user.createdAt,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// PATCH /api/profile — atualiza nome / timezone
export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const body = await parseBody(request);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

    const { name, timezone } = parsed.data;

    if (name !== undefined) {
      await execute(
        "UPDATE user SET name = ?, updatedAt = unixepoch() WHERE id = ?",
        name, session.user.id,
      );
    }

    if (timezone !== undefined) {
      const existingProfile = await queryOne("SELECT id FROM profiles WHERE id = ?", session.user.id);
      if (existingProfile) {
        await execute(
          "UPDATE profiles SET timezone = ?, updated_at = unixepoch() WHERE id = ?",
          timezone, session.user.id,
        );
      } else {
        await execute(
          "INSERT INTO profiles (id, timezone, created_at, updated_at) VALUES (?, ?, unixepoch(), unixepoch())",
          session.user.id, timezone,
        );
      }
    }

    return json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
