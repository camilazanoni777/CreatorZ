/**
 * Route Handler: /api/goals
 * CRUD de metas com suporte a 11 categorias, tipos e etapas.
 *
 * O campo `category` do DB só aceita os 5 valores originais via CHECK constraint.
 * As 6 categorias novas são armazenadas em metadata.category (JSON) e
 * retornadas corretamente ao cliente via parseGoal().
 *
 * Migration necessária (0005_goals_redesign.sql):
 *   ALTER TABLE goals ADD COLUMN metadata TEXT;
 *   ALTER TABLE goals ADD COLUMN completed_at INTEGER;
 *   CREATE TABLE goal_steps ...
 */
import { requireSession } from "@/lib/session";
import { query, execute, generateId } from "@/lib/db";
import { json, unauthorized, badRequest, serverError, parseBody } from "@/lib/api";
import { z } from "zod";

const ALL_CATEGORIES = [
  "pessoal", "profissional", "saude", "financeiro", "estudo",
  "autocuidado", "relacionamentos", "casa", "viagens", "espiritualidade", "sonhos",
] as const;

// Mapeia as 11 categorias para os 5 valores aceitos pelo CHECK constraint do DB.
// A categoria real fica em metadata.category e é preferida na leitura via parseGoal().
const DB_CATEGORY: Record<string, string> = {
  financeiro:      "financeiro",
  profissional:    "profissional",
  saude:           "saude",
  estudo:          "estudo",
  pessoal:         "pessoal",
  autocuidado:     "pessoal",
  relacionamentos: "pessoal",
  casa:            "pessoal",
  viagens:         "pessoal",
  espiritualidade: "pessoal",
  sonhos:          "pessoal",
};

const stepSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  completed: z.boolean(),
});

const createSchema = z.object({
  title:       z.string().min(1).max(255),
  description: z.string().optional(),
  emoji:       z.string().optional(),
  category:    z.enum(ALL_CATEGORIES),
  goal_type:   z.enum(["simples", "financeira", "etapas"]).optional(),
  priority:    z.enum(["essencial", "importante", "desejo"]).optional(),
  motivation:  z.string().optional(),
  target:      z.number().positive(),
  unit:        z.string().optional(),
  deadline:    z.string().optional(),
  steps:       z.array(stepSchema).optional(),
});

const updateSchema = z.object({
  title:        z.string().min(1).max(255).optional(),
  description:  z.string().optional(),
  emoji:        z.string().optional(),
  category:     z.enum(ALL_CATEGORIES).optional(),
  goal_type:    z.enum(["simples", "financeira", "etapas"]).optional(),
  status:       z.enum(["active", "completed", "paused"]).optional(),
  progress:     z.number().min(0).optional(),
  target:       z.number().positive().optional(),
  unit:         z.string().nullable().optional(),
  deadline:     z.string().nullable().optional(),
  priority:     z.enum(["essencial", "importante", "desejo"]).optional(),
  motivation:   z.string().optional(),
  steps:        z.array(stepSchema).optional(),
  completed_at: z.string().nullable().optional(),
});

type RawGoal = Record<string, unknown>;

/**
 * Achata a coluna `metadata` (JSON) sobre o resto da linha.
 * metadata.category tem precedência sobre a coluna category do DB,
 * permitindo as 11 categorias mesmo com o CHECK constraint original.
 */
function parseGoal(raw: RawGoal) {
  const metaStr = raw.metadata as string | null | undefined;
  let meta: Record<string, unknown> = {};
  if (metaStr) {
    try { meta = JSON.parse(metaStr); } catch { /* coluna existe mas JSON inválido */ }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { metadata: _m, ...rest } = raw;
  return { ...rest, ...meta };
}

// GET /api/goals
export async function GET(request: Request) {
  try {
    const session = await requireSession(request);
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
    const session = await requireSession(request);
    const body = await parseBody(request);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos");
    }

    const {
      title, description, category, target, unit, deadline,
      emoji, goal_type, priority, motivation, steps,
    } = parsed.data;

    const id = generateId();
    const dbCategory = DB_CATEGORY[category] ?? "pessoal";

    const metadata = JSON.stringify({
      category,                        // categoria real (pode ser qualquer das 11)
      emoji:       emoji       ?? null,
      priority:    priority    ?? null,
      goal_type:   goal_type   ?? "simples",
      motivation:  motivation  ?? null,
      steps:       steps       ?? [],
      completed_at: null,
    });

    await execute(
      `INSERT INTO goals
         (id, user_id, title, description, category, target, unit, deadline, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
      id,
      session.user.id,
      title,
      description ?? null,
      dbCategory,
      target,
      unit ?? null,
      deadline ?? null,
      metadata,
    );

    return json({
      id,
      user_id:      session.user.id,
      title,
      description:  description  ?? null,
      category,          // retorna a categoria real
      target,
      unit:         unit          ?? null,
      deadline:     deadline      ?? null,
      progress:     0,
      status:       "active",
      emoji:        emoji         ?? null,
      priority:     priority      ?? null,
      goal_type:    goal_type     ?? "simples",
      motivation:   motivation    ?? null,
      steps:        steps         ?? [],
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
    const session = await requireSession(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("ID obrigatório");

    const body = await parseBody(request);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos");
    }

    const existing = await query(
      "SELECT id, metadata FROM goals WHERE id = ? AND user_id = ?",
      id, session.user.id,
    );
    if (existing.length === 0) return unauthorized();

    const rawMeta = existing[0].metadata as string | null;
    const existingMeta: Record<string, unknown> = rawMeta ? JSON.parse(rawMeta) : {};

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (parsed.data.title       !== undefined) { updates.push("title = ?");       params.push(parsed.data.title); }
    if (parsed.data.description !== undefined) { updates.push("description = ?"); params.push(parsed.data.description ?? null); }
    if (parsed.data.status      !== undefined) { updates.push("status = ?");      params.push(parsed.data.status); }
    if (parsed.data.progress    !== undefined) { updates.push("progress = ?");    params.push(parsed.data.progress); }
    if (parsed.data.target      !== undefined) { updates.push("target = ?");      params.push(parsed.data.target); }
    if (parsed.data.unit        !== undefined) { updates.push("unit = ?");        params.push(parsed.data.unit ?? null); }
    if (parsed.data.deadline    !== undefined) { updates.push("deadline = ?");    params.push(parsed.data.deadline ?? null); }

    // Se a categoria mudou, atualiza a coluna DB (com valor mapeado) e o metadata
    if (parsed.data.category !== undefined) {
      updates.push("category = ?");
      params.push(DB_CATEGORY[parsed.data.category] ?? "pessoal");
    }

    const metaKeys = [
      "emoji", "priority", "goal_type", "motivation",
      "steps", "completed_at", "category",
    ] as const;
    const metaChanged = metaKeys.some((k) => parsed.data[k] !== undefined);

    if (metaChanged) {
      const newMeta = { ...existingMeta };
      if (parsed.data.emoji        !== undefined) newMeta.emoji        = parsed.data.emoji;
      if (parsed.data.priority     !== undefined) newMeta.priority     = parsed.data.priority;
      if (parsed.data.goal_type    !== undefined) newMeta.goal_type    = parsed.data.goal_type;
      if (parsed.data.motivation   !== undefined) newMeta.motivation   = parsed.data.motivation;
      if (parsed.data.steps        !== undefined) newMeta.steps        = parsed.data.steps;
      if (parsed.data.completed_at !== undefined) newMeta.completed_at = parsed.data.completed_at ?? null;
      if (parsed.data.category     !== undefined) newMeta.category     = parsed.data.category;
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
    const session = await requireSession(request);
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
