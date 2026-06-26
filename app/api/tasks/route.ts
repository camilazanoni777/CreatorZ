/**
 * Route Handler: /api/tasks
 * Operações CRUD de tarefas.
 * Toda query inclui user_id para garantir isolamento de dados.
 */
import { requireSession } from "@/lib/session";
import { query, execute, generateId } from "@/lib/db";
import { json, unauthorized, badRequest, serverError, parseBody } from "@/lib/api";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  due_date: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(["todo", "doing", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  due_date: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// GET /api/tasks — lista as tarefas do usuário
export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let sql = "SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC";
    const params: (string | number)[] = [session.user.id];

    if (status) {
      sql = "SELECT * FROM tasks WHERE user_id = ? AND status = ? ORDER BY created_at DESC";
      params.push(status);
    }

    const tasks = await query(sql, ...params);
    const parsed = tasks.map((t) => ({
      ...t,
      tags: JSON.parse(t.tags as string),
    }));

    return json(parsed);
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// POST /api/tasks — cria uma nova tarefa
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await parseBody(request);
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message);
    }

    const { title, description, priority, due_date, tags } = parsed.data;
    const id = generateId();

    await execute(
      `INSERT INTO tasks (id, user_id, title, description, priority, due_date, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
      id,
      session.user.id,
      title,
      description ?? null,
      priority,
      due_date ?? null,
      JSON.stringify(tags),
    );

    return json({ id, title, description, priority, due_date, tags, status: "todo" }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// PATCH /api/tasks?id=xxx — atualiza uma tarefa
export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("ID obrigatório");

    const body = await parseBody(request);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

    // Verifica se a tarefa pertence ao usuário antes de editar
    const existing = await query(
      "SELECT id FROM tasks WHERE id = ? AND user_id = ?",
      id,
      session.user.id,
    );
    if (existing.length === 0) return unauthorized();

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (parsed.data.title !== undefined) { updates.push("title = ?"); params.push(parsed.data.title); }
    if (parsed.data.description !== undefined) { updates.push("description = ?"); params.push(parsed.data.description); }
    if (parsed.data.status !== undefined) { updates.push("status = ?"); params.push(parsed.data.status); }
    if (parsed.data.priority !== undefined) { updates.push("priority = ?"); params.push(parsed.data.priority); }
    if (parsed.data.due_date !== undefined) { updates.push("due_date = ?"); params.push(parsed.data.due_date ?? null); }
    if (parsed.data.tags !== undefined) { updates.push("tags = ?"); params.push(JSON.stringify(parsed.data.tags)); }

    updates.push("updated_at = unixepoch()");
    params.push(id, session.user.id);

    await execute(
      `UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      ...params,
    );

    return json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// DELETE /api/tasks?id=xxx — remove uma tarefa
export async function DELETE(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("ID obrigatório");

    // user_id na query garante que o usuário só apaga o que é dele
    await execute(
      "DELETE FROM tasks WHERE id = ? AND user_id = ?",
      id,
      session.user.id,
    );

    return json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
