/**
 * Route Handler: /api/transactions
 * Dados financeiros — sensíveis, user_id em toda query.
 */
import { requireSession } from "@/lib/session";
import { query, execute, generateId } from "@/lib/db";
import { json, unauthorized, badRequest, serverError, parseBody } from "@/lib/api";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(255),
  amount: z.number().positive(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
});

// GET /api/transactions?month=YYYY-MM
export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

    const transactions = await query(
      "SELECT * FROM transactions WHERE user_id = ? AND date LIKE ? ORDER BY date DESC, created_at DESC",
      session.user.id, `${month}%`,
    );

    return json(transactions);
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// POST /api/transactions
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await parseBody(request);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

    const { title, amount, type, category, date, notes } = parsed.data;
    const id = generateId();
    const txDate = date ?? new Date().toISOString().slice(0, 10);

    await execute(
      `INSERT INTO transactions (id, user_id, title, amount, type, category, date, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
      id, session.user.id, title, amount, type, category, txDate, notes ?? null,
    );

    return json({ id, title, amount, type, category, date: txDate, notes }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

// DELETE /api/transactions?id=xxx
export async function DELETE(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("ID obrigatório");

    const existing = await query(
      "SELECT id FROM transactions WHERE id = ? AND user_id = ?",
      id, session.user.id,
    );
    if (existing.length === 0) return unauthorized();

    await execute("DELETE FROM transactions WHERE id = ? AND user_id = ?", id, session.user.id);
    return json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
