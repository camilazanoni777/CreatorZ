"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Flame, Plus, CheckCircle2, Circle, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const COLORS = ["#7c3aed", "#10b981", "#f59e0b", "#ec4899", "#3b82f6", "#ef4444"];
const DAYS_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];

type ApiHabit = { id: string; title: string; color: string; frequency: string };
type ApiLog = { habit_id: string; date: string };

type Habit = {
  id: string;
  title: string;
  color: string;
  completedToday: boolean;
  streak: number;
  weekLog: boolean[];
};

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

function computeStreak(habitId: string, logs: ApiLog[]): number {
  const logDates = new Set(logs.filter((l) => l.habit_id === habitId).map((l) => l.date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (logDates.has(d.toISOString().slice(0, 10))) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export default function HabitosPage() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const last7 = getLast7Days();

  const buildHabits = useCallback(
    (rawHabits: ApiHabit[], logs: ApiLog[]): Habit[] =>
      rawHabits.map((h) => ({
        id: h.id,
        title: h.title,
        color: h.color,
        completedToday: logs.some((l) => l.habit_id === h.id && l.date === today),
        streak: computeStreak(h.id, logs),
        weekLog: last7.map((d) => logs.some((l) => l.habit_id === h.id && l.date === d)),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today],
  );

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/habits?month=${month}`);
      if (res.status === 401) { router.push("/login"); return; }
      const { habits: raw, logs } = await res.json();
      setHabits(buildHabits(raw, logs));
    } finally {
      setLoading(false);
    }
  }, [month, router, buildHabits]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleHabit = async (id: string) => {
    const res = await fetch("/api/habit-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habit_id: id, date: today }),
    });
    const { checked } = await res.json();
    setHabits((prev) =>
      prev.map((h) =>
        h.id === id
          ? {
              ...h,
              completedToday: checked,
              streak: checked ? h.streak + 1 : Math.max(0, h.streak - 1),
              weekLog: h.weekLog.map((v, i) => (i === 6 ? checked : v)),
            }
          : h,
      ),
    );
  };

  const addHabit = async () => {
    if (!newTitle.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), color: newColor }),
      });
      const created = await res.json();
      setHabits((prev) => [
        ...prev,
        {
          id: created.id,
          title: created.title,
          color: created.color,
          completedToday: false,
          streak: 0,
          weekLog: new Array(7).fill(false),
        },
      ]);
      setNewTitle("");
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const completedToday = habits.filter((h) => h.completedToday).length;
  const percentage = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-muted/50 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hábitos</h1>
          <p className="text-muted-foreground text-sm mt-1">Pequenas ações que mudam tudo.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Novo hábito
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar novo hábito</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="habit-title">Nome do hábito</Label>
                <Input
                  id="habit-title"
                  placeholder="Ex: Beber 2L de água"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addHabit()}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cor</Label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      className={cn(
                        "h-8 w-8 rounded-full transition-all",
                        newColor === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : "",
                      )}
                      style={{ backgroundColor: c }}
                      aria-label={`Cor ${c}`}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={addHabit} className="w-full" disabled={!newTitle.trim() || saving}>
                {saving ? "Criando..." : "Criar hábito"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {habits.length > 0 && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-warning-foreground" />
                <span className="font-semibold">Progresso de hoje</span>
              </div>
              <Badge variant={percentage === 100 ? "success" : "muted"}>
                {completedToday}/{habits.length}
              </Badge>
            </div>
            <Progress value={percentage} className="h-2.5" />
            {percentage === 100 && (
              <p className="text-sm text-success mt-2 flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                Todos os hábitos completos! Incrível!
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {habits.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Nenhum hábito ainda. Crie o primeiro! 🌱
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => (
            <Card key={habit.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center gap-4 p-4">
                  <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: habit.color }} />
                  <button
                    onClick={() => toggleHabit(habit.id)}
                    className="shrink-0"
                    aria-label={`Marcar "${habit.title}" como ${habit.completedToday ? "não feito" : "feito"}`}
                  >
                    {habit.completedToday ? (
                      <CheckCircle2 className="h-6 w-6 transition-colors" style={{ color: habit.color }} />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground transition-colors hover:text-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium text-sm", habit.completedToday && "line-through text-muted-foreground")}>
                      {habit.title}
                    </p>
                    {habit.streak > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">🔥 {habit.streak} dias seguidos</p>
                    )}
                  </div>
                </div>
                <div className="border-t border-border px-4 py-2.5 flex gap-1.5">
                  {DAYS_SHORT.map((day, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1">
                      <span className="text-[9px] text-muted-foreground">{day}</span>
                      <div
                        className={cn("h-5 w-5 rounded-full flex items-center justify-center", !habit.weekLog[i] && "bg-muted opacity-50")}
                        style={habit.weekLog[i] ? { backgroundColor: habit.color + "33", border: `1.5px solid ${habit.color}` } : {}}
                      >
                        {habit.weekLog[i] && <div className="h-2 w-2 rounded-full" style={{ backgroundColor: habit.color }} />}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
