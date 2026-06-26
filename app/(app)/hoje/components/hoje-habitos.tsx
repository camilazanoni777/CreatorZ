"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Flame, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Habit = { id: string; title: string; color: string; completed: boolean; streak: number };

export function HojeHabitos() {
  const [habits, setHabits] = useState<Habit[]>([]);

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  useEffect(() => {
    fetch(`/api/habits?month=${month}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { habits: Array<{ id: string; title: string; color: string }>; logs: Array<{ habit_id: string; date: string }> } | null) => {
        if (!data) return;
        setHabits(
          data.habits.map((h) => {
            const logDates = new Set(data.logs.filter((l) => l.habit_id === h.id).map((l) => l.date));
            let streak = 0;
            for (let i = 0; i < 90; i++) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              if (logDates.has(d.toISOString().slice(0, 10))) streak++;
              else if (i > 0) break;
            }
            return { ...h, completed: logDates.has(today), streak };
          }),
        );
      });
  }, [today, month]);

  const toggle = async (id: string) => {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, completed: !h.completed } : h)));
    const res = await fetch("/api/habit-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habit_id: id, date: today }),
    });
    const { checked } = await res.json();
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, completed: checked } : h)));
  };

  const completedCount = habits.filter((h) => h.completed).length;
  const total = habits.length;

  if (habits.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-warning-foreground" />
            Hábitos de hoje
          </CardTitle>
          <Badge variant={completedCount === total && total > 0 ? "success" : "muted"}>
            {completedCount}/{total}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {habits.map((habit) => (
            <button
              key={habit.id}
              onClick={() => toggle(habit.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                habit.completed ? "bg-muted/50 border-border" : "bg-card border-border hover:border-primary/30 hover:bg-primary/4",
              )}
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: habit.color }} />
              {habit.completed
                ? <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                : <Circle className="h-5 w-5 text-muted-foreground shrink-0" />}
              <span className={cn("text-sm font-medium flex-1", habit.completed && "line-through text-muted-foreground")}>
                {habit.title}
              </span>
              {habit.streak > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">🔥 {habit.streak}</span>
              )}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="w-full mt-3 text-xs" asChild>
          <Link href="/habitos">Gerenciar hábitos</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
