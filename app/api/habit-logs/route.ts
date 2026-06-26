/**
 * Route Handler: /api/habit-logs
 * Toggle de check diário de hábito (marcar/desmarcar).
 */
import { requireSession } from "@/lib/session";
import { query, execute, generateId } from "@/lib/db";
import { json, badRequest, serverError, parseBody } from "@/lib/api";
import { z } from "zod";

const toggleSchema = z.object({
  habit_id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// POST /api/habit-logs — toggle check (cria se não existe, remove se existe)
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await parseBody(request);
    const parsed = toggleSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

    const { habit_id, date } = parsed.data;

    // Confirma que o hábito pertence ao usuário
    const habit = await query(
      "SELECT id FROM habits WHERE id = ? AND user_id = ?",
      habit_id, session.user.id,
    );
    if (habit.length === 0) return json({ error: "Hábito não encontrado" }, 404);

    // Verifica se o log já existe
    const existing = await query(
      "SELECT id FROM habit_logs WHERE habit_id = ? AND date = ? AND user_id = ?",
      habit_id, date, session.user.id,
    );

    if (existing.length > 0) {
      // Remove o log (desmarcar)
      await execute(
        "DELETE FROM habit_logs WHERE habit_id = ? AND date = ? AND user_id = ?",
        habit_id, date, session.user.id,
      );
      return json({ checked: false });
    } else {
      // Cria o log (marcar)
      await execute(
        "INSERT INTO habit_logs (id, habit_id, user_id, date, created_at) VALUES (?, ?, ?, ?, unixepoch())",
        generateId(), habit_id, session.user.id, date,
      );
      return json({ checked: true });
    }
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
