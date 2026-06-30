/**
 * Route Handler: /api/diary
 * Entradas do diário — dados sensíveis, user_id em toda query.
 */
import { requireSession } from "@/lib/session";
import { query, execute, generateId } from "@/lib/db";
import { json, unauthorized, badRequest, serverError, parseBody } from "@/lib/api";
import { z } from "zod";

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  content: z.string().min(1),
  mood: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).default([]),
});

const updateSchema = z.object({
  content: z.string().min(1).optional(),
  mood: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
});

// GET /api/diary?month=YYYY-MM
export async function GET(request: Request) {
  try {
    const session = await requireSession(request);
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

    const entries = await query(
      "SELECT * FROM diary_entries WHERE user_id = ? AND date LIKE ? ORDER BY date DESC",
      session.user.id, `${month}%`,
    );

    const parsed = entries.map((e) => ({
      ...e,
      tags: JSON.parse(e.tags as string),
    }));

    return json(parsed);
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// POST /api/diary — nova entrada
export async function POST(request: Request) {
  try {
    const session = await requireSession(request);
    const body = await parseBody(request);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

    const { date, content, mood, tags } = parsed.data;
    const id = generateId();

    await execute(
      `INSERT INTO diary_entries (id, user_id, date, content, mood, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
      id, session.user.id, date, content, mood ?? null, JSON.stringify(tags),
    );

    return json({ id, date, content, mood, tags }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// PATCH /api/diary?id=xxx
export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("ID obrigatório");

    const body = await parseBody(request);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

    const existing = await query(
      "SELECT id FROM diary_entries WHERE id = ? AND user_id = ?",
      id, session.user.id,
    );
    if (existing.length === 0) return unauthorized();

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (parsed.data.content !== undefined) { updates.push("content = ?"); params.push(parsed.data.content); }
    if (parsed.data.mood !== undefined) { updates.push("mood = ?"); params.push(parsed.data.mood); }
    if (parsed.data.tags !== undefined) { updates.push("tags = ?"); params.push(JSON.stringify(parsed.data.tags)); }

    updates.push("updated_at = unixepoch()");
    params.push(id, session.user.id);

    await execute(
      `UPDATE diary_entries SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      ...params,
    );

    return json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// DELETE /api/diary?id=xxx
export async function DELETE(request: Request) {
  try {
    const session = await requireSession(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("ID obrigatório");

    await execute(
      "DELETE FROM diary_entries WHERE id = ? AND user_id = ?",
      id, session.user.id,
    );

    return json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
