"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckSquare, Circle, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

const priorityConfig = {
  high: { label: "Alta", variant: "destructive" as const },
  medium: { label: "Média", variant: "warning" as const },
  low: { label: "Baixa", variant: "muted" as const },
};

export function HojeTarefas() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    fetch("/api/tasks?status=todo,doing")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Task[] | null) => {
        if (data) setTasks(Array.isArray(data) ? data.slice(0, 5) : []);
      });
  }, []);

  const done = tasks.filter((t) => t.status === "done");

  const markDone = async (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "done" as const } : t)));
    await fetch(`/api/tasks?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
  };

  if (tasks.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="h-4 w-4 text-primary" />
            Tarefas do dia
          </CardTitle>
          <Badge variant={done.length === tasks.length && tasks.length > 0 ? "success" : "muted"}>
            {done.length}/{tasks.length} feitas
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => task.status !== "done" && markDone(task.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all",
              task.status === "done" ? "bg-muted/40 border-transparent" : "bg-card border-border hover:border-primary/30",
            )}
          >
            {task.status === "done"
              ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              : task.priority === "high"
                ? <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
            <span className={cn("text-sm flex-1", task.status === "done" && "line-through text-muted-foreground")}>
              {task.title}
            </span>
            {task.status !== "done" && (
              <Badge variant={priorityConfig[task.priority].variant} className="text-[10px]">
                {priorityConfig[task.priority].label}
              </Badge>
            )}
          </button>
        ))}
        <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" asChild>
          <Link href="/tarefas">Ver todas as tarefas</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
