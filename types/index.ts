export type MoodLevel = 1 | 2 | 3 | 4 | 5;

// Usuário da sessão — compartilhado entre server e client
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  plan: "free" | "pro";
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: "todo" | "doing" | "done";
  priority: "low" | "medium" | "high";
  due_date?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  frequency: "daily" | "weekly";
  color: string;
  icon?: string;
  target_days: number;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
  completed: boolean;
  created_at: string;
}

export interface CheckIn {
  id: string;
  user_id: string;
  date: string;
  mood: MoodLevel;
  energy: MoodLevel;
  note?: string;
  created_at: string;
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  date: string;
  content: string;
  mood?: MoodLevel;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type GoalCategory =
  | "pessoal"
  | "profissional"
  | "saude"
  | "financeiro"
  | "estudo"
  | "autocuidado"
  | "relacionamentos"
  | "casa"
  | "viagens"
  | "espiritualidade"
  | "sonhos";

export type GoalPriority = "essencial" | "importante" | "desejo";
export type GoalType = "simples" | "financeira" | "etapas";
export type GoalStatus = "active" | "completed" | "paused";

export interface GoalStep {
  id: string;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  emoji?: string;
  category: GoalCategory;
  status: GoalStatus;
  priority?: GoalPriority;
  goal_type?: GoalType;
  motivation?: string;
  progress: number;
  target: number;
  unit?: string;
  deadline?: string;
  steps?: GoalStep[];
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  notes?: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  all_day: boolean;
  color?: string;
  created_at: string;
}
