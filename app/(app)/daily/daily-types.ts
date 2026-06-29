export type DailyCategory =
  | "Trabalho"
  | "Estudos"
  | "Saúde"
  | "Casa"
  | "Financeiro"
  | "Relacionamentos"
  | "Pessoal";

export type PriorityLevel = "Alta" | "Média" | "Baixa";
export type DayPeriod = "Manhã" | "Tarde" | "Noite";
export type FinanceType = "expense" | "income";

export type DailyPriority = {
  id: string;
  title: string;
  category: DailyCategory;
  level: PriorityLevel;
  done: boolean;
};

export type RhythmBlock = {
  id: string;
  period: DayPeriod;
  time: string;
  title: string;
  category: DailyCategory;
  done: boolean;
};

export type DailyHabit = {
  id: string;
  title: string;
  icon: string;
  visible: boolean;
  done: boolean;
};

export type ExtraTask = {
  id: string;
  title: string;
  category: DailyCategory;
  dueDate: string;
  done: boolean;
};

export type FinanceLog = {
  id: string;
  type: FinanceType;
  amount: number;
  category: string;
  description: string;
};

export type Reflections = {
  victory: string;
  gratitude: string;
  learning: string;
  release: string;
  tomorrowPriority: string;
};

export type ImportantEvent = {
  id: string;
  title: string;
  start_date: string;
  color?: string | null;
};

export type WeeklySummary = {
  closedDays: number;
  averageMood: string;
  consistentHabits: string[];
  completedPriorities: number;
  bestMoodDays: string[];
};

export type DailyEntry = {
  id?: string;
  date: string;
  mood_label: string;
  arrival_message: string;
  intention: string;
  good_day: string;
  day_mode: string;
  day_score: number | null;
  day_closed_at: number | null;
  water_count: number;
  movement_note: string;
  worry_note: string;
  priorities: DailyPriority[];
  rhythm_blocks: RhythmBlock[];
  habits_state: DailyHabit[];
  extra_tasks: ExtraTask[];
  finance_logs: FinanceLog[];
  pause_actions: string[];
  night_checks: DailyHabit[];
  reflections: Reflections;
  important_events: ImportantEvent[];
  weekly_summary: WeeklySummary;
  created_at?: number;
  updated_at?: number;
};
