/**
 * Route Handler: /api/events
 * CRUD de eventos da agenda.
 */
import { requireSession } from "@/lib/session";
import { query, execute, generateId } from "@/lib/db";
import { json, unauthorized, badRequest, serverError, parseBody } from "@/lib/api";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  start_date: z.string(),
  end_date: z.string().optional(),
  all_day: z.boolean().default(false),
  color: z.string().default("#7c3aed"),
});

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  all_day: z.boolean().optional(),
  color: z.string().optional(),
});

// GET /api/events?month=YYYY-MM
export async function GET(request: Request) {
  try {
    const session = await requireSession(request);
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

    const events = await query(
      "SELECT * FROM calendar_events WHERE user_id = ? AND start_date LIKE ? ORDER BY start_date ASC",
      session.user.id, `${month}%`,
    );

    return json(events);
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// POST /api/events
export async function POST(request: Request) {
  try {
    const session = await requireSession(request);
    const body = await parseBody(request);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

    const { title, description, start_date, end_date, all_day, color } = parsed.data;
    const id = generateId();

    await execute(
      `INSERT INTO calendar_events (id, user_id, title, description, start_date, end_date, all_day, color, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
      id, session.user.id, title, description ?? null, start_date, end_date ?? null, all_day ? 1 : 0, color,
    );

    return json({ id, title, description, start_date, end_date, all_day, color }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// PATCH /api/events?id=xxx
export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("ID obrigatório");

    const body = await parseBody(request);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

    const existing = await query("SELECT id FROM calendar_events WHERE id = ? AND user_id = ?", id, session.user.id);
    if (existing.length === 0) return unauthorized();

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (parsed.data.title !== undefined) { updates.push("title = ?"); params.push(parsed.data.title); }
    if (parsed.data.description !== undefined) { updates.push("description = ?"); params.push(parsed.data.description); }
    if (parsed.data.start_date !== undefined) { updates.push("start_date = ?"); params.push(parsed.data.start_date); }
    if (parsed.data.end_date !== undefined) { updates.push("end_date = ?"); params.push(parsed.data.end_date ?? null); }
    if (parsed.data.all_day !== undefined) { updates.push("all_day = ?"); params.push(parsed.data.all_day ? 1 : 0); }
    if (parsed.data.color !== undefined) { updates.push("color = ?"); params.push(parsed.data.color); }

    params.push(id, session.user.id);

    await execute(
      `UPDATE calendar_events SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      ...params,
    );

    return json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// DELETE /api/events?id=xxx
export async function DELETE(request: Request) {
  try {
    const session = await requireSession(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("ID obrigatório");

    await execute("DELETE FROM calendar_events WHERE id = ? AND user_id = ?", id, session.user.id);
    return json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
