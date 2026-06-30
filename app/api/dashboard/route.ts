/**
 * Route Handler: /api/dashboard
 * Consolida os dados da home para evitar varias chamadas no carregamento.
 */
import { requireSession } from "@/lib/session";
import { query, queryOne } from "@/lib/db";
import { json, serverError } from "@/lib/api";
import type { MoodLevel } from "@/types";

const moodLabels: Record<MoodLevel, string> = {
  1: "Precisa de cuidado",
  2: "Mais sensivel",
  3: "Estavel",
  4: "Leve",
  5: "Muito bem",
};

type TaskSummary = {
  done_count: number | null;
  open_count: number | null;
};

type MoneySummary = {
  income: number | null;
  expenses: number | null;
};

type PriorityTask = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
};

type CheckInRow = {
  mood: MoodLevel;
};

type CountRow = {
  count: number | null;
};

type HabitLogRow = {
  habit_id: string;
  date: string;
};

type GoalSummaryRow = {
  active_count: number | null;
  overall_pct: number | null;
};

type NextGoalRow = {
  title: string;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoKey(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function streakFor(logDates: Set<string>) {
  let streak = 0;

  for (let i = 0; i < 90; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    if (logDates.has(date.toISOString().slice(0, 10))) streak += 1;
    else if (i > 0) break;
  }

  return streak;
}

export async function GET() {
  try {
    const session = await requireSession();
    const userId = session.user.id;
    const today = todayKey();
    const month = today.slice(0, 7);
    const streakStart = daysAgoKey(89);

    const [
      taskSummary,
      priorityTasks,
      moneySummary,
      todayCheckIn,
      habitCount,
      completedHabits,
      habitLogs,
      goalSummary,
      nextGoalRows,
    ] = await Promise.all([
      queryOne<TaskSummary>(
        `SELECT
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done_count,
          SUM(CASE WHEN status != 'done' THEN 1 ELSE 0 END) AS open_count
        FROM tasks
        WHERE user_id = ?`,
        userId,
      ),
      query<PriorityTask>(
        `SELECT id, title, priority
        FROM tasks
        WHERE user_id = ? AND status != 'done'
        ORDER BY
          CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
          created_at DESC
        LIMIT 3`,
        userId,
      ),
      queryOne<MoneySummary>(
        `SELECT
          COALESCE(SUM(CASE WHEN COALESCE(transaction_type, type) = 'income' THEN COALESCE(NULLIF(amount_cents, 0), CAST(ROUND(amount * 100) AS INTEGER)) ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN COALESCE(transaction_type, type) = 'expense' THEN COALESCE(NULLIF(amount_cents, 0), CAST(ROUND(amount * 100) AS INTEGER)) ELSE 0 END), 0) AS expenses
        FROM transactions
        WHERE user_id = ? AND COALESCE(transaction_date, date) LIKE ? AND deleted_at IS NULL`,
        userId,
        `${month}%`,
      ),
      queryOne<CheckInRow>(
        "SELECT mood FROM check_ins WHERE user_id = ? AND date = ? LIMIT 1",
        userId,
        today,
      ),
      queryOne<CountRow>(
        "SELECT COUNT(*) AS count FROM habits WHERE user_id = ?",
        userId,
      ),
      queryOne<CountRow>(
        "SELECT COUNT(DISTINCT habit_id) AS count FROM habit_logs WHERE user_id = ? AND date = ?",
        userId,
        today,
      ),
      query<HabitLogRow>(
        "SELECT habit_id, date FROM habit_logs WHERE user_id = ? AND date >= ?",
        userId,
        streakStart,
      ),
      queryOne<GoalSummaryRow>(
        `SELECT
          COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_count,
          COALESCE(
            AVG(CASE WHEN status = 'active' AND target > 0
                THEN CAST(progress AS REAL) / target * 100
                ELSE NULL END),
            0
          ) AS overall_pct
        FROM goals
        WHERE user_id = ?`,
        userId,
      ),
      query<NextGoalRow>(
        `SELECT title FROM goals
         WHERE user_id = ? AND status = 'active' AND deadline IS NOT NULL
         ORDER BY deadline ASC LIMIT 1`,
        userId,
      ),
    ]);

    const logsByHabit = new Map<string, Set<string>>();
    for (const log of habitLogs) {
      const dates = logsByHabit.get(log.habit_id) ?? new Set<string>();
      dates.add(log.date);
      logsByHabit.set(log.habit_id, dates);
    }

    const totalHabits = Number(habitCount?.count ?? 0);
    const doneHabits = Number(completedHabits?.count ?? 0);
    const bestStreak = Math.max(0, ...Array.from(logsByHabit.values()).map(streakFor));
    const income = Number(moneySummary?.income ?? 0) / 100;
    const expenses = Number(moneySummary?.expenses ?? 0) / 100;

    return json({
      tasks: {
        doneCount: Number(taskSummary?.done_count ?? 0),
        openCount: Number(taskSummary?.open_count ?? 0),
        priorityTasks,
      },
      finances: {
        income,
        expenses,
        balance: income - expenses,
      },
      wellbeing: todayCheckIn
        ? {
            mood: todayCheckIn.mood,
            label: moodLabels[todayCheckIn.mood],
          }
        : null,
      habits: {
        completed: doneHabits,
        total: totalHabits,
        percent: totalHabits > 0 ? Math.round((doneHabits / totalHabits) * 100) : 0,
        bestStreak,
      },
      goals: {
        activeCount:   Number(goalSummary?.active_count ?? 0),
        overallPct:    Math.round(Number(goalSummary?.overall_pct ?? 0)),
        nextGoalTitle: nextGoalRows[0]?.title ?? null,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
