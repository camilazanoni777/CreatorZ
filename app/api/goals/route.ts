/**
 * Route Handler: /api/goals
 * CRUD de metas.
 */
import { requireSession } from "@/lib/session";
import { query, execute, generateId } from "@/lib/db";
import { json, unauthorized, badRequest, serverError, parseBody } from "@/lib/api";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(["pessoal", "profissional", "saude", "financeiro", "estudo"]),
  target: z.number().positive(),
  unit: z.string().optional(),
  deadline: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(["active", "completed", "paused"]).optional(),
  progress: z.number().min(0).optional(),
  deadline: z.string().optional(),
});

// GET /api/goals
export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const sql = status
      ? "SELECT * FROM goals WHERE user_id = ? AND status = ? ORDER BY created_at DESC"
      : "SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC";
    const params = status ? [session.user.id, status] : [session.user.id];

    const goals = await query(sql, ...params);
    return json(goals);
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// POST /api/goals
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await parseBody(request);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

    const { title, description, category, target, unit, deadline } = parsed.data;
    const id = generateId();

    await execute(
      `INSERT INTO goals (id, user_id, title, description, category, target, unit, deadline, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
      id, session.user.id, title, description ?? null, category, target, unit ?? null, deadline ?? null,
    );

    return json({ id, title, description, category, target, unit, deadline, progress: 0, status: "active" }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// PATCH /api/goals?id=xxx
export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("ID obrigatório");

    const body = await parseBody(request);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

    const existing = await query("SELECT id FROM goals WHERE id = ? AND user_id = ?", id, session.user.id);
    if (existing.length === 0) return unauthorized();

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (parsed.data.title !== undefined) { updates.push("title = ?"); params.push(parsed.data.title); }
    if (parsed.data.description !== undefined) { updates.push("description = ?"); params.push(parsed.data.description); }
    if (parsed.data.status !== undefined) { updates.push("status = ?"); params.push(parsed.data.status); }
    if (parsed.data.progress !== undefined) { updates.push("progress = ?"); params.push(parsed.data.progress); }
    if (parsed.data.deadline !== undefined) { updates.push("deadline = ?"); params.push(parsed.data.deadline ?? null); }

    updates.push("updated_at = unixepoch()");
    params.push(id, session.user.id);

    await execute(
      `UPDATE goals SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      ...params,
    );

    return json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// DELETE /api/goals?id=xxx
export async function DELETE(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("ID obrigatório");

    await execute("DELETE FROM goals WHERE id = ? AND user_id = ?", id, session.user.id);
    return json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
