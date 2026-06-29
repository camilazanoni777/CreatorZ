"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Droplets,
  Dumbbell,
  Flame,
  HeartPulse,
  Loader2,
  Moon,
  MoreHorizontal,
  Palette,
  Pause,
  Pencil,
  Plus,
  Settings2,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const COLORS = ["#7c3aed", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#3b82f6"];
const CATEGORY_OPTIONS = ["Saúde", "Rotina", "Mente", "Dinheiro", "Trabalho", "Autocuidado"];
const PERIOD_OPTIONS = ["Manhã", "Tarde", "Noite", "Flexível"];
const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Todos os dias" },
  { value: "weekly", label: "X vezes por semana" },
];
const QUICK_SUGGESTIONS = ["Beber água", "Treinar", "Ler", "Dormir cedo", "Meditar", "Controlar gastos"];

const iconOptions = [
  { value: "water", label: "Água", icon: Droplets },
  { value: "movement", label: "Movimento", icon: Dumbbell },
  { value: "reading", label: "Leitura", icon: BookOpen },
  { value: "mind", label: "Mente", icon: HeartPulse },
  { value: "money", label: "Dinheiro", icon: Wallet },
  { value: "sleep", label: "Sono", icon: Moon },
  { value: "sparkles", label: "Brilho", icon: Sparkles },
];

type ApiHabit = {
  id: string;
  title: string;
  description?: string | null;
  color?: string | null;
  frequency?: string | null;
  icon?: string | null;
};

type ApiLog = { habit_id: string; date: string };

type Habit = {
  id: string;
  title: string;
  description: string;
  category: string;
  period: string;
  target: string;
  reminder: string;
  color: string;
  icon: string;
  frequency: "daily" | "weekly";
  weeklyTarget: number;
  completedToday: boolean;
  streak: number;
  weekLog: boolean[];
  paused?: boolean;
  isDemo?: boolean;
};

type NewHabit = {
  title: string;
  description: string;
  icon: string;
  category: string;
  frequency: "daily" | "weekly";
  weeklyTarget: number;
  period: string;
  target: string;
  reminder: string;
  color: string;
};

const emptyNewHabit: NewHabit = {
  title: "",
  description: "",
  icon: "sparkles",
  category: "Autocuidado",
  frequency: "daily",
  weeklyTarget: 3,
  period: "Flexível",
  target: "",
  reminder: "",
  color: COLORS[0],
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date.toISOString().slice(0, 10);
  });
}

function formatDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
  });
}

function getIcon(icon: string): ElementType {
  return iconOptions.find((item) => item.value === icon)?.icon ?? Sparkles;
}

function inferHabitMeta(habit: ApiHabit) {
  const title = habit.title.toLowerCase();

  if (title.includes("água") || title.includes("agua")) {
    return { icon: "water", category: "Saúde", period: "Manhã", target: "2L" };
  }
  if (title.includes("trein") || title.includes("caminh")) {
    return { icon: "movement", category: "Saúde", period: "Manhã", target: "30 min" };
  }
  if (title.includes("ler") || title.includes("leitura") || title.includes("pág")) {
    return { icon: "reading", category: "Mente", period: "Noite", target: "10 páginas" };
  }
  if (title.includes("check") || title.includes("emocional")) {
    return { icon: "mind", category: "Autocuidado", period: "Tarde", target: "1 check-in" };
  }
  if (title.includes("gasto") || title.includes("dinheiro")) {
    return { icon: "money", category: "Dinheiro", period: "Noite", target: "5 min" };
  }
  if (title.includes("dorm")) {
    return { icon: "sleep", category: "Rotina", period: "Noite", target: "23h" };
  }

  return { icon: habit.icon ?? "sparkles", category: "Rotina", period: "Flexível", target: "" };
}

function computeStreak(habitId: string, logs: ApiLog[]) {
  const logDates = new Set(logs.filter((log) => log.habit_id === habitId).map((log) => log.date));
  let streak = 0;

  for (let index = 0; index < 90; index++) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    const key = date.toISOString().slice(0, 10);
    if (logDates.has(key)) streak += 1;
    else if (index > 0) break;
  }

  return streak;
}

function buildHabits(rawHabits: ApiHabit[], logs: ApiLog[], today: string, last7: string[]): Habit[] {
  return rawHabits.map((habit) => {
    const meta = inferHabitMeta(habit);
    return {
      id: habit.id,
      title: habit.title,
      description: habit.description ?? "Um pequeno compromisso com a sua rotina.",
      category: meta.category,
      period: meta.period,
      target: meta.target,
      reminder: "",
      color: habit.color ?? COLORS[0],
      icon: habit.icon ?? meta.icon,
      frequency: habit.frequency === "weekly" ? "weekly" : "daily",
      weeklyTarget: habit.frequency === "weekly" ? 3 : 7,
      completedToday: logs.some((log) => log.habit_id === habit.id && log.date === today),
      streak: computeStreak(habit.id, logs),
      weekLog: last7.map((date) => logs.some((log) => log.habit_id === habit.id && log.date === date)),
      paused: false,
    };
  });
}

function demoHabits(today: string, last7: string[]): Habit[] {
  const patterns = [
    [true, true, false, true, true, false, false],
    [false, true, true, false, true, true, false],
    [true, true, true, true, false, true, false],
    [false, false, true, false, true, false, false],
    [true, false, true, true, false, true, false],
    [false, true, false, true, true, false, false],
  ];

  return [
    ["Beber 2L de água", "Hidratação leve ao longo do dia.", "Saúde", "Manhã", "2L", "water", "#7c3aed", 7],
    ["Treinar ou caminhar", "Movimento possível, sem perfeccionismo.", "Saúde", "Manhã", "30 min", "movement", "#10b981", 4],
    ["Ler 10 páginas", "Poucas páginas, todos os dias.", "Mente", "Noite", "10 páginas", "reading", "#8b5cf6", 12],
    ["Fazer check-in emocional", "Nomear o que você sente antes de seguir.", "Autocuidado", "Tarde", "1 check-in", "mind", "#ec4899", 2],
    ["Registrar gastos do dia", "Fechar o dia sabendo para onde o dinheiro foi.", "Dinheiro", "Noite", "5 min", "money", "#3b82f6", 5],
    ["Dormir antes das 23h", "Proteger seu descanso como compromisso real.", "Rotina", "Noite", "23h", "sleep", "#f59e0b", 3],
  ].map(([title, description, category, period, target, icon, color, streak], index) => ({
    id: `demo-${index}`,
    title: String(title),
    description: String(description),
    category: String(category),
    period: String(period),
    target: String(target),
    icon: String(icon),
    color: String(color),
    reminder: "",
    frequency: "daily",
    weeklyTarget: 7,
    completedToday: patterns[index][6],
    streak: Number(streak),
    weekLog: last7.map((_, dayIndex) => patterns[index][dayIndex]),
    paused: false,
    isDemo: true,
  }));
}

function progressMessage(percentage: number) {
  if (percentage === 0) return "Seu dia está começando. Escolha um pequeno passo.";
  if (percentage === 100) return "Dia concluído. Sua futura versão agradece.";
  if (percentage >= 50) return "Você está construindo consistência.";
  return "Você já começou. Agora é só continuar com leveza.";
}

function WeeklyDots({ habit }: { habit: Habit }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Frequência semanal de ${habit.title}`}>
      {habit.weekLog.map((done, index) => (
        <span
          key={`${habit.id}-${index}`}
          className={cn(
            "h-2.5 w-2.5 rounded-full border transition",
            done ? "scale-110 border-transparent" : "border-zinc-200 bg-zinc-100",
          )}
          style={done ? { backgroundColor: habit.color } : undefined}
        />
      ))}
    </div>
  );
}

function ProgressCircle({ value }: { value: number }) {
  const angle = `${value * 3.6}deg`;
  return (
    <div
      className="grid h-36 w-36 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(#7c3aed ${angle}, #ede9fe 0deg)` }}
      aria-label={`${value}% concluído`}
    >
      <div className="grid h-28 w-28 place-items-center rounded-full bg-white shadow-inner">
        <div className="text-center">
          <p className="text-3xl font-semibold text-zinc-950">{value}%</p>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            hoje
          </p>
        </div>
      </div>
    </div>
  );
}

function HabitCard({
  habit,
  onToggle,
  onDelete,
  onEdit,
  onPause,
}: {
  habit: Habit;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onPause: (id: string) => void;
}) {
  const Icon = getIcon(habit.icon);
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    <article
      className={cn(
        "group relative rounded-[22px] border bg-white p-4 shadow-[0_18px_45px_rgba(82,66,96,0.07)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(82,66,96,0.10)]",
        habit.completedToday ? "border-violet-100 bg-white/72 opacity-78" : "border-zinc-200",
        habit.paused && "opacity-60",
      )}
    >
      <div className="grid gap-4 sm:grid-cols-[56px_1fr_auto] sm:items-start">
        <div className="flex w-14 flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggle(habit.id)}
            className={cn(
              "grid h-14 w-14 place-items-center rounded-2xl border-2 transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              habit.completedToday
                ? "scale-95 border-violet-200 bg-violet-600 text-white shadow-[0_12px_28px_rgba(124,58,237,0.24)]"
                : "border-violet-100 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100",
            )}
            aria-label={`${habit.completedToday ? "Desmarcar" : "Marcar"} ${habit.title}`}
          >
            {habit.completedToday ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
          </button>
          <span className="text-[10px] font-medium leading-none text-muted-foreground">
            concluído
          </span>
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-transparent bg-violet-50 text-violet-700" variant="outline">
              {habit.category}
            </Badge>
            {habit.paused && (
              <Badge className="border-transparent bg-zinc-100 text-zinc-600" variant="outline">
                Pausado
              </Badge>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              {habit.period}
            </span>
            {habit.target && (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                {habit.target}
              </span>
            )}
            {habit.frequency === "weekly" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {habit.weeklyTarget}x por semana
              </span>
            )}
          </div>

          <div>
            <h2 className={cn("text-base font-semibold text-zinc-950", habit.completedToday && "text-zinc-500 line-through")}>
              {habit.title}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{habit.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-700">
              <Flame className="h-4 w-4 text-violet-600" />
              {habit.streak} dias
            </span>
            <WeeklyDots habit={habit} />
          </div>
        </div>

        <div className="flex justify-end gap-1 sm:flex-col">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full text-muted-foreground hover:bg-violet-50 hover:text-violet-700"
            onClick={() => setActionsOpen((open) => !open)}
            aria-expanded={actionsOpen}
            aria-label={`Mais opções para ${habit.title}`}
            title="Editar, pausar ou excluir"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full text-muted-foreground hover:bg-violet-50 hover:text-violet-700"
            onClick={() => onEdit(habit.id)}
            aria-label={`Editar ${habit.title}`}
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full text-muted-foreground hover:bg-violet-50 hover:text-violet-700"
            onClick={() => onPause(habit.id)}
            aria-label={`${habit.paused ? "Reativar" : "Pausar"} ${habit.title}`}
            title={habit.paused ? "Reativar" : "Pausar"}
          >
            <Pause className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full text-muted-foreground hover:bg-red-50 hover:text-destructive"
            onClick={() => onDelete(habit.id)}
            aria-label={`Excluir ${habit.title}`}
            title="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {actionsOpen && (
        <div className="mt-4 grid gap-2 rounded-2xl border border-violet-100 bg-violet-50/70 p-3 sm:ml-[72px] sm:grid-cols-3">
          <Button type="button" variant="outline" className="rounded-full bg-white" onClick={() => onEdit(habit.id)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button type="button" variant="outline" className="rounded-full bg-white" onClick={() => onPause(habit.id)}>
            <Pause className="h-4 w-4" />
            {habit.paused ? "Reativar" : "Pausar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full bg-white text-destructive hover:bg-red-50"
            onClick={() => onDelete(habit.id)}
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>
      )}
    </article>
  );
}

function HabitPreview({ habit }: { habit: NewHabit }) {
  const Icon = getIcon(habit.icon);
  return (
    <div className="rounded-[20px] border border-violet-100 bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Preview</p>
      <div className="flex gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-700">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold text-zinc-950">{habit.title || "Seu novo hábito"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {habit.description || "Uma escolha pequena para repetir com intenção."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="muted">{habit.category}</Badge>
            <Badge variant="muted">{habit.period}</Badge>
            <Badge variant="muted">
              {habit.frequency === "weekly" ? `${habit.weeklyTarget}x por semana` : "Todos os dias"}
            </Badge>
            {habit.target && <Badge variant="muted">{habit.target}</Badge>}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onSuggestion, onCreate }: { onSuggestion: (title: string) => void; onCreate: () => void }) {
  return (
    <Card className="border-violet-100 bg-white shadow-[0_22px_70px_rgba(82,66,96,0.08)]">
      <CardContent className="py-12 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-violet-50 text-violet-700">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-zinc-950">Sua nova rotina começa com uma escolha pequena.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          Crie hábitos que façam sentido para a vida que você quer construir.
        </p>
        <Button className="mt-6 rounded-full" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Criar meu primeiro hábito
        </Button>
        <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-2">
          {QUICK_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSuggestion(suggestion)}
              className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function HabitosPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHabit, setNewHabit] = useState<NewHabit>(emptyNewHabit);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const today = todayISO();
  const month = today.slice(0, 7);
  const last7 = useMemo(() => getLast7Days(), []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/habits?month=${month}`);
      if (!response.ok) {
        setDemoMode(true);
        setHabits(demoHabits(today, last7));
        return;
      }
      const data = (await response.json()) as { habits: ApiHabit[]; logs: ApiLog[] };
      setDemoMode(false);
      setHabits(buildHabits(data.habits ?? [], data.logs ?? [], today, last7));
    } catch {
      setDemoMode(true);
      setHabits(demoHabits(today, last7));
    } finally {
      setLoading(false);
    }
  }, [last7, month, today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sortedHabits = useMemo(
    () => [...habits].sort((a, b) => Number(a.completedToday) - Number(b.completedToday)),
    [habits],
  );
  const completedToday = habits.filter((habit) => habit.completedToday).length;
  const percentage = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0;
  const bestStreak = habits.reduce<Habit | null>((best, habit) => (!best || habit.streak > best.streak ? habit : best), null);
  const mostConsistent = habits.reduce<Habit | null>((best, habit) => {
    const score = habit.weekLog.filter(Boolean).length;
    const bestScore = best?.weekLog.filter(Boolean).length ?? -1;
    return score > bestScore ? habit : best;
  }, null);
  const needsAttention =
    habits.find((habit) => !habit.completedToday && habit.weekLog.filter(Boolean).length <= 2) ??
    habits.find((habit) => !habit.completedToday) ??
    null;
  const weeklyActiveDays = last7.filter((_, index) => habits.some((habit) => habit.weekLog[index])).length;
  const selectedDayIndex = Math.max(0, last7.indexOf(selectedDay));
  const bestPeriod =
    ["Manhã", "Tarde", "Noite"].sort(
      (a, b) =>
        habits.filter((habit) => habit.period === b && habit.weekLog.some(Boolean)).length -
        habits.filter((habit) => habit.period === a && habit.weekLog.some(Boolean)).length,
    )[0] ?? "Manhã";

  async function toggleHabit(id: string) {
    const current = habits.find((habit) => habit.id === id);
    if (!current) return;

    const checked = !current.completedToday;
    setHabits((prev) =>
      prev.map((habit) =>
        habit.id === id
          ? {
              ...habit,
              completedToday: checked,
              streak: checked ? habit.streak + 1 : Math.max(0, habit.streak - 1),
              weekLog: habit.weekLog.map((value, index) => (index === 6 ? checked : value)),
            }
          : habit,
      ),
    );

    if (current.isDemo || demoMode) return;

    try {
      const response = await fetch("/api/habit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habit_id: id, date: today }),
      });
      if (!response.ok) throw new Error("toggle failed");
      const result = (await response.json()) as { checked: boolean };
      setHabits((prev) =>
        prev.map((habit) =>
          habit.id === id
            ? {
                ...habit,
                completedToday: result.checked,
                weekLog: habit.weekLog.map((value, index) => (index === 6 ? result.checked : value)),
              }
            : habit,
        ),
      );
    } catch {
      setHabits((prev) =>
        prev.map((habit) =>
          habit.id === id
            ? {
                ...habit,
                completedToday: current.completedToday,
                streak: current.streak,
                weekLog: current.weekLog,
              }
            : habit,
        ),
      );
    }
  }

  async function addHabit() {
    if (!newHabit.title.trim() || saving) return;
    setSaving(true);

    if (editingHabitId) {
      setHabits((prev) =>
        prev.map((habit) =>
          habit.id === editingHabitId
            ? {
                ...habit,
                title: newHabit.title.trim(),
                description: newHabit.description.trim() || habit.description,
                category: newHabit.category,
                period: newHabit.period,
                target: newHabit.target,
                reminder: newHabit.reminder,
                color: newHabit.color,
                icon: newHabit.icon,
                frequency: newHabit.frequency,
                weeklyTarget: newHabit.frequency === "weekly" ? newHabit.weeklyTarget : 7,
              }
            : habit,
        ),
      );
      setSaving(false);
      setEditingHabitId(null);
      setNewHabit(emptyNewHabit);
      setDialogOpen(false);
      return;
    }

    const localHabit: Habit = {
      id: `local-${Date.now()}`,
      title: newHabit.title.trim(),
      description: newHabit.description.trim() || "Uma escolha pequena para repetir com intenção.",
      category: newHabit.category,
      period: newHabit.period,
      target: newHabit.target,
      reminder: newHabit.reminder,
      color: newHabit.color,
      icon: newHabit.icon,
      frequency: newHabit.frequency,
      weeklyTarget: newHabit.frequency === "weekly" ? newHabit.weeklyTarget : 7,
      completedToday: false,
      streak: 0,
      weekLog: new Array(7).fill(false),
      paused: false,
      isDemo: demoMode,
    };

    try {
      if (demoMode) throw new Error("preview mode");
      const response = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: localHabit.title,
          description: localHabit.description,
          frequency: localHabit.frequency,
          color: localHabit.color,
          icon: localHabit.icon,
        }),
      });
      if (!response.ok) throw new Error("create failed");
      const created = (await response.json()) as ApiHabit;
      setHabits((prev) => [
        ...prev,
        {
          ...localHabit,
          id: created.id,
          isDemo: false,
        },
      ]);
    } catch {
      setHabits((prev) => [...prev, localHabit]);
    } finally {
      setSaving(false);
      setNewHabit(emptyNewHabit);
      setEditingHabitId(null);
      setDialogOpen(false);
    }
  }

  async function deleteHabit(id: string) {
    const habit = habits.find((item) => item.id === id);
    setHabits((prev) => prev.filter((item) => item.id !== id));
    if (!habit || habit.isDemo || demoMode) return;

    try {
      const response = await fetch(`/api/habits?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete failed");
    } catch {
      setHabits((prev) => [...prev, habit]);
    }
  }

  function editHabit(id: string) {
    const habit = habits.find((item) => item.id === id);
    if (!habit) return;

    setNewHabit({
      title: habit.title,
      description: habit.description,
      icon: habit.icon,
      category: habit.category,
      frequency: habit.frequency,
      weeklyTarget: habit.weeklyTarget,
      period: habit.period,
      target: habit.target,
      reminder: habit.reminder,
      color: habit.color,
    });
    setEditingHabitId(id);
    setDialogOpen(true);
  }

  function pauseHabit(id: string) {
    setHabits((prev) =>
      prev.map((habit) => (habit.id === id ? { ...habit, paused: !habit.paused } : habit)),
    );
  }

  function openWithSuggestion(title: string) {
    setNewHabit((current) => ({ ...current, title }));
    setDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="h-32 rounded-[24px] bg-muted/50 animate-pulse" />
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-32 rounded-[22px] bg-muted/50 animate-pulse" />
            ))}
          </div>
          <div className="h-72 rounded-[22px] bg-muted/50 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-violet-700">Bom dia, Camila. Vamos cuidar da sua versão de hoje?</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-zinc-950">Hábitos</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Pequenas escolhas repetidas constroem a sua melhor versão.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingHabitId(null);
                setNewHabit(emptyNewHabit);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="rounded-full" size="lg">
                <Plus className="h-4 w-4" />
                Novo hábito
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[24px] bg-white sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingHabitId ? "Editar hábito" : "Criar novo hábito"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-5 pt-2 lg:grid-cols-[1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="habit-title">Nome do hábito</Label>
                    <Input
                      id="habit-title"
                      value={newHabit.title}
                      onChange={(event) => setNewHabit((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Ex: Beber 2L de água"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="habit-description">Descrição</Label>
                    <Textarea
                      id="habit-description"
                      value={newHabit.description}
                      onChange={(event) => setNewHabit((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Por que esse hábito importa?"
                      className="min-h-20 resize-none"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Ícone</Label>
                      <Select value={newHabit.icon} onValueChange={(icon) => setNewHabit((current) => ({ ...current, icon }))}>
                        <SelectTrigger className="rounded-xl bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {iconOptions.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {newHabit.frequency === "weekly" && (
                        <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-3">
                          <Label className="text-xs">Quantos dias na semana?</Label>
                          <div className="mt-3 grid grid-cols-7 gap-1.5">
                            {Array.from({ length: 7 }, (_, index) => index + 1).map((days) => (
                              <button
                                key={days}
                                type="button"
                                onClick={() => setNewHabit((current) => ({ ...current, weeklyTarget: days }))}
                                className={cn(
                                  "grid h-9 place-items-center rounded-full border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                                  newHabit.weeklyTarget === days
                                    ? "border-violet-600 bg-violet-600 text-white shadow-sm"
                                    : "border-violet-100 bg-white text-violet-700 hover:border-violet-300",
                                )}
                                aria-pressed={newHabit.weeklyTarget === days}
                              >
                                {days}
                              </button>
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {newHabit.weeklyTarget} {newHabit.weeklyTarget === 1 ? "dia" : "dias"} por semana
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select
                        value={newHabit.category}
                        onValueChange={(category) => setNewHabit((current) => ({ ...current, category }))}
                      >
                        <SelectTrigger className="rounded-xl bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Frequência</Label>
                      <Select
                        value={newHabit.frequency}
                        onValueChange={(frequency: "daily" | "weekly") =>
                          setNewHabit((current) => ({ ...current, frequency }))
                        }
                      >
                        <SelectTrigger className="rounded-xl bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map((frequency) => (
                            <SelectItem key={frequency.value} value={frequency.value}>
                              {frequency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Período</Label>
                      <Select value={newHabit.period} onValueChange={(period) => setNewHabit((current) => ({ ...current, period }))}>
                        <SelectTrigger className="rounded-xl bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERIOD_OPTIONS.map((period) => (
                            <SelectItem key={period} value={period}>
                              {period}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="habit-target">Meta opcional</Label>
                      <Input
                        id="habit-target"
                        value={newHabit.target}
                        onChange={(event) => setNewHabit((current) => ({ ...current, target: event.target.value }))}
                        placeholder="2L, 30 min, 10 páginas"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="habit-reminder">Lembrete</Label>
                      <Input
                        id="habit-reminder"
                        value={newHabit.reminder}
                        onChange={(event) => setNewHabit((current) => ({ ...current, reminder: event.target.value }))}
                        placeholder="08:30"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewHabit((current) => ({ ...current, color }))}
                          className={cn(
                            "h-8 w-8 rounded-full border border-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                            newHabit.color === color && "scale-110 ring-2 ring-zinc-950 ring-offset-2",
                          )}
                          style={{ backgroundColor: color }}
                          aria-label={`Usar cor ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <HabitPreview habit={newHabit} />
                  <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                      <Bell className="h-4 w-4 text-violet-700" />
                      Frequência inteligente
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Comece pequeno. O painel acompanha sequência, semana e melhor horário sem transformar sua rotina em planilha.
                    </p>
                  </div>
                  <Button onClick={addHabit} disabled={!newHabit.title.trim() || saving} className="w-full rounded-full" size="lg">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {editingHabitId ? "Salvar hábito" : "Criar hábito"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="lg" className="rounded-full bg-white">
            <Settings2 className="h-4 w-4" />
            Filtros
          </Button>
        </div>
      </header>

      {habits.length > 0 && (
        <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <Card className="border-violet-100 bg-white shadow-[0_22px_70px_rgba(82,66,96,0.08)]">
            <CardContent className="grid gap-6 p-5 sm:grid-cols-[160px_1fr] sm:items-center sm:p-6">
              <ProgressCircle value={percentage} />
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Progresso de hoje</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950">
                    {completedToday} de {habits.length} hábitos concluídos
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{progressMessage(percentage)}</p>
                </div>
                <Progress value={percentage} className="h-3 bg-violet-100" />
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-violet-50 text-violet-700" variant="outline">
                    <Flame className="mr-1 h-3.5 w-3.5" />
                    {bestStreak?.streak ?? 0} dias de consistência
                  </Badge>
                  <Badge variant={percentage === 100 ? "success" : "muted"}>
                    {percentage === 100 ? "Dia completo" : "Em andamento"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <aside className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_18px_45px_rgba(82,66,96,0.07)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Insights</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-violet-50 p-4">
                <Trophy className="h-5 w-5 text-violet-700" />
                <p className="mt-2 text-sm font-semibold text-zinc-950">Melhor sequência</p>
                <p className="text-sm text-muted-foreground">{bestStreak?.title ?? "Sem dados ainda"} · {bestStreak?.streak ?? 0} dias</p>
              </div>
              <div className="rounded-2xl border border-zinc-100 p-4">
                <p className="text-sm font-semibold text-zinc-950">Hábito mais consistente</p>
                <p className="mt-1 text-sm text-muted-foreground">{mostConsistent?.title ?? "Comece hoje para descobrir."}</p>
              </div>
              <div className="rounded-2xl border border-zinc-100 p-4">
                <p className="text-sm font-semibold text-zinc-950">Precisa de atenção</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {needsAttention ? `${needsAttention.title} ficou mais quieto esta semana. Que tal voltar hoje?` : "Tudo em movimento por aqui."}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-100 p-4">
                <p className="text-sm font-semibold text-zinc-950">Seu melhor horário</p>
                <p className="mt-1 text-sm text-muted-foreground">Você tem mais constância com hábitos de {bestPeriod.toLowerCase()}.</p>
              </div>
            </div>
          </aside>
        </section>
      )}

      {habits.length === 0 ? (
        <EmptyState onSuggestion={openWithSuggestion} onCreate={() => setDialogOpen(true)} />
      ) : (
        <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {sortedHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onToggle={toggleHabit}
                onDelete={deleteHabit}
                onEdit={editHabit}
                onPause={pauseHabit}
              />
            ))}
          </div>

          <div className="space-y-5">
            <section className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_18px_45px_rgba(82,66,96,0.07)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Sua semana</p>
                  <h2 className="mt-1 text-lg font-semibold text-zinc-950">Histórico recente</h2>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                {last7.map((date, index) => {
                  const dayDone = habits.filter((habit) => habit.weekLog[index]).length;
                  const isToday = date === today;
                  const isSelected = date === selectedDay;
                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSelectedDay(date)}
                      className={cn(
                        "min-w-[74px] rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                        isSelected ? "border-violet-300 bg-violet-50" : "border-zinc-200 bg-white hover:border-violet-200",
                        isToday && "shadow-[0_12px_28px_rgba(124,58,237,0.14)]",
                      )}
                    >
                      <p className="text-xs font-semibold capitalize text-zinc-700">{formatDay(date)}</p>
                      <div className="mt-3 grid grid-cols-3 gap-1">
                        {habits.slice(0, 6).map((habit) => (
                          <span
                            key={`${date}-${habit.id}`}
                            className={cn("grid h-4 w-4 place-items-center rounded-full", habit.weekLog[index] ? "bg-violet-600 text-white" : "bg-zinc-100")}
                          >
                            {habit.weekLog[index] && <Check className="h-3 w-3" />}
                          </span>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">{dayDone}/{habits.length}</p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-muted-foreground">
                Você cumpriu seus hábitos em {weeklyActiveDays} dos últimos 7 dias. Consistência não precisa ser perfeição.
              </div>
              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />
                Concluído
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
                Pendente
              </div>
              <div className="mt-4 border-t border-zinc-100 pt-4">
                <p className="text-sm font-semibold text-zinc-950">Dia selecionado</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {habits.filter((habit) => habit.weekLog[selectedDayIndex]).length} hábitos concluídos em {formatDay(selectedDay)}.
                </p>
              </div>
            </section>

            <section className="rounded-[24px] border border-violet-100 bg-violet-50/70 p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-violet-700">
                  <Palette className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-950">Ritual de hoje</p>
                  <p className="text-sm text-muted-foreground">Escolha o hábito mais simples e marque primeiro.</p>
                </div>
              </div>
            </section>
          </div>
        </section>
      )}
    </div>
  );
}
