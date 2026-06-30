"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus, LayoutGrid, List, Clock3, Trophy, Sparkles, Target, AlertCircle, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { GoalCard, CATEGORY_CONFIG } from "@/components/metas/goal-card";
import { GoalModal } from "@/components/metas/goal-modal";
import { GoalDetail } from "@/components/metas/goal-detail";
import type { Goal, GoalCategory, GoalStep } from "@/types";

type ViewMode = "cards" | "lista" | "timeline";
type CategoryFilter = "todas" | GoalCategory;

const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG) as GoalCategory[];

const EMPTY_SUGGESTIONS: { label: string; emoji: string }[] = [
  { label: "Juntar dinheiro", emoji: "💰" },
  { label: "Viajar mais", emoji: "✈️" },
  { label: "Cuidar da saúde", emoji: "💪" },
  { label: "Melhorar minha rotina", emoji: "🌿" },
  { label: "Crescer no trabalho", emoji: "💼" },
  { label: "Estudar algo novo", emoji: "📚" },
  { label: "Construir mais autoestima", emoji: "🌸" },
];

function pctOf(goal: Goal) {
  return Math.min(100, Math.round((goal.progress / Math.max(goal.target, 1)) * 100));
}

function isThisMonth(dateStr?: string) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function horizonOf(goal: Goal): "agora" | "em_breve" | "proximos" | "sem_prazo" {
  if (!goal.deadline) return "sem_prazo";
  const diff = Math.ceil(
    (new Date(goal.deadline + "T00:00:00").getTime() - Date.now()) / 86_400_000,
  );
  if (diff <= 30) return "agora";
  if (diff <= 180) return "em_breve";
  return "proximos";
}

function momentMessage(activeGoals: Goal[], completedThisMonth: Goal[]): string {
  const almostDone = activeGoals.find((g) => pctOf(g) >= 80);
  if (almostDone) return `Você está quase lá em "${almostDone.title}" — continue!`;
  if (completedThisMonth.length > 0) {
    return `Você já avançou em ${completedThisMonth.length} meta${completedThisMonth.length > 1 ? "s" : ""} este mês.`;
  }
  if (activeGoals.length > 0) return "Uma pequena ação hoje aproxima você da sua próxima conquista.";
  return "Toda grande mudança começa com uma intenção.";
}

function nextGoal(activeGoals: Goal[]): Goal | null {
  const withDeadline = activeGoals
    .filter((g) => g.deadline)
    .sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1));
  if (withDeadline.length > 0) return withDeadline[0];
  const sorted = [...activeGoals].sort((a, b) => pctOf(b) - pctOf(a));
  return sorted[0] ?? null;
}

export default function MetasPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("todas");
  const [view, setView] = useState<ViewMode>("cards");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [detailGoal, setDetailGoal] = useState<Goal | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadGoals = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const timer = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch("/api/goals", {
        credentials: "include",
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setGoals(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Erro ao carregar metas:", err);
      setError("Não foi possível carregar suas metas. Tente novamente.");
      setGoals([]);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
    return () => { abortRef.current?.abort(); };
  }, [loadGoals]);

  const activeGoals = useMemo(() => goals.filter((g) => g.status === "active"), [goals]);
  const pausedGoals = useMemo(() => goals.filter((g) => g.status === "paused"), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.status === "completed"), [goals]);
  const completedThisMonth = useMemo(
    () => completedGoals.filter((g) => isThisMonth(g.completed_at ?? g.updated_at)),
    [completedGoals],
  );

  const visibleActive = useMemo(
    () => [...activeGoals, ...pausedGoals].filter(
      (g) => categoryFilter === "todas" || g.category === categoryFilter,
    ),
    [activeGoals, pausedGoals, categoryFilter],
  );

  const overallPct = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((sum, g) => sum + pctOf(g), 0) / activeGoals.length)
    : 0;

  const upcoming = nextGoal(activeGoals);
  const message = momentMessage(activeGoals, completedThisMonth);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of activeGoals) counts[g.category] = (counts[g.category] ?? 0) + 1;
    return counts;
  }, [activeGoals]);

  // ── API actions ──────────────────────────────────────────────
  async function createOrUpdateGoal(data: Partial<Goal>) {
    // editingGoal sem id = prefill de sugestão rápida → é criação, não edição
    const isEdit = !!(editingGoal?.id);
    const url    = isEdit ? `/api/goals?id=${editingGoal!.id}` : "/api/goals";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(
        body.error ?? `Não foi possível ${isEdit ? "salvar" : "criar"} a meta. Tente novamente.`,
      );
    }

    if (!isEdit) {
      // POST retorna a meta criada — adiciona à lista sem recarregar tudo
      const saved = await res.json() as Goal;
      setGoals((prev) => [saved, ...prev]);
    } else {
      // PATCH: recarrega para refletir todas as mudanças
      await loadGoals();
    }
    setEditingGoal(null);
  }

  async function handleComplete(goal: Goal) {
    setGoals((prev) => prev.map((g) =>
      g.id === goal.id ? { ...g, status: "completed", progress: g.target, completed_at: new Date().toISOString() } : g,
    ));
    await fetch(`/api/goals?id=${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed", progress: goal.target, completed_at: new Date().toISOString() }),
    });
  }

  async function handleTogglePause(goal: Goal) {
    const newStatus = goal.status === "paused" ? "active" : "paused";
    setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, status: newStatus } : g));
    await fetch(`/api/goals?id=${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  async function handleDelete(goal: Goal) {
    if (!confirm(`Excluir a meta "${goal.title}"? Essa ação não pode ser desfeita.`)) return;
    setGoals((prev) => prev.filter((g) => g.id !== goal.id));
    await fetch(`/api/goals?id=${goal.id}`, { method: "DELETE" });
  }

  async function handleUpdateSteps(goal: Goal, steps: GoalStep[]) {
    setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, steps } : g));
    setDetailGoal((d) => d && d.id === goal.id ? { ...d, steps } : d);
    await fetch(`/api/goals?id=${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steps }),
    });
  }

  async function handleUpdateProgress(goal: Goal, progress: number) {
    const isComplete = progress >= goal.target;
    const patch: Record<string, unknown> = { progress };
    if (isComplete) {
      patch.status = "completed";
      patch.completed_at = new Date().toISOString();
    }
    setGoals((prev) => prev.map((g) => g.id === goal.id
      ? { ...g, progress, status: isComplete ? "completed" : g.status, completed_at: isComplete ? patch.completed_at as string : g.completed_at }
      : g));
    setDetailGoal((d) => d && d.id === goal.id
      ? { ...d, progress, status: isComplete ? "completed" : d.status }
      : d);
    await fetch(`/api/goals?id=${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  function openCreateModal(prefill?: { title: string; emoji: string }) {
    setEditingGoal(prefill ? ({ title: prefill.title, emoji: prefill.emoji } as Partial<Goal> as Goal) : null);
    setModalOpen(true);
  }

  function openEditModal(goal: Goal) {
    setDetailGoal(null);
    setEditingGoal(goal);
    setModalOpen(true);
  }

  // ── Error state ──────────────────────────────────────────────
  if (error && !loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-destructive/8 border border-destructive/20 rounded-2xl p-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-3 text-destructive/70" />
          <p className="text-sm font-medium text-foreground">{error}</p>
          <Button
            onClick={loadGoals}
            variant="outline"
            size="sm"
            className="mt-4 gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading skeleton ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-40 bg-muted/60 rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-muted/40 rounded animate-pulse" />
        </div>
        <div className="h-32 rounded-2xl bg-muted/40 animate-pulse" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-7 w-24 rounded-full bg-muted/40 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-44 rounded-xl bg-muted/40 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const hasGoals = goals.length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-7 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Metas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Transforme seus sonhos em passos possíveis.
          </p>
          {hasGoals && (
            <p className="text-xs text-muted-foreground/80 mt-2.5 flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-foreground">{activeGoals.length}</span> ativa{activeGoals.length !== 1 && "s"}
              <span className="text-border">·</span>
              <span className="font-semibold text-foreground">{completedGoals.length}</span> concluída{completedGoals.length !== 1 && "s"}
              {upcoming && (
                <>
                  <span className="text-border">·</span>
                  Próxima conquista:{" "}
                  <span className="font-semibold text-foreground">{upcoming.title}</span>
                </>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button onClick={() => openCreateModal()} size="lg" className="shadow-sm">
            <Plus className="h-4 w-4" />
            Nova meta
          </Button>
        </div>
      </div>

      {hasGoals && (
        <>
          {/* ── "Seu momento" overview ── */}
          <div className="bg-gradient-to-br from-primary/[0.06] via-card to-accent/[0.08] border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground/90">Seu momento</h2>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Circular progress */}
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9" className="stroke-muted" />
                  <circle
                    cx="50" cy="50" r="42" fill="none" strokeWidth="9"
                    strokeLinecap="round"
                    className="stroke-primary transition-all duration-1000 ease-out"
                    style={{
                      strokeDasharray: 2 * Math.PI * 42,
                      strokeDashoffset: 2 * Math.PI * 42 * (1 - overallPct / 100),
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">{overallPct}%</span>
                </div>
              </div>

              {/* Stats + message */}
              <div className="flex-1 w-full space-y-2.5 text-center sm:text-left">
                <div className="flex flex-wrap gap-4 justify-center sm:justify-start text-sm">
                  <div>
                    <span className="text-lg font-bold text-foreground">{activeGoals.length}</span>
                    <span className="text-muted-foreground ml-1">em andamento</span>
                  </div>
                  <div>
                    <span className="text-lg font-bold text-foreground">{completedThisMonth.length}</span>
                    <span className="text-muted-foreground ml-1">concluídas este mês</span>
                  </div>
                </div>
                <Progress value={overallPct} className="h-1.5 max-w-xs mx-auto sm:mx-0" />
                <p className="text-sm text-foreground/70 italic leading-relaxed">{message}</p>
              </div>
            </div>
          </div>

          {/* ── Category filters ── */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin -mx-1 px-1">
            <FilterChip
              active={categoryFilter === "todas"}
              onClick={() => setCategoryFilter("todas")}
              label="Todas"
              count={activeGoals.length}
            />
            {ALL_CATEGORIES.filter((c) => categoryCounts[c]).map((cat) => (
              <FilterChip
                key={cat}
                active={categoryFilter === cat}
                onClick={() => setCategoryFilter(cat)}
                label={CATEGORY_CONFIG[cat].label}
                emoji={CATEGORY_CONFIG[cat].emoji}
                count={categoryCounts[cat] ?? 0}
              />
            ))}
          </div>

          {/* ── View toggle ── */}
          <div className="flex items-center justify-end">
            <div className="inline-flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
              <ViewButton active={view === "cards"} onClick={() => setView("cards")} icon={<LayoutGrid className="h-3.5 w-3.5" />} label="Cards" />
              <ViewButton active={view === "lista"} onClick={() => setView("lista")} icon={<List className="h-3.5 w-3.5" />} label="Lista" />
              <ViewButton active={view === "timeline"} onClick={() => setView("timeline")} icon={<Clock3 className="h-3.5 w-3.5" />} label="Timeline" />
            </div>
          </div>

          {/* ── Goals ── */}
          {view !== "timeline" ? (
            visibleActive.length > 0 ? (
              <div className={cn(
                "grid gap-4",
                view === "cards" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
              )}>
                {visibleActive.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    compact={view === "lista"}
                    onOpen={setDetailGoal}
                    onUpdateProgress={setDetailGoal}
                    onTogglePause={handleTogglePause}
                    onComplete={handleComplete}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              <FilteredEmptyState category={categoryFilter} onClear={() => setCategoryFilter("todas")} />
            )
          ) : (
            <TimelineView
              goals={visibleActive}
              onOpen={setDetailGoal}
              onUpdateProgress={setDetailGoal}
              onTogglePause={handleTogglePause}
              onComplete={handleComplete}
              onDelete={handleDelete}
            />
          )}

          {/* ── Achievements ── */}
          {completedGoals.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-500" />
                Conquistas desbloqueadas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {completedGoals.map((g) => (
                  <AchievementCard key={g.id} goal={g} onClick={() => setDetailGoal(g)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Empty state ── */}
      {!hasGoals && (
        <EmptyState onSuggestion={(s) => openCreateModal({ title: s.label, emoji: s.emoji })} onCreate={() => openCreateModal()} />
      )}

      {/* ── Modals ── */}
      <GoalModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingGoal(null); }}
        onSave={createOrUpdateGoal}
        initial={editingGoal ?? undefined}
      />
      <GoalDetail
        goal={detailGoal}
        open={!!detailGoal}
        onClose={() => setDetailGoal(null)}
        onUpdateSteps={handleUpdateSteps}
        onUpdateProgress={handleUpdateProgress}
        onEdit={openEditModal}
      />
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────

function FilterChip({
  active, onClick, label, count, emoji,
}: { active: boolean; onClick: () => void; label: string; count: number; emoji?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      {emoji && <span>{emoji}</span>}
      {label}
      <span className={cn(
        "text-[10px] px-1.5 rounded-full",
        active ? "bg-white/20" : "bg-muted",
      )}>
        {count}
      </span>
    </button>
  );
}

function ViewButton({
  active, onClick, icon, label,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
        active ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function TimelineView({
  goals, onOpen, onUpdateProgress, onTogglePause, onComplete, onDelete,
}: {
  goals: Goal[];
  onOpen: (g: Goal) => void;
  onUpdateProgress: (g: Goal) => void;
  onTogglePause: (g: Goal) => void;
  onComplete: (g: Goal) => void;
  onDelete: (g: Goal) => void;
}) {
  const sections: { key: ReturnType<typeof horizonOf>; label: string; hint: string }[] = [
    { key: "agora", label: "Agora", hint: "até 30 dias" },
    { key: "em_breve", label: "Em breve", hint: "1 a 6 meses" },
    { key: "proximos", label: "Próximos capítulos", hint: "acima de 6 meses" },
    { key: "sem_prazo", label: "Sem prazo definido", hint: "no seu próprio tempo" },
  ];

  const grouped = sections.map((s) => ({
    ...s,
    goals: goals.filter((g) => horizonOf(g) === s.key),
  })).filter((s) => s.goals.length > 0);

  if (grouped.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhuma meta para mostrar aqui.</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-semibold text-muted-foreground">Linha do tempo dos seus sonhos</h2>
      {grouped.map((section) => (
        <div key={section.key} className="space-y-3">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
            <span className="text-xs text-muted-foreground">· {section.hint}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-3 border-l-2 border-border">
            {section.goals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onOpen={onOpen}
                onUpdateProgress={onUpdateProgress}
                onTogglePause={onTogglePause}
                onComplete={onComplete}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AchievementCard({ goal, onClick }: { goal: Goal; onClick: () => void }) {
  const cat = CATEGORY_CONFIG[goal.category] ?? CATEGORY_CONFIG.pessoal;
  const date = goal.completed_at ?? goal.updated_at;
  return (
    <button
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3 hover:shadow-sm hover:border-emerald-200 transition-all text-left"
    >
      <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-base shrink-0">
        {goal.emoji || cat.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{goal.title}</p>
        <p className="text-[11px] text-muted-foreground">
          {new Date(date).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
      <Trophy className="h-3.5 w-3.5 text-amber-400 shrink-0" />
    </button>
  );
}

function FilteredEmptyState({ category, onClear }: { category: CategoryFilter; onClear: () => void }) {
  const label = category === "todas" ? "" : CATEGORY_CONFIG[category]?.label;
  return (
    <div className="bg-card border border-border rounded-2xl py-12 text-center">
      <Target className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">
        Nenhuma meta ativa {label && `em "${label}"`} por aqui ainda.
      </p>
      <button onClick={onClear} className="text-xs text-primary hover:underline mt-2">
        Ver todas as categorias
      </button>
    </div>
  );
}

function EmptyState({
  onSuggestion, onCreate,
}: { onSuggestion: (s: { label: string; emoji: string }) => void; onCreate: () => void }) {
  return (
    <div className="bg-card border border-border rounded-2xl py-14 px-6 text-center max-w-xl mx-auto">
      <div className="w-16 h-16 rounded-full bg-primary/8 flex items-center justify-center mx-auto mb-5">
        <Target className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-lg font-bold text-foreground">
        Toda grande mudança começa com uma intenção.
      </h2>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-sm mx-auto">
        Escolha algo que você deseja construir e transforme esse desejo em passos possíveis.
      </p>
      <Button onClick={onCreate} size="lg" className="mt-6">
        <Plus className="h-4 w-4" />
        Criar minha primeira meta
      </Button>
      <div className="flex gap-2 flex-wrap justify-center mt-7">
        {EMPTY_SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            onClick={() => onSuggestion(s)}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted hover:border-primary/30 transition-colors"
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
