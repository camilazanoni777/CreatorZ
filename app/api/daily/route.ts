/**
 * Route Handler: /api/daily
 * Central diaria com uma linha por usuario/data e blocos JSON versionaveis.
 */
import { createDefaultDaily, emptyWeeklySummary } from "@/app/(app)/daily/daily-defaults";
import type { DailyEntry, DailyHabit, DailyPriority } from "@/app/(app)/daily/daily-types";
import { badRequest, json, parseBody, serverError } from "@/lib/api";
import { execute, generateId, query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { z } from "zod";

const categorySchema = z.enum([
  "Trabalho",
  "Estudos",
  "Saúde",
  "Casa",
  "Financeiro",
  "Relacionamentos",
  "Pessoal",
]);

const prioritySchema = z.object({
  id: z.string(),
  title: z.string(),
  category: categorySchema,
  level: z.enum(["Alta", "Média", "Baixa"]),
  done: z.boolean(),
});

const rhythmBlockSchema = z.object({
  id: z.string(),
  period: z.enum(["Manhã", "Tarde", "Noite"]),
  time: z.string(),
  title: z.string(),
  category: categorySchema,
  done: z.boolean(),
});

const habitSchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string(),
  visible: z.boolean(),
  done: z.boolean(),
});

const extraTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: categorySchema,
  dueDate: z.string(),
  done: z.boolean(),
});

const financeLogSchema = z.object({
  id: z.string(),
  type: z.enum(["expense", "income"]),
  amount: z.number().nonnegative(),
  category: z.string(),
  description: z.string(),
});

const reflectionsSchema = z.object({
  victory: z.string(),
  gratitude: z.string(),
  learning: z.string(),
  release: z.string(),
  tomorrowPriority: z.string(),
});

const dailySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood_label: z.string().default(""),
  arrival_message: z.string().default(""),
  intention: z.string().default(""),
  good_day: z.string().default(""),
  day_mode: z.string().default(""),
  day_score: z.number().int().min(1).max(10).nullable().default(null),
  day_closed_at: z.number().int().nullable().default(null),
  water_count: z.number().int().min(0).max(20).default(0),
  movement_note: z.string().default(""),
  worry_note: z.string().default(""),
  priorities: z.array(prioritySchema).default([]),
  rhythm_blocks: z.array(rhythmBlockSchema).default([]),
  habits_state: z.array(habitSchema).default([]),
  extra_tasks: z.array(extraTaskSchema).default([]),
  finance_logs: z.array(financeLogSchema).default([]),
  pause_actions: z.array(z.string()).default([]),
  night_checks: z.array(habitSchema).default([]),
  reflections: reflectionsSchema,
});

type DailyRow = {
  id: string;
  date: string;
  mood_label: string | null;
  arrival_message: string | null;
  intention: string | null;
  good_day: string | null;
  day_mode: string | null;
  day_score: number | null;
  day_closed_at: number | null;
  water_count: number | null;
  movement_note: string | null;
  worry_note: string | null;
  priorities: string;
  rhythm_blocks: string;
  habits_state: string;
  extra_tasks: string;
  finance_logs: string;
  pause_actions: string;
  night_checks: string;
  reflections: string;
  created_at: number;
  updated_at: number;
};

type EventRow = {
  id: string;
  title: string;
  start_date: string;
  color?: string | null;
};

function safeParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mergeHabits(current: DailyHabit[], defaults: DailyHabit[]) {
  const byId = new Map(current.map((item) => [item.id, item]));
  return defaults.map((item) => byId.get(item.id) ?? item);
}

function mapDailyRow(row: DailyRow, base: DailyEntry): DailyEntry {
  return {
    ...base,
    id: row.id,
    date: row.date,
    mood_label: row.mood_label ?? "",
    arrival_message: row.arrival_message ?? "",
    intention: row.intention ?? "",
    good_day: row.good_day ?? "",
    day_mode: row.day_mode ?? "",
    day_score: row.day_score,
    day_closed_at: row.day_closed_at,
    water_count: row.water_count ?? 0,
    movement_note: row.movement_note ?? "",
    worry_note: row.worry_note ?? "",
    priorities: safeParse(row.priorities, base.priorities),
    rhythm_blocks: safeParse(row.rhythm_blocks, base.rhythm_blocks),
    habits_state: mergeHabits(safeParse(row.habits_state, base.habits_state), base.habits_state),
    extra_tasks: safeParse(row.extra_tasks, base.extra_tasks),
    finance_logs: safeParse(row.finance_logs, base.finance_logs),
    pause_actions: safeParse(row.pause_actions, base.pause_actions),
    night_checks: mergeHabits(safeParse(row.night_checks, base.night_checks), base.night_checks),
    reflections: safeParse(row.reflections, base.reflections),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function startOfWeek(date: Date) {
  const current = new Date(date);
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);
  current.setHours(0, 0, 0, 0);
  return current;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getWeeklySummary(rows: DailyRow[]) {
  const moodCounts = new Map<string, number>();
  const habitCounts = new Map<string, number>();
  let completedPriorities = 0;
  const bestMoodDays: string[] = [];

  for (const row of rows) {
    if (row.mood_label) moodCounts.set(row.mood_label, (moodCounts.get(row.mood_label) ?? 0) + 1);

    const priorities = safeParse<DailyPriority[]>(row.priorities, []);
    completedPriorities += priorities.filter((item) => item.done && item.title.trim()).length;

    const habits = safeParse<DailyHabit[]>(row.habits_state, []);
    habits.filter((item) => item.done).forEach((item) => {
      habitCounts.set(item.title, (habitCounts.get(item.title) ?? 0) + 1);
    });

    if (["Feliz", "Confiante", "Produtiva", "Motivada"].includes(row.mood_label ?? "")) {
      bestMoodDays.push(row.date);
    }
  }

  const averageMood = [...moodCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Ainda sem registros";
  const consistentHabits = [...habitCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([title]) => title);

  return {
    ...emptyWeeklySummary,
    closedDays: rows.filter((row) => row.day_closed_at).length,
    averageMood,
    consistentHabits,
    completedPriorities,
    bestMoodDays,
  };
}

async function getImportantEvents(userId: string, date: string) {
  return query<EventRow>(
    `SELECT id, title, start_date, color
     FROM calendar_events
     WHERE user_id = ? AND start_date LIKE ?
     ORDER BY start_date ASC
     LIMIT 6`,
    userId,
    `${date}%`,
  );
}

async function getWeekRows(userId: string, date: string) {
  const start = startOfWeek(new Date(`${date}T12:00:00`));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return query<DailyRow>(
    `SELECT *
     FROM daily_entries
     WHERE user_id = ? AND date BETWEEN ? AND ?
     ORDER BY date ASC`,
    userId,
    isoDate(start),
    isoDate(end),
  );
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? isoDate(new Date());
    const base = createDefaultDaily(date);

    const [entry, importantEvents, weekRows] = await Promise.all([
      queryOne<DailyRow>("SELECT * FROM daily_entries WHERE user_id = ? AND date = ?", session.user.id, date),
      getImportantEvents(session.user.id, date),
      getWeekRows(session.user.id, date),
    ]);

    const daily = entry ? mapDailyRow(entry, base) : base;
    return json({
      ...daily,
      important_events: importantEvents,
      weekly_summary: getWeeklySummary(weekRows),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await parseBody(request);
    const parsed = dailySchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

    const data = parsed.data;
    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM daily_entries WHERE user_id = ? AND date = ?",
      session.user.id,
      data.date,
    );

    const values = [
      data.mood_label,
      data.arrival_message,
      data.intention,
      data.good_day,
      data.day_mode,
      data.day_score,
      data.day_closed_at,
      data.water_count,
      data.movement_note,
      data.worry_note,
      JSON.stringify(data.priorities),
      JSON.stringify(data.rhythm_blocks),
      JSON.stringify(data.habits_state),
      JSON.stringify(data.extra_tasks),
      JSON.stringify(data.finance_logs),
      JSON.stringify(data.pause_actions),
      JSON.stringify(data.night_checks),
      JSON.stringify(data.reflections),
    ];

    if (existing) {
      await execute(
        `UPDATE daily_entries
         SET mood_label = ?, arrival_message = ?, intention = ?, good_day = ?, day_mode = ?,
             day_score = ?, day_closed_at = ?, water_count = ?, movement_note = ?, worry_note = ?,
             priorities = ?, rhythm_blocks = ?, habits_state = ?, extra_tasks = ?, finance_logs = ?,
             pause_actions = ?, night_checks = ?, reflections = ?, updated_at = unixepoch()
         WHERE user_id = ? AND date = ?`,
        ...values,
        session.user.id,
        data.date,
      );
      return json({ id: existing.id, success: true });
    }

    const id = generateId();
    await execute(
      `INSERT INTO daily_entries (
        id, user_id, date, morning_checks, evening_checks, gratitude,
        mood_label, arrival_message, intention, good_day, day_mode,
        day_score, day_closed_at, water_count, movement_note, worry_note,
        priorities, rhythm_blocks, habits_state, extra_tasks, finance_logs,
        pause_actions, night_checks, reflections, created_at, updated_at
      ) VALUES (?, ?, ?, '[]', '[]', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
      id,
      session.user.id,
      data.date,
      data.reflections.gratitude || null,
      ...values,
    );

    return json({ id, success: true }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
