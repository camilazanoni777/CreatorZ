"use client";

import { useState, useEffect, useCallback } from "react";
import { Target, Plus, Trophy, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Goal } from "@/types";

const categoryConfig: Record<Goal["category"], { label: string; color: string; emoji: string }> = {
  pessoal: { label: "Pessoal", color: "bg-primary/15 text-primary", emoji: "🌱" },
  profissional: { label: "Profissional", color: "bg-accent text-accent-foreground", emoji: "💼" },
  saude: { label: "Saúde", color: "bg-success/15 text-success", emoji: "💪" },
  financeiro: { label: "Financeiro", color: "bg-warning/20 text-warning-foreground", emoji: "💰" },
  estudo: { label: "Estudo", color: "bg-secondary/20 text-secondary-foreground", emoji: "📚" },
};

export default function MetasPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updateDialogId, setUpdateDialogId] = useState<string | null>(null);
  const [updateValue, setUpdateValue] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newCategory, setNewCategory] = useState<Goal["category"]>("pessoal");
  const [newDeadline, setNewDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  const loadGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals");
      if (!res.ok) return;
      const data = await res.json();
      setGoals(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

  const addGoal = async () => {
    const target = parseFloat(newTarget);
    if (!newTitle.trim() || isNaN(target) || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          category: newCategory,
          target,
          unit: newUnit || undefined,
          deadline: newDeadline || undefined,
        }),
      });
      const goal = await res.json();
      setGoals((prev) => [...prev, goal]);
      setNewTitle("");
      setNewTarget("");
      setNewUnit("");
      setNewDeadline("");
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const updateProgress = async (id: string) => {
    const val = parseFloat(updateValue.replace(",", "."));
    if (isNaN(val)) return;
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    const newProgress = Math.min(goal.target, Math.max(0, val));
    const newStatus = newProgress >= goal.target ? "completed" : "active";

    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, progress: newProgress, status: newStatus } : g)),
    );
    setUpdateDialogId(null);
    setUpdateValue("");

    await fetch(`/api/goals?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress: newProgress, status: newStatus }),
    });
  };

  function GoalCard({ goal }: { goal: Goal }) {
    const pct = Math.round((goal.progress / goal.target) * 100);
    const cat = categoryConfig[goal.category];
    const isDone = goal.status === "completed";

    return (
      <Card className={cn("transition-all", isDone && "opacity-75")}>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", cat.color)}>
                  {cat.emoji} {cat.label}
                </span>
                {isDone && (
                  <Badge variant="success" className="text-[10px]">
                    <Trophy className="h-3 w-3 mr-1" />
                    Concluída!
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-sm leading-snug">{goal.title}</h3>
              {goal.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
              )}
            </div>
            {!isDone && (
              <button
                onClick={() => { setUpdateDialogId(goal.id); setUpdateValue(String(goal.progress)); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                aria-label="Atualizar progresso"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">
              {goal.progress}{goal.unit && ` ${goal.unit}`} / {goal.target}{goal.unit && ` ${goal.unit}`}
            </span>
          </div>
          <Progress value={pct} className={cn("h-2", isDone && "[&>div]:bg-success")} />
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-primary">{pct}%</span>
            {goal.deadline && (
              <span className="text-xs text-muted-foreground">
                até {new Date(goal.deadline + "T00:00:00").toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted/50 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Metas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeGoals.length} ativas · {completedGoals.length} concluídas
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Nova meta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar nova meta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input placeholder="Ex: Ler 12 livros" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Meta (número)</Label>
                  <Input type="number" placeholder="100" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} min="1" />
                </div>
                <div className="space-y-1.5">
                  <Label>Unidade</Label>
                  <Input placeholder="livros, %, km..." value={newUnit} onChange={(e) => setNewUnit(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={newCategory} onValueChange={(v) => setNewCategory(v as Goal["category"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prazo (opcional)</Label>
                <Input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} />
              </div>
              <Button onClick={addGoal} className="w-full" disabled={!newTitle.trim() || !newTarget || saving}>
                {saving ? "Criando..." : "Criar meta"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!updateDialogId} onOpenChange={() => setUpdateDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar progresso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Valor atual</Label>
              <Input
                type="number"
                value={updateValue}
                onChange={(e) => setUpdateValue(e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
            <Button onClick={() => updateDialogId && updateProgress(updateDialogId)} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {activeGoals.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ativas</h2>
          {activeGoals.map((g) => <GoalCard key={g.id} goal={g} />)}
        </div>
      )}

      {completedGoals.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Concluídas 🏆</h2>
          {completedGoals.map((g) => <GoalCard key={g.id} goal={g} />)}
        </div>
      )}

      {goals.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Nenhuma meta ainda. Que tal definir uma agora?</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


