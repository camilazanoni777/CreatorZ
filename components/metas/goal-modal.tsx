"use client";

import { useState, useId } from "react";
import { Plus, Minus, DollarSign, CheckSquare, Zap } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CATEGORY_CONFIG } from "@/components/metas/goal-card";
import type { Goal, GoalCategory, GoalType, GoalPriority, GoalStep } from "@/types";

const QUICK_EMOJIS = [
  "🎯","💰","✈️","💼","💪","📚","🏠","❤️","🌱","✨",
  "🏆","⭐","🎓","🌸","💎","🚀","🎵","📖","🏃","🌙",
  "💝","🌊","🎨","🧘","💻","📝","🌟","🦋","🌺","🏡",
];

const CATEGORIES = Object.entries(CATEGORY_CONFIG) as [GoalCategory, (typeof CATEGORY_CONFIG)[GoalCategory]][];

const GOAL_TYPES: { value: GoalType; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: "simples",
    label: "Meta simples",
    desc: "Número ou quantidade a alcançar",
    icon: <Zap className="h-4 w-4" />,
  },
  {
    value: "financeira",
    label: "Meta financeira",
    desc: "Valor em reais a guardar ou alcançar",
    icon: <DollarSign className="h-4 w-4" />,
  },
  {
    value: "etapas",
    label: "Com etapas",
    desc: "Lista de passos a cumprir",
    icon: <CheckSquare className="h-4 w-4" />,
  },
];

const PRIORITIES: { value: GoalPriority; label: string; desc: string; cls: string }[] = [
  { value: "essencial",  label: "Essencial",  desc: "Prioridade máxima", cls: "border-red-200 bg-red-50 text-red-700" },
  { value: "importante", label: "Importante", desc: "Alta prioridade",   cls: "border-primary/30 bg-primary/8 text-primary" },
  { value: "desejo",     label: "Desejo",     desc: "Quando possível",  cls: "border-border bg-muted text-muted-foreground" },
];

const QUICK_SUGGESTIONS = [
  { label: "Juntar dinheiro",     emoji: "💰", category: "financeiro" as GoalCategory, goal_type: "financeira" as GoalType },
  { label: "Viajar mais",        emoji: "✈️", category: "viagens"    as GoalCategory, goal_type: "etapas"    as GoalType },
  { label: "Cuidar da saúde",    emoji: "💪", category: "saude"      as GoalCategory, goal_type: "simples"   as GoalType },
  { label: "Crescer no trabalho",emoji: "💼", category: "profissional" as GoalCategory, goal_type: "etapas"  as GoalType },
  { label: "Estudar algo novo",  emoji: "📚", category: "estudo"     as GoalCategory, goal_type: "simples"   as GoalType },
  { label: "Ter mais autocuidado",emoji: "🌸", category: "autocuidado" as GoalCategory, goal_type: "etapas" as GoalType },
];

function generateStepId() {
  return Math.random().toString(36).slice(2);
}

interface GoalModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Goal>) => Promise<void>;
  initial?: Partial<Goal>;
}

export function GoalModal({ open, onClose, onSave, initial }: GoalModalProps) {
  const uid = useId();
  const isEdit = !!initial?.id;

  const [title, setTitle]           = useState(initial?.title ?? "");
  const [emoji, setEmoji]           = useState(initial?.emoji ?? "");
  const [category, setCategory]     = useState<GoalCategory>(initial?.category ?? "pessoal");
  const [goalType, setGoalType]     = useState<GoalType>(initial?.goal_type ?? "simples");
  const [priority, setPriority]     = useState<GoalPriority>(initial?.priority ?? "importante");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [motivation, setMotivation] = useState(initial?.motivation ?? "");
  const [deadline, setDeadline]     = useState(initial?.deadline ?? "");
  const [target, setTarget]         = useState(String(initial?.target ?? ""));
  const [unit, setUnit]             = useState(initial?.unit ?? "");
  const [steps, setSteps]           = useState<GoalStep[]>(initial?.steps ?? [{ id: generateStepId(), title: "", completed: false }]);
  const [saving, setSaving]         = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);

  const canSave = title.trim() && (
    goalType === "etapas"
      ? steps.some((s) => s.title.trim())
      : parseFloat(target) > 0
  );

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const validSteps = steps.filter((s) => s.title.trim());
      const numTarget = goalType === "etapas"
        ? validSteps.length || 1
        : parseFloat(target);

      await onSave({
        title: title.trim(),
        emoji: emoji || undefined,
        category,
        goal_type: goalType,
        priority,
        description: description.trim() || undefined,
        motivation: motivation.trim() || undefined,
        deadline: deadline || undefined,
        target: numTarget,
        unit: goalType === "simples" ? (unit.trim() || undefined) : undefined,
        steps: goalType === "etapas" ? validSteps : [],
        progress: initial?.progress ?? 0,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function addStep() {
    setSteps((prev) => [...prev, { id: generateStepId(), title: "", completed: false }]);
  }

  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }

  function updateStep(id: string, title: string) {
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, title } : s));
  }

  function applyQuickSuggestion(s: typeof QUICK_SUGGESTIONS[0]) {
    setTitle(s.label);
    setEmoji(s.emoji);
    setCategory(s.category);
    setGoalType(s.goal_type);
  }

  const selectedCat = CATEGORY_CONFIG[category];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {isEdit ? "Editar meta" : "Nova meta"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEdit ? "Atualize os detalhes da sua meta." : "Transforme uma intenção em um caminho concreto."}
            </p>
          </DialogHeader>

          {/* Quick suggestions (only for new goals) */}
          {!isEdit && (
            <div className="flex gap-2 flex-wrap mt-4">
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => applyQuickSuggestion(s)}
                  className="text-xs px-2.5 py-1 rounded-full border border-border bg-background hover:bg-muted hover:border-primary/30 transition-colors"
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Emoji + Title */}
          <div className="flex gap-3 items-start">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojis((v) => !v)}
                className={cn(
                  "w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl transition-all",
                  showEmojis ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-muted",
                )}
                aria-label="Selecionar emoji"
              >
                {emoji || selectedCat.emoji}
              </button>
              {showEmojis && (
                <div className="absolute top-full left-0 mt-1 z-10 bg-popover border border-border rounded-xl p-2.5 shadow-xl grid grid-cols-6 gap-1 w-52">
                  {QUICK_EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => { setEmoji(e); setShowEmojis(false); }}
                      className={cn(
                        "w-8 h-8 rounded-lg text-lg hover:bg-muted transition-colors flex items-center justify-center",
                        emoji === e && "bg-primary/10 ring-1 ring-primary",
                      )}
                    >
                      {e}
                    </button>
                  ))}
                  <button
                    onClick={() => { setEmoji(""); setShowEmojis(false); }}
                    className="col-span-6 text-xs text-muted-foreground hover:text-foreground mt-1 py-1 text-center"
                  >
                    Usar padrão da categoria
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor={`${uid}-title`} className="text-sm font-medium">Nome da meta</Label>
              <Input
                id={`${uid}-title`}
                placeholder="Ex: Criar minha reserva de emergência"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="font-medium"
                autoFocus
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Categoria</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {CATEGORIES.map(([cat, cfg]) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all",
                    category === cat
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-border hover:border-primary/30 hover:bg-muted",
                  )}
                >
                  <span>{cfg.emoji}</span>
                  <span className="truncate">{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Goal Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo de meta</Label>
            <div className="grid grid-cols-3 gap-2">
              {GOAL_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setGoalType(t.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all",
                    goalType === t.value
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-border hover:border-primary/30 hover:bg-muted",
                  )}
                >
                  <span className={cn(
                    goalType === t.value ? "text-primary" : "text-muted-foreground",
                  )}>
                    {t.icon}
                  </span>
                  <span className="text-xs font-medium leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Type-specific fields */}
          {goalType === "simples" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor={`${uid}-target`} className="text-sm font-medium">Meta (número)</Label>
                <Input
                  id={`${uid}-target`}
                  type="number"
                  min="1"
                  placeholder="Ex: 12"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${uid}-unit`} className="text-sm font-medium">Unidade (opcional)</Label>
                <Input
                  id={`${uid}-unit`}
                  placeholder="livros, km, %…"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>
            </div>
          )}

          {goalType === "financeira" && (
            <div className="space-y-1">
              <Label htmlFor={`${uid}-target-fin`} className="text-sm font-medium">Valor alvo (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">R$</span>
                <Input
                  id={`${uid}-target-fin`}
                  type="number"
                  min="1"
                  placeholder="10.000"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          )}

          {goalType === "etapas" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Etapas</Label>
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <div key={step.id} className="flex gap-2 items-center">
                    <span className="text-xs text-muted-foreground w-4 text-right shrink-0">{i + 1}.</span>
                    <Input
                      placeholder={`Etapa ${i + 1}…`}
                      value={step.title}
                      onChange={(e) => updateStep(step.id, e.target.value)}
                      className="flex-1 h-8 text-sm"
                    />
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(step.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        aria-label="Remover etapa"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addStep}
                className="text-primary hover:text-primary hover:bg-primary/8 h-7 px-2 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar etapa
              </Button>
            </div>
          )}

          {/* Priority */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Prioridade</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 p-2.5 rounded-xl border text-center transition-all",
                    priority === p.value ? p.cls + " border-current/30" : "border-border hover:bg-muted",
                  )}
                >
                  <span className="text-xs font-semibold">{p.label}</span>
                  <span className="text-[10px] opacity-70">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-1">
            <Label htmlFor={`${uid}-deadline`} className="text-sm font-medium">
              Prazo <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id={`${uid}-deadline`}
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor={`${uid}-desc`} className="text-sm font-medium">
              Descrição <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id={`${uid}-desc`}
              placeholder="Detalhes sobre essa meta…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Motivation */}
          <div className="space-y-1">
            <Label htmlFor={`${uid}-motivation`} className="text-sm font-medium">
              Por que isso importa para mim? <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id={`${uid}-motivation`}
              placeholder="Ex: Quero ter segurança para poder tomar decisões livres na minha vida…"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-0 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={!canSave || saving}
          >
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar minha meta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
