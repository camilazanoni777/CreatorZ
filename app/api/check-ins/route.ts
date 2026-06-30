/**
 * Route Handler: /api/check-ins
 * Dados emocionais — altamente sensíveis, user_id em toda query.
 */
import { requireSession } from "@/lib/session";
import { query, queryOne, execute, generateId } from "@/lib/db";
import { json, badRequest, serverError, parseBody } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  note: z.string().optional(),
});

// GET /api/check-ins?month=YYYY-MM
export async function GET(request: Request) {
  try {
    const session = await requireSession(request);
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

    const checkIns = await query(
      "SELECT * FROM check_ins WHERE user_id = ? AND date LIKE ? ORDER BY date DESC",
      session.user.id, `${month}%`,
    );

    return json(checkIns);
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// POST /api/check-ins — upsert do check-in do dia
export async function POST(request: Request) {
  try {
    const session = await requireSession(request);
    const body = await parseBody(request);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

    const { date, mood, energy, note } = parsed.data;

    const existing = await queryOne(
      "SELECT id FROM check_ins WHERE user_id = ? AND date = ?",
      session.user.id, date,
    );

    if (existing) {
      await execute(
        "UPDATE check_ins SET mood = ?, energy = ?, note = ? WHERE user_id = ? AND date = ?",
        mood, energy, note ?? null, session.user.id, date,
      );
      return json({ ...existing, mood, energy, note });
    } else {
      const id = generateId();
      await execute(
        "INSERT INTO check_ins (id, user_id, date, mood, energy, note, created_at) VALUES (?, ?, ?, ?, ?, ?, unixepoch())",
        id, session.user.id, date, mood, energy, note ?? null,
      );
      return json({ id, date, mood, energy, note }, 201);
    }
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
