/**
 * Route Handler: /api/profile
 * Perfil completo: dados pessoais, preferências e exclusão de conta.
 */
import { requireSession } from "@/lib/session";
import { queryOne, execute, getDB } from "@/lib/db";
import { json, badRequest, serverError, parseBody } from "@/lib/api";
import { z } from "zod";

const updateSchema = z.object({
  name:                     z.string().min(1).max(255).optional(),
  display_name:             z.string().max(100).optional(),
  bio:                      z.string().max(500).optional(),
  city:                     z.string().max(100).optional(),
  timezone:                 z.string().optional(),
  theme_preference:         z.enum(["light", "dark", "system"]).optional(),
  notifications_enabled:    z.boolean().optional(),
  daily_reminder_time:      z.string().regex(/^\d{2}:\d{2}$/).optional(),
  financial_values_visible: z.boolean().optional(),
  week_start:               z.enum(["monday", "sunday"]).optional(),
  language:                 z.string().optional(),
});

type ProfileRow = {
  plan?: string | null;
  timezone?: string | null;
  display_name?: string | null;
  bio?: string | null;
  city?: string | null;
  avatar_url?: string | null;
  theme_preference?: string | null;
  notifications_enabled?: number | null;
  daily_reminder_time?: string | null;
  financial_values_visible?: number | null;
  week_start?: string | null;
  language?: string | null;
};

// GET /api/profile
export async function GET(request: Request) {
  try {
    const session = await requireSession(request);

    const profile = await queryOne<ProfileRow>(
      "SELECT * FROM profiles WHERE id = ?",
      session.user.id,
    );

    return json({
      id:                       session.user.id,
      name:                     session.user.name,
      email:                    session.user.email,
      image:                    session.user.image ?? profile?.avatar_url ?? null,
      plan:                     profile?.plan ?? "free",
      display_name:             profile?.display_name ?? null,
      bio:                      profile?.bio ?? null,
      city:                     profile?.city ?? null,
      timezone:                 profile?.timezone ?? "America/Sao_Paulo",
      theme_preference:         profile?.theme_preference ?? "system",
      notifications_enabled:    profile?.notifications_enabled !== 0,
      daily_reminder_time:      profile?.daily_reminder_time ?? "08:00",
      financial_values_visible: profile?.financial_values_visible !== 0,
      week_start:               profile?.week_start ?? "monday",
      language:                 profile?.language ?? "pt-BR",
      createdAt:                session.user.createdAt,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// PATCH /api/profile
export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request);
    const body = await parseBody(request);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

    const data = parsed.data;

    // Atualiza nome na tabela user (gerenciada pelo Better Auth)
    if (data.name !== undefined) {
      await execute(
        `UPDATE "user" SET name = ?, updatedAt = unixepoch() WHERE id = ?`,
        data.name,
        session.user.id,
      );
    }

    // Verifica se existe perfil
    const existing = await queryOne("SELECT id FROM profiles WHERE id = ?", session.user.id);

    // Campos do perfil a atualizar
    const profileFields: Record<string, string | number | null> = {};
    if (data.display_name             !== undefined) profileFields.display_name             = data.display_name;
    if (data.bio                      !== undefined) profileFields.bio                      = data.bio;
    if (data.city                     !== undefined) profileFields.city                     = data.city;
    if (data.timezone                 !== undefined) profileFields.timezone                 = data.timezone;
    if (data.theme_preference         !== undefined) profileFields.theme_preference         = data.theme_preference;
    if (data.notifications_enabled    !== undefined) profileFields.notifications_enabled    = data.notifications_enabled ? 1 : 0;
    if (data.daily_reminder_time      !== undefined) profileFields.daily_reminder_time      = data.daily_reminder_time;
    if (data.financial_values_visible !== undefined) profileFields.financial_values_visible = data.financial_values_visible ? 1 : 0;
    if (data.week_start               !== undefined) profileFields.week_start               = data.week_start;
    if (data.language                 !== undefined) profileFields.language                 = data.language;

    if (Object.keys(profileFields).length > 0) {
      profileFields.updated_at = "unixepoch()";

      if (existing) {
        const sets = Object.keys(profileFields)
          .map((k) => (k === "updated_at" ? `updated_at = unixepoch()` : `${k} = ?`))
          .join(", ");
        const values = Object.entries(profileFields)
          .filter(([k]) => k !== "updated_at")
          .map(([, v]) => v as string | number | null);

        await execute(
          `UPDATE profiles SET ${sets} WHERE id = ?`,
          ...values,
          session.user.id,
        );
      } else {
        const cols = ["id", ...Object.keys(profileFields).filter((k) => k !== "updated_at")];
        const placeholders = cols.map(() => "?").join(", ");
        const values = [
          session.user.id,
          ...Object.entries(profileFields)
            .filter(([k]) => k !== "updated_at")
            .map(([, v]) => v as string | number | null),
        ];

        await execute(
          `INSERT INTO profiles (${cols.join(", ")}, created_at, updated_at)
           VALUES (${placeholders}, unixepoch(), unixepoch())`,
          ...values,
        );
      }
    }

    return json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// DELETE /api/profile — exclui a conta permanentemente
export async function DELETE(request: Request) {
  try {
    const session = await requireSession(request);
    const body = await parseBody<{ confirm?: string }>(request);

    if (body?.confirm !== "DELETAR") {
      return badRequest("Confirmação incorreta. Digite DELETAR para confirmar.");
    }

    const db = await getDB();

    // Todas as tabelas com user_id têm ON DELETE CASCADE via FK.
    // Basta deletar o usuário — o banco limpa o resto.
    await db.prepare(`DELETE FROM "user" WHERE id = ?`).bind(session.user.id).run();

    return json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
