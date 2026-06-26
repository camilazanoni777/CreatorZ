"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Circle, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

const priorityConfig = {
  high: { label: "Alta", variant: "destructive" as const },
  medium: { label: "Média", variant: "warning" as const },
  low: { label: "Baixa", variant: "muted" as const },
};

type Status = Task["status"];

const statusConfig: Record<Status, { label: string; icon: React.ElementType }> = {
  todo: { label: "A fazer", icon: Circle },
  doing: { label: "Fazendo", icon: Clock },
  done: { label: "Feito", icon: CheckCircle2 },
};

function TaskItem({
  task,
  onStatusChange,
  onDelete,
}: {
  task: Task;
  onStatusChange: (id: string, s: Status) => void;
  onDelete: (id: string) => void;
}) {
  const nextStatus: Record<Status, Status> = { todo: "doing", doing: "done", done: "todo" };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all group",
        task.status === "done" ? "bg-muted/30 border-transparent" : "bg-card border-border",
      )}
    >
      <button
        onClick={() => onStatusChange(task.id, nextStatus[task.status])}
        className="shrink-0"
        aria-label={`Avançar status de "${task.title}"`}
      >
        {task.status === "done" ? (
          <CheckCircle2 className="h-5 w-5 text-success" />
        ) : task.status === "doing" ? (
          <Clock className="h-5 w-5 text-warning-foreground" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate",
            task.status === "done" && "line-through text-muted-foreground",
          )}
        >
          {task.title}
        </p>
        {task.tags.length > 0 && (
          <div className="flex gap-1 mt-0.5">
            {task.tags.map((tag) => (
              <span key={tag} className="text-[10px] text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <Badge variant={priorityConfig[task.priority].variant} className="text-[10px] shrink-0">
        {priorityConfig[task.priority].label}
      </Badge>

      <button
        onClick={() => onDelete(task.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-destructive"
        aria-label={`Deletar "${task.title}"`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function TarefasPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");
  const [saving, setSaving] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const byStatus = (s: Status) => tasks.filter((t) => t.status === s);

  const changeStatus = async (id: string, status: Status) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    await fetch(`/api/tasks?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
  };

  const addTask = async () => {
    if (!newTitle.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), priority: newPriority, tags: [] }),
      });
      const task = await res.json();
      setTasks((prev) => [{ ...task, tags: task.tags ?? [] }, ...prev]);
      setNewTitle("");
      setNewPriority("medium");
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {tasks.filter((t) => t.status !== "done").length} pendentes ·{" "}
            {tasks.filter((t) => t.status === "done").length} concluídas
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Nova tarefa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova tarefa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="task-title">Título</Label>
                <Input
                  id="task-title"
                  placeholder="O que precisa ser feito?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select
                  value={newPriority}
                  onValueChange={(v) => setNewPriority(v as Task["priority"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">🔴 Alta</SelectItem>
                    <SelectItem value="medium">🟡 Média</SelectItem>
                    <SelectItem value="low">🟢 Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addTask} className="w-full" disabled={!newTitle.trim() || saving}>
                {saving ? "Criando..." : "Criar tarefa"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="todo">
        <TabsList className="w-full">
          {(["todo", "doing", "done"] as Status[]).map((s) => (
            <TabsTrigger key={s} value={s} className="flex-1">
              {statusConfig[s].label}
              {byStatus(s).length > 0 && (
                <Badge variant="muted" className="ml-2 text-[10px] px-1.5 py-0.5">
                  {byStatus(s).length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {(["todo", "doing", "done"] as Status[]).map((s) => (
          <TabsContent key={s} value={s} className="mt-4 space-y-2">
            {byStatus(s).length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground text-sm">
                  {s === "done"
                    ? "Nenhuma tarefa concluída ainda. Vai lá! 💪"
                    : s === "doing"
                      ? "Nenhuma tarefa em andamento."
                      : "Nada para fazer? Aproveite! 🎉"}
                </CardContent>
              </Card>
            ) : (
              byStatus(s).map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onStatusChange={changeStatus}
                  onDelete={deleteTask}
                />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
