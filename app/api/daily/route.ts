/**
 * Route Handler: /api/daily
 * Upsert de rotina diária (morning/evening checks + intenção + gratidão).
 */
import { requireSession } from "@/lib/session";
import { queryOne, execute, generateId } from "@/lib/db";
import { json, badRequest, serverError, parseBody } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  morning_checks: z.array(z.object({
    id: z.string(),
    label: z.string(),
    checked: z.boolean(),
  })).default([]),
  evening_checks: z.array(z.object({
    id: z.string(),
    label: z.string(),
    checked: z.boolean(),
  })).default([]),
  intention: z.string().optional(),
  gratitude: z.string().optional(),
});

// GET /api/daily?date=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

    const entry = await queryOne(
      "SELECT * FROM daily_entries WHERE user_id = ? AND date = ?",
      session.user.id, date,
    );

    if (!entry) return json(null);

    return json({
      ...entry,
      morning_checks: JSON.parse(entry.morning_checks as string),
      evening_checks: JSON.parse(entry.evening_checks as string),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// POST /api/daily — upsert
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await parseBody(request);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

    const { date, morning_checks, evening_checks, intention, gratitude } = parsed.data;

    const existing = await queryOne(
      "SELECT id FROM daily_entries WHERE user_id = ? AND date = ?",
      session.user.id, date,
    );

    if (existing) {
      await execute(
        `UPDATE daily_entries SET morning_checks = ?, evening_checks = ?, intention = ?, gratitude = ?, updated_at = unixepoch()
         WHERE user_id = ? AND date = ?`,
        JSON.stringify(morning_checks),
        JSON.stringify(evening_checks),
        intention ?? null,
        gratitude ?? null,
        session.user.id,
        date,
      );
      return json({ ...existing, morning_checks, evening_checks, intention, gratitude });
    } else {
      const id = generateId();
      await execute(
        `INSERT INTO daily_entries (id, user_id, date, morning_checks, evening_checks, intention, gratitude, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
        id, session.user.id, date,
        JSON.stringify(morning_checks),
        JSON.stringify(evening_checks),
        intention ?? null,
        gratitude ?? null,
      );
      return json({ id, date, morning_checks, evening_checks, intention, gratitude }, 201);
    }
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
