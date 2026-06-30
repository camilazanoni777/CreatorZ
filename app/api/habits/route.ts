/**
 * Route Handler: /api/habits
 * CRUD de hábitos + logs diários.
 */
import { requireSession } from "@/lib/session";
import { query, execute, generateId } from "@/lib/db";
import { json, badRequest, serverError, parseBody } from "@/lib/api";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  frequency: z.enum(["daily", "weekly"]).default("daily"),
  color: z.string().default("#7c3aed"),
  icon: z.string().optional(),
});

// GET /api/habits?month=YYYY-MM — hábitos + logs do mês
export async function GET(request: Request) {
  try {
    const session = await requireSession(request);
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

    const habits = await query(
      "SELECT * FROM habits WHERE user_id = ? ORDER BY created_at ASC",
      session.user.id,
    );

    const logs = await query(
      "SELECT * FROM habit_logs WHERE user_id = ? AND date LIKE ?",
      session.user.id,
      `${month}%`,
    );

    return json({ habits, logs });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// POST /api/habits — cria hábito
export async function POST(request: Request) {
  try {
    const session = await requireSession(request);
    const body = await parseBody(request);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

    const { title, description, frequency, color, icon } = parsed.data;
    const id = generateId();

    await execute(
      `INSERT INTO habits (id, user_id, title, description, frequency, color, icon, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
      id, session.user.id, title, description ?? null, frequency, color, icon ?? null,
    );

    return json({ id, title, description, frequency, color, icon }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// DELETE /api/habits?id=xxx — remove hábito
export async function DELETE(request: Request) {
  try {
    const session = await requireSession(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("ID obrigatório");

    await execute("DELETE FROM habits WHERE id = ? AND user_id = ?", id, session.user.id);
    return json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
