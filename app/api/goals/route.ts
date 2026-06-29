/**
 * Route Handler: /api/goals
 * CRUD de metas.
 *
 * DB Migration necessária (executar uma vez no Cloudflare D1):
 *   ALTER TABLE goals ADD COLUMN metadata TEXT;
 *
 * A coluna `metadata` armazena em JSON os campos: emoji, priority,
 * goal_type, motivation, steps (GoalStep[]) e completed_at.
 */
import { requireSession } from "@/lib/session";
import { query, execute, generateId } from "@/lib/db";
import { json, unauthorized, badRequest, serverError, parseBody } from "@/lib/api";
import { z } from "zod";

const ALL_CATEGORIES = [
  "pessoal", "profissional", "saude", "financeiro", "estudo",
  "autocuidado", "relacionamentos", "casa", "viagens", "espiritualidade", "sonhos",
] as const;

const stepSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  completed: z.boolean(),
});

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  emoji: z.string().optional(),
  category: z.enum(ALL_CATEGORIES),
  goal_type: z.enum(["simples", "financeira", "etapas"]).optional(),
  priority: z.enum(["essencial", "importante", "desejo"]).optional(),
  motivation: z.string().optional(),
  target: z.number().positive(),
  unit: z.string().optional(),
  deadline: z.string().optional(),
  steps: z.array(stepSchema).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  emoji: z.string().optional(),
  status: z.enum(["active", "completed", "paused"]).optional(),
  progress: z.number().min(0).optional(),
  deadline: z.string().nullable().optional(),
  priority: z.enum(["essencial", "importante", "desejo"]).optional(),
  motivation: z.string().optional(),
  steps: z.array(stepSchema).optional(),
  completed_at: z.string().nullable().optional(),
});

type RawGoal = Record<string, unknown>;

function parseGoal(raw: RawGoal) {
  const metaStr = raw.metadata as string | null | undefined;
  const meta: Record<string, unknown> = metaStr ? JSON.parse(metaStr) : {};
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { metadata: _m, ...rest } = raw;
  return { ...rest, ...meta };
}

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
    return json(goals.map((g) => parseGoal(g as RawGoal)));
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

    const {
      title, description, category, target, unit, deadline,
      emoji, goal_type, priority, motivation, steps,
    } = parsed.data;

    const id = generateId();
    const metadata = JSON.stringify({
      emoji: emoji ?? null,
      priority: priority ?? null,
      goal_type: goal_type ?? "simples",
      motivation: motivation ?? null,
      steps: steps ?? [],
      completed_at: null,
    });

    await execute(
      `INSERT INTO goals
         (id, user_id, title, description, category, target, unit, deadline, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
      id, session.user.id, title, description ?? null,
      category, target, unit ?? null, deadline ?? null, metadata,
    );

    return json({
      id, title, description, category, target, unit, deadline,
      progress: 0, status: "active",
      emoji: emoji ?? null,
      priority: priority ?? null,
      goal_type: goal_type ?? "simples",
      motivation: motivation ?? null,
      steps: steps ?? [],
      completed_at: null,
    }, 201);
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

    const existing = await query(
      "SELECT id, metadata FROM goals WHERE id = ? AND user_id = ?",
      id, session.user.id,
    );
    if (existing.length === 0) return unauthorized();

    const existingMeta: Record<string, unknown> = existing[0].metadata
      ? JSON.parse(existing[0].metadata as string)
      : {};

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (parsed.data.title !== undefined) { updates.push("title = ?"); params.push(parsed.data.title); }
    if (parsed.data.description !== undefined) { updates.push("description = ?"); params.push(parsed.data.description ?? null); }
    if (parsed.data.status !== undefined) { updates.push("status = ?"); params.push(parsed.data.status); }
    if (parsed.data.progress !== undefined) { updates.push("progress = ?"); params.push(parsed.data.progress); }
    if (parsed.data.deadline !== undefined) { updates.push("deadline = ?"); params.push(parsed.data.deadline ?? null); }

    const metaKeys = ["emoji", "priority", "motivation", "steps", "completed_at"] as const;
    const metaChanged = metaKeys.some((k) => parsed.data[k] !== undefined);
    if (metaChanged) {
      const newMeta = { ...existingMeta };
      if (parsed.data.emoji !== undefined) newMeta.emoji = parsed.data.emoji;
      if (parsed.data.priority !== undefined) newMeta.priority = parsed.data.priority;
      if (parsed.data.motivation !== undefined) newMeta.motivation = parsed.data.motivation;
      if (parsed.data.steps !== undefined) newMeta.steps = parsed.data.steps;
      if (parsed.data.completed_at !== undefined) newMeta.completed_at = parsed.data.completed_at ?? null;
      updates.push("metadata = ?");
      params.push(JSON.stringify(newMeta));
    }

    if (updates.length === 0) return json({ success: true });

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
