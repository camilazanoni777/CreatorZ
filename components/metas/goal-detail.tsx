"use client";

import { useState } from "react";
import { Plus, CheckCircle2, Circle, TrendingUp, Trophy, Pencil } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CATEGORY_CONFIG } from "@/components/metas/goal-card";
import type { Goal, GoalStep } from "@/types";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function generateStepId() {
  return Math.random().toString(36).slice(2);
}

interface GoalDetailProps {
  goal: Goal | null;
  open: boolean;
  onClose: () => void;
  onUpdateSteps: (goal: Goal, steps: GoalStep[]) => Promise<void>;
  onUpdateProgress: (goal: Goal, progress: number) => Promise<void>;
  onEdit: (goal: Goal) => void;
}

export function GoalDetail({ goal, open, onClose, onUpdateSteps, onUpdateProgress, onEdit }: GoalDetailProps) {
  const [steps, setSteps]         = useState<GoalStep[]>([]);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [progressInput, setProgressInput] = useState("");
  const [showProgress, setShowProgress]   = useState(false);
  const [saving, setSaving]       = useState(false);

  // Sync local steps when goal changes
  const goalSteps = goal?.steps ?? [];

  // Use local steps if they've been edited, otherwise use goal's steps
  const currentSteps = steps.length > 0 || (goal && goalSteps.length === 0) ? steps : goalSteps;

  if (!goal) return null;

  const cat = CATEGORY_CONFIG[goal.category] ?? CATEGORY_CONFIG.pessoal;
  const isFinancial = goal.goal_type === "financeira";
  const isSteps     = goal.goal_type === "etapas";
  const isDone      = goal.status === "completed";
  const isPaused    = goal.status === "paused";

  const completedSteps = currentSteps.filter((s) => s.completed).length;
  const pct = isSteps && currentSteps.length > 0
    ? Math.round((completedSteps / currentSteps.length) * 100)
    : Math.min(100, Math.round((goal.progress / Math.max(goal.target, 1)) * 100));

  async function toggleStep(id: string) {
    if (!goal) return;
    const updated = currentSteps.map((s) =>
      s.id === id ? { ...s, completed: !s.completed } : s,
    );
    setSteps(updated);
    setSaving(true);
    try {
      const newCompleted = updated.filter((s) => s.completed).length;
      await onUpdateSteps(goal, updated);
      await onUpdateProgress(goal, newCompleted);
    } finally {
      setSaving(false);
    }
  }

  async function addStep() {
    if (!goal) return;
    const title = newStepTitle.trim();
    if (!title) return;
    const newStep: GoalStep = { id: generateStepId(), title, completed: false };
    const updated = [...currentSteps, newStep];
    setSteps(updated);
    setNewStepTitle("");
    setSaving(true);
    try {
      await onUpdateSteps(goal, updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateProgress() {
    if (!goal) return;
    const val = parseFloat(progressInput.replace(",", "."));
    if (isNaN(val) || val < 0) return;
    const clamped = Math.min(goal.target, val);
    setSaving(true);
    try {
      await onUpdateProgress(goal, clamped);
      setShowProgress(false);
      setProgressInput("");
    } finally {
      setSaving(false);
    }
  }

  function handleOpen(v: boolean) {
    if (!v) {
      onClose();
      setSteps([]);
      setProgressInput("");
      setShowProgress(false);
    }
  }

  const priorityLabel =
    goal.priority === "essencial"  ? "Essencial"  :
    goal.priority === "importante" ? "Importante" :
    goal.priority === "desejo"     ? "Desejo"     : null;

  const statusLabel =
    isDone   ? "Concluída" :
    isPaused ? "Pausada"   : "Em andamento";

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0">
        {/* Colored top accent */}
        <div className={cn("h-1.5 rounded-t-xl", cat.accent)} />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border">
          <DialogHeader>
            <div className="flex items-start justify-between gap-2 pr-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{goal.emoji || cat.emoji}</span>
                <div>
                  <DialogTitle className="text-base font-bold leading-snug text-left">
                    {goal.title}
                  </DialogTitle>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", cat.chip)}>
                      {cat.label}
                    </span>
                    {priorityLabel && (
                      <span className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                        goal.priority === "essencial"  && "bg-red-50 text-red-600 border-red-100",
                        goal.priority === "importante" && "bg-primary/8 text-primary border-primary/15",
                        goal.priority === "desejo"     && "bg-muted text-muted-foreground border-border",
                      )}>
                        {priorityLabel}
                      </span>
                    )}
                    <span className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full",
                      isDone   && "bg-emerald-50 text-emerald-700",
                      isPaused && "bg-muted text-muted-foreground",
                      !isDone && !isPaused && "bg-primary/10 text-primary",
                    )}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onEdit(goal)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0 mt-0.5"
                aria-label="Editar meta"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Motivation */}
          {goal.motivation && (
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
              <p className="text-xs font-semibold text-primary/70 uppercase tracking-wider mb-1">
                Por que isso importa para mim
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed italic">
                &ldquo;{goal.motivation}&rdquo;
              </p>
            </div>
          )}

          {/* Description */}
          {goal.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{goal.description}</p>
          )}

          {/* Deadline */}
          {goal.deadline && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>📅</span>
              <span>
                Prazo:{" "}
                <strong className="text-foreground">
                  {new Date(goal.deadline + "T00:00:00").toLocaleDateString("pt-BR", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </strong>
              </span>
            </div>
          )}

          {/* Progress section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Progresso</h3>
              {!isDone && !isSteps && (
                <button
                  onClick={() => { setShowProgress((v) => !v); setProgressInput(String(goal.progress)); }}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <TrendingUp className="h-3 w-3" />
                  Atualizar
                </button>
              )}
            </div>

            {/* Financial display */}
            {isFinancial && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-xs text-amber-700/70 font-medium">Acumulado</p>
                    <p className="text-2xl font-bold text-amber-700">{formatBRL(goal.progress)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-amber-700/70 font-medium">Meta</p>
                    <p className="text-base font-semibold text-amber-700">{formatBRL(goal.target)}</p>
                  </div>
                </div>
                <Progress value={pct} className="h-2 bg-amber-100 [&>div]:bg-amber-500" />
                <p className="text-xs text-amber-700/70 mt-1.5">
                  Faltam <strong>{formatBRL(goal.target - goal.progress)}</strong>
                </p>
              </div>
            )}

            {/* Simple / other display */}
            {!isFinancial && !isSteps && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {goal.unit ? `${goal.progress} ${goal.unit}` : goal.progress} de{" "}
                    {goal.unit ? `${goal.target} ${goal.unit}` : goal.target}
                  </span>
                  <span className="font-bold text-primary">{pct}%</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            )}

            {/* Steps progress summary */}
            {isSteps && currentSteps.length > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <div className="flex-1">
                  <Progress value={pct} className="h-2" />
                </div>
                <span className="text-xs font-semibold text-primary shrink-0">{pct}%</span>
              </div>
            )}

            {/* Progress update input */}
            {showProgress && !isSteps && (
              <div className="bg-muted/50 rounded-xl p-3 space-y-2.5">
                <Label className="text-xs font-medium">
                  {isFinancial ? "Valor atual acumulado (R$)" : `Valor atual ${goal.unit ? `(${goal.unit})` : ""}`}
                </Label>
                <div className="flex gap-2">
                  {isFinancial && (
                    <span className="flex items-center text-sm text-muted-foreground font-medium px-2 bg-background border border-border rounded-md">
                      R$
                    </span>
                  )}
                  <Input
                    type="number"
                    value={progressInput}
                    onChange={(e) => setProgressInput(e.target.value)}
                    min="0"
                    max={goal.target}
                    className="flex-1 h-8 text-sm"
                    placeholder="0"
                    onKeyDown={(e) => e.key === "Enter" && handleUpdateProgress()}
                  />
                  <Button size="sm" onClick={handleUpdateProgress} disabled={saving} className="h-8 px-3">
                    Salvar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Steps checklist */}
          {isSteps && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Etapas</h3>
              {currentSteps.length > 0 ? (
                <div className="space-y-2">
                  {currentSteps.map((step) => (
                    <button
                      key={step.id}
                      onClick={() => !isDone && toggleStep(step.id)}
                      disabled={isDone || saving}
                      className={cn(
                        "w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left",
                        step.completed
                          ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                          : "bg-background border-border hover:bg-muted hover:border-primary/20",
                        isDone && "cursor-default",
                      )}
                    >
                      {step.completed
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        : <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
                      <span className={cn("text-sm leading-snug", step.completed && "line-through opacity-70")}>
                        {step.title}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma etapa adicionada ainda.</p>
              )}

              {/* Add new step */}
              {!isDone && (
                <div className="flex gap-2 items-center mt-2">
                  <Input
                    placeholder="Nova etapa…"
                    value={newStepTitle}
                    onChange={(e) => setNewStepTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addStep()}
                    className="h-8 text-sm flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addStep}
                    disabled={!newStepTitle.trim() || saving}
                    className="h-8 px-2.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Completion celebration */}
          {isDone && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center space-y-1">
              <Trophy className="h-6 w-6 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-emerald-700">Meta concluída!</p>
              <p className="text-xs text-emerald-600/80">
                {goal.completed_at
                  ? `Concluída em ${new Date(goal.completed_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}.`
                  : "Parabéns pela conquista!"}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-0">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
