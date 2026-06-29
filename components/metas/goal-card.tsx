"use client";

import { useState, useRef, useEffect } from "react";
import {
  MoreHorizontal, CheckCircle2, Pause, Play, Trash2, Eye, TrendingUp,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Goal, GoalCategory } from "@/types";

type CatConfig = {
  label: string;
  emoji: string;
  chip: string;
  accent: string;
};

export const CATEGORY_CONFIG: Record<GoalCategory, CatConfig> = {
  financeiro:      { label: "Financeiro",      emoji: "💰", chip: "bg-amber-50 text-amber-700",   accent: "bg-amber-400" },
  profissional:    { label: "Trabalho",         emoji: "💼", chip: "bg-blue-50 text-blue-700",     accent: "bg-blue-400" },
  saude:           { label: "Saúde",           emoji: "💪", chip: "bg-emerald-50 text-emerald-700", accent: "bg-emerald-400" },
  autocuidado:     { label: "Autocuidado",     emoji: "🌸", chip: "bg-rose-50 text-rose-700",     accent: "bg-rose-400" },
  relacionamentos: { label: "Relacionamentos", emoji: "💝", chip: "bg-pink-50 text-pink-700",     accent: "bg-pink-400" },
  estudo:          { label: "Estudos",         emoji: "📚", chip: "bg-teal-50 text-teal-700",     accent: "bg-teal-400" },
  casa:            { label: "Casa",            emoji: "🏠", chip: "bg-orange-50 text-orange-700", accent: "bg-orange-400" },
  viagens:         { label: "Viagens",         emoji: "✈️", chip: "bg-sky-50 text-sky-700",       accent: "bg-sky-400" },
  espiritualidade: { label: "Espiritualidade", emoji: "✨", chip: "bg-violet-50 text-violet-700", accent: "bg-violet-400" },
  sonhos:          { label: "Sonhos pessoais", emoji: "🌙", chip: "bg-purple-50 text-purple-700", accent: "bg-purple-400" },
  pessoal:         { label: "Pessoal",         emoji: "🌱", chip: "bg-primary/10 text-primary",   accent: "bg-primary" },
};

const GOAL_QUOTES: Record<GoalCategory, string> = {
  financeiro:      "Cada valor guardado é um passo em direção à liberdade.",
  profissional:    "Você está construindo uma vida com mais possibilidades.",
  saude:           "Cuidar de você é o maior investimento que existe.",
  autocuidado:     "Você merece atenção e cuidado, especialmente de si mesma.",
  relacionamentos: "Laços de amor e cuidado tornam a vida mais rica.",
  estudo:          "Conhecimento é liberdade que ninguém pode tirar de você.",
  casa:            "Construir seu lar é construir o seu refúgio.",
  viagens:         "Seu próximo capítulo pode ter carimbo no passaporte.",
  espiritualidade: "Sua paz interior é uma conquista preciosa.",
  sonhos:          "Seus sonhos têm espaço, direção e caminho aqui.",
  pessoal:         "Você está construindo a vida que deseja, uma escolha de cada vez.",
};

function getStatusInfo(pct: number, status: Goal["status"]) {
  if (status === "completed") return { label: "Concluída ✓", cls: "bg-emerald-50 text-emerald-700" };
  if (status === "paused")    return { label: "Pausada",      cls: "bg-muted text-muted-foreground" };
  if (pct === 0)              return { label: "Começando",    cls: "bg-primary/10 text-primary/60" };
  if (pct < 40)               return { label: "Em andamento", cls: "bg-primary/10 text-primary" };
  if (pct < 80)               return { label: "Avançando",    cls: "bg-primary/15 text-primary" };
  return                             { label: "Quase lá! 🎯", cls: "bg-amber-50 text-amber-700" };
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function deadlineLabel(deadline: string): { text: string; urgent: boolean } {
  const d = new Date(deadline + "T00:00:00");
  const diff = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  if (diff < 0)  return { text: "Prazo vencido", urgent: true };
  if (diff === 0) return { text: "Hoje!", urgent: true };
  if (diff <= 7)  return { text: `${diff}d restantes`, urgent: true };
  if (diff <= 30) return { text: `${diff} dias`, urgent: false };
  return {
    text: d.toLocaleDateString("pt-BR", { month: "short", year: diff > 180 ? "numeric" : undefined }),
    urgent: false,
  };
}

export interface GoalCardProps {
  goal: Goal;
  compact?: boolean;
  onOpen: (goal: Goal) => void;
  onUpdateProgress: (goal: Goal) => void;
  onTogglePause: (goal: Goal) => void;
  onComplete: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

export function GoalCard({
  goal, compact,
  onOpen, onUpdateProgress, onTogglePause, onComplete, onDelete,
}: GoalCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const cat = CATEGORY_CONFIG[goal.category] ?? CATEGORY_CONFIG.pessoal;
  const steps = goal.steps ?? [];
  const completedSteps = steps.filter((s) => s.completed).length;
  const pct = Math.min(100, Math.round((goal.progress / Math.max(goal.target, 1)) * 100));
  const status = getStatusInfo(pct, goal.status);
  const isDone = goal.status === "completed";

  useEffect(() => {
    if (!menuOpen) return;
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <div
      className={cn(
        "bg-card rounded-xl border border-border shadow-sm overflow-hidden",
        "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group",
        isDone && "opacity-75",
      )}
      onClick={() => onOpen(goal)}
    >
      {/* Category accent */}
      <div className={cn("h-[3px]", cat.accent)} />

      <div className={cn("p-4", compact && "p-3")}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <span className="text-xl leading-none mt-0.5 shrink-0">
              {goal.emoji || cat.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm leading-snug line-clamp-2">{goal.title}</h3>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", cat.chip)}>
                  {cat.label}
                </span>
                {goal.priority && (
                  <span className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                    goal.priority === "essencial"  && "bg-red-50 text-red-600 border-red-100",
                    goal.priority === "importante" && "bg-primary/8 text-primary border-primary/15",
                    goal.priority === "desejo"     && "bg-muted text-muted-foreground border-border",
                  )}>
                    {goal.priority === "essencial" ? "Essencial" : goal.priority === "importante" ? "Importante" : "Desejo"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Three-dot menu */}
          <div className="relative shrink-0" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Opções da meta"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-xl shadow-xl z-20 overflow-hidden py-1">
                <MenuItem icon={<Eye className="h-3.5 w-3.5" />} onClick={() => { setMenuOpen(false); onOpen(goal); }}>
                  Ver detalhes
                </MenuItem>
                {!isDone && (
                  <>
                    <MenuItem icon={<TrendingUp className="h-3.5 w-3.5" />} onClick={() => { setMenuOpen(false); onUpdateProgress(goal); }}>
                      Atualizar progresso
                    </MenuItem>
                    <MenuItem icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />} onClick={() => { setMenuOpen(false); onComplete(goal); }}>
                      Marcar concluída
                    </MenuItem>
                    <MenuItem
                      icon={goal.status === "paused"
                        ? <Play className="h-3.5 w-3.5 text-primary" />
                        : <Pause className="h-3.5 w-3.5" />}
                      onClick={() => { setMenuOpen(false); onTogglePause(goal); }}
                    >
                      {goal.status === "paused" ? "Retomar meta" : "Pausar meta"}
                    </MenuItem>
                    <div className="border-t border-border my-1" />
                  </>
                )}
                <MenuItem
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  className="text-destructive hover:bg-destructive/5"
                  onClick={() => { setMenuOpen(false); onDelete(goal); }}
                >
                  Excluir meta
                </MenuItem>
              </div>
            )}
          </div>
        </div>

        {/* Motivational quote */}
        {!compact && (
          <p className="text-[11px] text-muted-foreground/80 italic mt-3 leading-relaxed">
            &ldquo;{GOAL_QUOTES[goal.category]}&rdquo;
          </p>
        )}

        {/* Progress */}
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between items-baseline text-xs">
            <span className="text-muted-foreground">
              {goal.goal_type === "financeira"
                ? `${formatBRL(goal.progress)} de ${formatBRL(goal.target)}`
                : goal.goal_type === "etapas" && steps.length > 0
                ? `${completedSteps} de ${steps.length} etapas`
                : goal.unit
                ? `${goal.progress} de ${goal.target} ${goal.unit}`
                : `${goal.progress} / ${goal.target}`}
            </span>
            <span className={cn("font-bold tabular-nums", isDone ? "text-emerald-600" : "text-primary")}>
              {pct}%
            </span>
          </div>
          <Progress
            value={pct}
            className={cn("h-1.5 transition-all duration-700", isDone && "[&>div]:bg-emerald-500")}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3">
          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", status.cls)}>
            {status.label}
          </span>
          {goal.deadline && (() => {
            const dl = deadlineLabel(goal.deadline);
            return (
              <span className={cn("text-[11px]", dl.urgent ? "text-red-500 font-medium" : "text-muted-foreground")}>
                {dl.text}
              </span>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  icon, children, onClick, className,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 text-sm flex items-center gap-2.5",
        "hover:bg-muted text-foreground transition-colors",
        className,
      )}
    >
      <span className="text-muted-foreground shrink-0">{icon}</span>
      {children}
    </button>
  );
}
