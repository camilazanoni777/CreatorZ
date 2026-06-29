"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Coffee,
  Droplets,
  GripVertical,
  Heart,
  Home,
  ListPlus,
  Loader2,
  Moon,
  MoreHorizontal,
  PiggyBank,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  SunMedium,
  Target,
  Trash2,
  Utensils,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  categories,
  createDefaultDaily,
  moodMessages,
  periods,
  priorityLevels,
  reorganizeOptions,
} from "./daily-defaults";
import type {
  DailyCategory,
  DailyEntry,
  DailyHabit,
  DailyPriority,
  DayPeriod,
  ExtraTask,
  FinanceLog,
  PriorityLevel,
  RhythmBlock,
} from "./daily-types";

const habitIcons = {
  droplets: Droplets,
  sparkles: Sparkles,
  utensils: Utensils,
  activity: Activity,
  target: Target,
  home: Home,
  heart: Heart,
  moon: Moon,
  check: Check,
  calendar: CalendarDays,
};

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatFullDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(parsed);
}

function cleanTitle(value: string) {
  return value.trim().length > 0;
}

function SelectField<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <label className={cn("min-w-0", className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-9 w-full rounded-full border border-primary/20 bg-white/80 px-3 text-xs font-medium text-zinc-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function SectionTitle({
  icon: Icon,
  label,
  title,
  subtitle,
}: {
  icon: typeof Sparkles;
  label: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function SoftCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Card className={cn("rounded-[1.25rem] border-zinc-200/80 bg-white/90 shadow-[0_18px_50px_rgba(82,66,96,0.08)]", className)}>
      {children}
    </Card>
  );
}

function DailyHeader({
  date,
  completed,
  total,
  progress,
  saving,
  onReorganize,
  onWeek,
}: {
  date: string;
  completed: number;
  total: number;
  progress: number;
  saving: boolean;
  onReorganize: () => void;
  onWeek: () => void;
}) {
  return (
    <section className="rounded-[1.5rem] border border-primary/10 bg-[linear-gradient(135deg,#fff_0%,#fbf7ff_50%,#f7fff9_100%)] p-5 shadow-[0_24px_70px_rgba(82,66,96,0.10)] sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[1fr_260px] lg:items-center">
        <div className="space-y-4">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {formatFullDate(date)}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              Seu dia, do seu jeito.
            </h1>
            <p className="mt-3 text-base text-muted-foreground">Pequenas escolhas criam uma vida bonita.</p>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600">
            Hoje você não precisa fazer tudo. Só precisa cuidar do que importa.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-full bg-white/80" onClick={onReorganize}>
              <RefreshCw className="h-4 w-4" />
              Reorganizar meu dia
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={onWeek}>
              <CalendarDays className="h-4 w-4" />
              Ver minha semana
            </Button>
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-3 text-xs font-medium text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", saving ? "bg-warning" : "bg-success")} />
              {saving ? "Salvando..." : "Salvo automaticamente"}
            </span>
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-white bg-white/75 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Progresso</p>
              <p className="mt-2 text-2xl font-semibold">{completed} de {total}</p>
              <p className="text-xs text-muted-foreground">concluídos sem pressão</p>
            </div>
            <div className="grid h-20 w-20 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {progress}%
            </div>
          </div>
          <Progress value={progress} className="mt-4 h-2" />
        </div>
      </div>
    </section>
  );
}

function MorningCheckIn({
  daily,
  update,
}: {
  daily: DailyEntry;
  update: (patch: Partial<DailyEntry>) => void;
}) {
  return (
    <SoftCard>
      <CardHeader>
        <SectionTitle
          icon={SunMedium}
          label="Check-in rápido"
          title="Como você está chegando hoje?"
          subtitle="Escolha o clima do dia e deixe uma intenção curta."
        />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {Object.keys(moodMessages).map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() => update({ mood_label: mood, arrival_message: moodMessages[mood] })}
              className={cn(
                "rounded-full border px-3 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm",
                daily.mood_label === mood
                  ? "border-primary bg-primary text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-primary/40",
              )}
            >
              {mood}
            </button>
          ))}
        </div>
        {daily.arrival_message ? (
          <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-zinc-700">
            {daily.arrival_message}
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Minha intenção para hoje é...</Label>
            <Input
              value={daily.intention}
              maxLength={120}
              onChange={(event) => update({ intention: event.target.value })}
              placeholder="ex.: agir com calma"
              className="rounded-2xl bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label>Hoje seria um bom dia se eu...</Label>
            <Input
              value={daily.good_day}
              maxLength={120}
              onChange={(event) => update({ good_day: event.target.value })}
              placeholder="ex.: terminasse o essencial"
              className="rounded-2xl bg-white"
            />
          </div>
        </div>
      </CardContent>
    </SoftCard>
  );
}

function PrioritiesSection({
  priorities,
  extras,
  updatePriorities,
  updateExtras,
}: {
  priorities: DailyPriority[];
  extras: ExtraTask[];
  updatePriorities: (value: DailyPriority[]) => void;
  updateExtras: (value: ExtraTask[]) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const mainPriorities = priorities.slice(0, 3);
  const complete = mainPriorities.length > 0 && mainPriorities.every((item) => item.done && cleanTitle(item.title));

  function patch(id: string, patchValue: Partial<DailyPriority>) {
    updatePriorities(priorities.map((item) => (item.id === id ? { ...item, ...patchValue } : item)));
  }

  function addPriority() {
    if (mainPriorities.length < 3) {
      updatePriorities([
        ...priorities,
        { id: uid("priority"), title: "", category: "Pessoal", level: "Média", done: false },
      ]);
      return;
    }
    updateExtras([
      ...extras,
      { id: uid("extra"), title: "", category: "Pessoal", dueDate: "", done: false },
    ]);
  }

  function movePriority(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    const current = [...priorities];
    const from = current.findIndex((item) => item.id === draggingId);
    const to = current.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = current.splice(from, 1);
    current.splice(to, 0, moved);
    updatePriorities(current);
    setDraggingId(null);
  }

  return (
    <SoftCard className="min-h-full">
      <CardHeader>
        <SectionTitle
          icon={Target}
          label="Foco do dia"
          title="Suas 3 prioridades de hoje"
          subtitle="O que, se for feito, já fará seu dia valer a pena?"
        />
      </CardHeader>
      <CardContent className="space-y-3">
        {mainPriorities.map((priority) => (
          <div
            key={priority.id}
            draggable
            onDragStart={() => setDraggingId(priority.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => movePriority(priority.id)}
            className={cn(
              "rounded-[1.1rem] border bg-white p-3 shadow-sm transition",
              priority.done ? "border-primary/20 bg-primary/5" : "border-zinc-200",
            )}
          >
            <div className="flex items-center gap-3">
              <button type="button" className="cursor-grab text-muted-foreground" aria-label="Arrastar prioridade">
                <GripVertical className="h-4 w-4" />
              </button>
              <Checkbox checked={priority.done} onCheckedChange={(checked) => patch(priority.id, { done: Boolean(checked) })} />
              <Input
                value={priority.title}
                onChange={(event) => patch(priority.id, { title: event.target.value })}
                placeholder="Escreva uma prioridade clara"
                className={cn("h-10 flex-1 rounded-xl border-0 bg-transparent px-0 shadow-none focus-visible:ring-0", priority.done && "text-muted-foreground line-through")}
              />
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-muted-foreground hover:text-destructive"
                onClick={() => updatePriorities(priorities.filter((item) => item.id !== priority.id))}
                aria-label="Excluir prioridade"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <SelectField value={priority.category} options={categories} onChange={(value) => patch(priority.id, { category: value })} label="Categoria" />
              <SelectField value={priority.level} options={priorityLevels} onChange={(value) => patch(priority.id, { level: value })} label="Prioridade" />
            </div>
          </div>
        ))}
        {complete ? (
          <div className="rounded-2xl border border-success/20 bg-success/10 p-3 text-sm font-medium text-zinc-700">
            Você cumpriu o essencial. O resto agora é bônus.
          </div>
        ) : null}
        <Button variant="outline" className="w-full rounded-full bg-white" onClick={addPriority}>
          <Plus className="h-4 w-4" />
          Adicionar prioridade
        </Button>
      </CardContent>
    </SoftCard>
  );
}

function RhythmSection({
  blocks,
  events,
  update,
}: {
  blocks: RhythmBlock[];
  events: DailyEntry["important_events"];
  update: (value: RhythmBlock[]) => void;
}) {
  function patch(id: string, patchValue: Partial<RhythmBlock>) {
    update(blocks.map((item) => (item.id === id ? { ...item, ...patchValue } : item)));
  }

  function addBlock(period: DayPeriod = "Manhã") {
    update([
      ...blocks,
      { id: uid("rhythm"), period, time: "", title: "", category: "Pessoal", done: false },
    ]);
  }

  return (
    <SoftCard className="min-h-full">
      <CardHeader>
        <SectionTitle
          icon={Clock3}
          label="Agenda leve"
          title="Seu ritmo de hoje"
          subtitle="Organize blocos sem transformar o dia em planilha."
        />
      </CardHeader>
      <CardContent className="space-y-5">
        {periods.map((period) => (
          <div key={period} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{period}</h3>
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => addBlock(period)}>
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {blocks.filter((item) => item.period === period).map((block) => (
                <div key={block.id} className="grid gap-2 rounded-2xl border border-zinc-200 bg-white p-3 sm:grid-cols-[76px_1fr_140px_40px] sm:items-center">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={block.done} onCheckedChange={(checked) => patch(block.id, { done: Boolean(checked) })} />
                    <Input value={block.time} onChange={(event) => patch(block.id, { time: event.target.value })} placeholder="09:00" className="h-9 rounded-xl" />
                  </div>
                  <Input value={block.title} onChange={(event) => patch(block.id, { title: event.target.value })} placeholder="Nome da atividade" className="h-9 rounded-xl" />
                  <SelectField value={block.category} options={categories} onChange={(value) => patch(block.id, { category: value })} label="Categoria" />
                  <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-destructive" onClick={() => update(blocks.filter((item) => item.id !== block.id))} aria-label="Excluir bloco">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
        <Button variant="outline" className="w-full rounded-full bg-white" onClick={() => addBlock()}>
          <ListPlus className="h-4 w-4" />
          Adicionar ao meu dia
        </Button>
        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
          <h3 className="text-sm font-semibold">Compromissos importantes</h3>
          <div className="mt-3 space-y-2">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum compromisso vindo da Agenda para hoje.</p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="flex items-center gap-2 text-sm text-zinc-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: event.color ?? "#a78bfa" }} />
                  <span>{event.title}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </SoftCard>
  );
}

function HabitsSection({
  habits,
  water,
  movement,
  updateHabits,
  update,
}: {
  habits: DailyHabit[];
  water: number;
  movement: string;
  updateHabits: (value: DailyHabit[]) => void;
  update: (patch: Partial<DailyEntry>) => void;
}) {
  function patch(id: string, patchValue: Partial<DailyHabit>) {
    updateHabits(habits.map((habit) => (habit.id === id ? { ...habit, ...patchValue } : habit)));
  }

  return (
    <SoftCard>
      <CardHeader>
        <SectionTitle
          icon={Heart}
          label="Cuidado pessoal"
          title="Meu básico bem feito"
          subtitle="Personalize o que aparece hoje e marque sem perfeccionismo."
        />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-2 md:grid-cols-2">
          {habits.map((habit) => {
            const Icon = habitIcons[habit.icon as keyof typeof habitIcons] ?? Sparkles;
            return (
              <div key={habit.id} className={cn("flex items-center gap-3 rounded-2xl border p-3 transition", habit.visible ? "border-zinc-200 bg-white" : "border-dashed border-zinc-200 bg-zinc-50/80 opacity-70")}>
                <Checkbox checked={habit.done} disabled={!habit.visible} onCheckedChange={(checked) => patch(habit.id, { done: Boolean(checked) })} />
                <Icon className="h-4 w-4 text-primary" />
                <Input value={habit.title} onChange={(event) => patch(habit.id, { title: event.target.value })} className={cn("h-8 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0", habit.done && "line-through text-muted-foreground")} />
                <button
                  type="button"
                  onClick={() => patch(habit.id, { visible: !habit.visible, done: habit.visible ? false : habit.done })}
                  className="rounded-full px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-primary/10"
                >
                  {habit.visible ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            );
          })}
        </div>
        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Água</p>
                <p className="text-xs text-muted-foreground">{water}/8 copos</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-white" onClick={() => update({ water_count: Math.max(0, water - 1) })}>-</Button>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-white" onClick={() => update({ water_count: Math.min(20, water + 1) })}>+</Button>
              </div>
            </div>
            <Progress value={Math.min(100, (water / 8) * 100)} className="mt-4 h-2" />
          </div>
          <div className="space-y-2">
            <Label>Movimentei meu corpo como?</Label>
            <Input value={movement} onChange={(event) => update({ movement_note: event.target.value })} placeholder="caminhada, academia, dança, alongamento" className="rounded-2xl bg-white" />
          </div>
        </div>
      </CardContent>
    </SoftCard>
  );
}

function ExtraTasksSection({
  tasks,
  priorities,
  updateTasks,
  updatePriorities,
}: {
  tasks: ExtraTask[];
  priorities: DailyPriority[];
  updateTasks: (value: ExtraTask[]) => void;
  updatePriorities: (value: DailyPriority[]) => void;
}) {
  const [open, setOpen] = useState(true);
  const [filter, setFilter] = useState<"Todas" | DailyCategory>("Todas");
  const visible = filter === "Todas" ? tasks : tasks.filter((task) => task.category === filter);

  function patch(id: string, patchValue: Partial<ExtraTask>) {
    updateTasks(tasks.map((task) => (task.id === id ? { ...task, ...patchValue } : task)));
  }

  function addTask() {
    updateTasks([...tasks, { id: uid("extra"), title: "", category: "Pessoal", dueDate: "", done: false }]);
    setOpen(true);
  }

  function promote(task: ExtraTask) {
    const nextPriority = {
      id: uid("priority"),
      title: task.title,
      category: task.category,
      level: "Média" as PriorityLevel,
      done: task.done,
    };
    updatePriorities([...priorities.slice(0, 2), nextPriority, ...priorities.slice(2)]);
    updateTasks(tasks.filter((item) => item.id !== task.id));
  }

  function postpone(task: ExtraTask) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    patch(task.id, { dueDate: tomorrow.toISOString().slice(0, 10), done: false });
  }

  return (
    <SoftCard>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle icon={MoreHorizontal} label="Sem urgência" title="Tarefas extras" />
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setOpen(!open)} aria-label="Abrir tarefas extras">
            <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
          </Button>
        </div>
      </CardHeader>
      {open ? (
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["Todas", "Trabalho", "Pessoal", "Casa", "Financeiro", "Estudos"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition", filter === item ? "border-primary bg-primary text-white" : "border-zinc-200 bg-white text-muted-foreground")}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {visible.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-zinc-200 p-4 text-sm text-muted-foreground">
                Nenhuma tarefa extra aqui. Se aparecer algo, ela fica separada do essencial.
              </p>
            ) : (
              visible.map((task) => (
                <div key={task.id} className="grid gap-2 rounded-2xl border border-zinc-200 bg-white p-3 lg:grid-cols-[28px_1fr_140px_140px_auto] lg:items-center">
                  <Checkbox checked={task.done} onCheckedChange={(checked) => patch(task.id, { done: Boolean(checked) })} />
                  <Input value={task.title} onChange={(event) => patch(task.id, { title: event.target.value })} placeholder="Nome da tarefa" className="rounded-xl" />
                  <SelectField value={task.category} options={categories} onChange={(value) => patch(task.id, { category: value })} label="Categoria" />
                  <Input type="date" value={task.dueDate} onChange={(event) => patch(task.id, { dueDate: event.target.value })} className="rounded-xl" />
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => promote(task)} aria-label="Transformar em prioridade">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => postpone(task)} aria-label="Adiar para amanhã">
                      <CalendarDays className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-destructive" onClick={() => updateTasks(tasks.filter((item) => item.id !== task.id))} aria-label="Excluir tarefa">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <Button variant="outline" className="w-full rounded-full bg-white" onClick={addTask}>
            <Plus className="h-4 w-4" />
            Adicionar tarefa extra
          </Button>
        </CardContent>
      ) : null}
    </SoftCard>
  );
}

function FinanceSection({
  logs,
  dailyId,
  date,
  update,
}: {
  logs: FinanceLog[];
  dailyId?: string;
  date: string;
  update: (value: FinanceLog[]) => void;
}) {
  const [mode, setMode] = useState<"idle" | "expense" | "income">("idle");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  async function save() {
    const parsedAmount = Number(amount.replace(",", "."));
    if (!parsedAmount || parsedAmount < 0) return;
    const nextLog = {
      id: uid("finance"),
      type: mode === "income" ? "income" : "expense",
      amount: parsedAmount,
      category: category || (mode === "income" ? "Recebimento" : "Gasto"),
      description,
    } satisfies FinanceLog;
    update([
      ...logs,
      nextLog,
    ]);
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: nextLog.description || nextLog.category,
        amount_cents: Math.round(nextLog.amount * 100),
        transaction_type: nextLog.type,
        category_name: nextLog.category,
        transaction_date: date,
        status: "paid",
        source: "daily",
        daily_entry_id: dailyId,
        description: nextLog.description,
      }),
    }).catch(() => undefined);
    setAmount("");
    setCategory("");
    setDescription("");
    setMode("idle");
  }

  return (
    <SoftCard>
      <CardHeader>
        <SectionTitle icon={PiggyBank} label="Financeiro rápido" title="Dinheiro de hoje" />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm font-medium">Você gastou algo hoje?</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full bg-white" onClick={() => setMode("idle")}>Não</Button>
          <Button variant="outline" className="rounded-full bg-white" onClick={() => setMode("expense")}>Sim, registrar gasto</Button>
          <Button variant="outline" className="rounded-full bg-white" onClick={() => setMode("income")}>Recebi dinheiro</Button>
        </div>
        {mode !== "idle" ? (
          <div className="grid gap-2 rounded-2xl border border-zinc-200 bg-white p-3 sm:grid-cols-3">
            <Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Valor" className="rounded-xl" />
            <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder={mode === "income" ? "Origem" : "Categoria"} className="rounded-xl" />
            <div className="flex gap-2">
              <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descrição" className="rounded-xl" />
              <Button size="icon" className="rounded-full" onClick={save} aria-label="Salvar registro financeiro">
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
        {logs.length > 0 ? (
          <div className="space-y-2">
            {logs.slice(-3).map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 text-sm">
                <span>{log.category}</span>
                <span className={log.type === "income" ? "text-success" : "text-zinc-700"}>
                  {log.type === "income" ? "+" : "-"} R$ {log.amount.toFixed(2).replace(".", ",")}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">Pequenos registros evitam grandes sustos.</p>
      </CardContent>
    </SoftCard>
  );
}

function PauseSection({
  actions,
  worry,
  update,
}: {
  actions: string[];
  worry: string;
  update: (patch: Partial<DailyEntry>) => void;
}) {
  const pauseActions = ["Respirar por 1 minuto", "Alongar", "Beber água", "Sair da tela", "Escrever o que está me preocupando"];

  function toggle(action: string) {
    update({ pause_actions: actions.includes(action) ? actions.filter((item) => item !== action) : [...actions, action] });
  }

  return (
    <SoftCard>
      <CardHeader>
        <SectionTitle icon={Wind} label="Pausa" title="Pausa antes de continuar" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {pauseActions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => toggle(action)}
              className={cn("rounded-full border px-3 py-2 text-sm font-medium transition", actions.includes(action) ? "border-primary bg-primary text-white" : "border-zinc-200 bg-white text-zinc-700")}
            >
              {action}
            </button>
          ))}
        </div>
        {actions.includes("Escrever o que está me preocupando") ? (
          <Textarea value={worry} onChange={(event) => update({ worry_note: event.target.value })} placeholder="Pode despejar aqui. Não precisa fazer sentido." className="min-h-24 rounded-2xl bg-white" />
        ) : null}
      </CardContent>
    </SoftCard>
  );
}

function NightSection({
  daily,
  update,
}: {
  daily: DailyEntry;
  update: (patch: Partial<DailyEntry>) => void;
}) {
  function patchCheck(id: string, patchValue: Partial<DailyHabit>) {
    update({ night_checks: daily.night_checks.map((item) => (item.id === id ? { ...item, ...patchValue } : item)) });
  }

  function patchReflection(key: keyof DailyEntry["reflections"], value: string) {
    update({ reflections: { ...daily.reflections, [key]: value } });
  }

  const hasReflection = Object.values(daily.reflections).some((value) => value.trim().length > 0) || daily.day_score !== null;

  return (
    <SoftCard className="bg-[linear-gradient(135deg,#fff_0%,#fbf7ff_100%)]">
      <CardHeader>
        <SectionTitle
          icon={Moon}
          label="Ritual noturno"
          title="Fechando o dia"
          subtitle="Um encerramento gentil para não levar o dia inteiro para a cama."
        />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-2 md:grid-cols-2">
          {daily.night_checks.map((item) => (
            <label key={item.id} className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 text-sm">
              <Checkbox checked={item.done} onCheckedChange={(checked) => patchCheck(item.id, { done: Boolean(checked) })} />
              <span className={cn(item.done && "line-through text-muted-foreground")}>{item.title}</span>
            </label>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ["victory", "Uma vitória de hoje foi..."],
            ["gratitude", "Hoje eu sou grata por..."],
            ["learning", "O que eu aprendi ou percebi hoje?"],
            ["release", "O que eu quero deixar para trás antes de dormir?"],
          ].map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Textarea value={daily.reflections[key as keyof DailyEntry["reflections"]]} onChange={(event) => patchReflection(key as keyof DailyEntry["reflections"], event.target.value)} className="min-h-24 rounded-2xl bg-white" />
            </div>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_260px]">
          <div className="space-y-2">
            <Label>Minha prioridade de amanhã será...</Label>
            <Input value={daily.reflections.tomorrowPriority} onChange={(event) => patchReflection("tomorrowPriority", event.target.value)} className="rounded-2xl bg-white" />
          </div>
          <div className="space-y-2">
            <Label>Nota do meu dia</Label>
            <div className="flex gap-1 rounded-2xl border border-zinc-200 bg-white p-2">
              {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
                <button key={score} type="button" onClick={() => update({ day_score: score })} className={cn("grid h-7 flex-1 place-items-center rounded-full text-xs font-semibold transition", daily.day_score === score ? "bg-primary text-white" : "text-muted-foreground hover:bg-primary/10")}>
                  {score}
                </button>
              ))}
            </div>
          </div>
        </div>
        {hasReflection ? (
          <div className="rounded-2xl border border-primary/10 bg-white/80 p-4 text-sm font-medium text-zinc-700">
            Você fez o que podia com a versão de você que existia hoje. Amanhã continua.
          </div>
        ) : null}
      </CardContent>
    </SoftCard>
  );
}

function ReorganizeDialog({
  open,
  onOpenChange,
  selected,
  setSelected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: string;
  setSelected: (value: string) => void;
}) {
  const suggestions = selected ? reorganizeOptions[selected as keyof typeof reorganizeOptions] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[1.25rem] bg-white sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Reorganizar meu dia</DialogTitle>
          <DialogDescription>Escolha o que mais parece com agora. A sugestão aparece sem cobrança.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            {Object.keys(reorganizeOptions).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSelected(option)}
                className={cn("rounded-2xl border p-3 text-left text-sm font-medium transition", selected === option ? "border-primary bg-primary/10 text-primary" : "border-zinc-200 bg-white text-zinc-700 hover:border-primary/30")}
              >
                {option}
              </button>
            ))}
          </div>
          {suggestions.length > 0 ? (
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
              <p className="text-sm font-semibold">Sugestões para agora</p>
              <ul className="mt-3 space-y-2 text-sm text-zinc-700">
                {suggestions.map((suggestion) => (
                  <li key={suggestion} className="flex gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WeekDialog({ daily, open, onOpenChange }: { daily: DailyEntry; open: boolean; onOpenChange: (open: boolean) => void }) {
  const summary = daily.weekly_summary;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[1.25rem] bg-white sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Minha semana</DialogTitle>
          <DialogDescription>Um olhar leve para consistência, humor e prioridades.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Dias concluídos</p>
            <p className="mt-2 text-2xl font-semibold">{summary.closedDays}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Humor mais comum</p>
            <p className="mt-2 text-lg font-semibold">{summary.averageMood}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Prioridades concluídas</p>
            <p className="mt-2 text-2xl font-semibold">{summary.completedPriorities}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Hábitos consistentes</p>
            <p className="mt-2 text-sm font-medium">{summary.consistentHabits.length ? summary.consistentHabits.join(", ") : "Ainda sem padrão"}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
          <p className="text-sm font-semibold">Dias em que você se sentiu melhor</p>
          <p className="mt-2 text-sm text-muted-foreground">{summary.bestMoodDays.length ? summary.bestMoodDays.join(", ") : "Sem registros suficientes por enquanto."}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DailyPageClient() {
  const date = todayISO();
  const [daily, setDaily] = useState<DailyEntry>(() => createDefaultDaily(date));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reorganizeOpen, setReorganizeOpen] = useState(false);
  const [weekOpen, setWeekOpen] = useState(false);
  const [reorganizeChoice, setReorganizeChoice] = useState("");
  const loadedRef = useRef(false);

  const update = useCallback((patch: Partial<DailyEntry>) => {
    setDaily((current) => ({ ...current, ...patch }));
  }, []);

  const progress = useMemo(() => {
    const priorityItems = daily.priorities.slice(0, 3).filter((item) => cleanTitle(item.title));
    const habitItems = daily.habits_state.filter((item) => item.visible);
    const extraItems = daily.extra_tasks.filter((item) => cleanTitle(item.title));
    const nightItems = daily.night_checks.filter((item) => item.visible);
    const total = priorityItems.length + habitItems.length + extraItems.length + nightItems.length;
    const completed =
      priorityItems.filter((item) => item.done).length +
      habitItems.filter((item) => item.done).length +
      extraItems.filter((item) => item.done).length +
      nightItems.filter((item) => item.done).length;
    return { completed, total: Math.max(total, 1), value: Math.round((completed / Math.max(total, 1)) * 100) };
  }, [daily]);

  useEffect(() => {
    let cancelled = false;
    async function loadDaily() {
      try {
        setLoading(true);
        const response = await fetch(`/api/daily?date=${date}`);
        if (!response.ok) return;
        const data = (await response.json()) as DailyEntry;
        if (!cancelled) {
          setDaily(data);
          loadedRef.current = true;
        }
      } catch {
        // Keep the default local Daily visible when the API is unavailable.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDaily();
    return () => {
      cancelled = true;
    };
  }, [date]);

  useEffect(() => {
    if (!loadedRef.current || loading) return;
    const timeout = window.setTimeout(async () => {
      try {
        setSaving(true);
        const response = await fetch("/api/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(daily),
        });
        if (!response.ok) throw new Error("Não foi possível salvar agora.");
      } catch {
        // Saving failures should not interrupt the planning flow.
      } finally {
        setSaving(false);
      }
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [daily, loading]);

  function closeDay() {
    update({ day_closed_at: Math.floor(Date.now() / 1000) });
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
  }

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Carregando sua Daily...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24">
      <DailyHeader
        date={daily.date}
        completed={progress.completed}
        total={progress.total}
        progress={progress.value}
        saving={saving}
        onReorganize={() => setReorganizeOpen(true)}
        onWeek={() => setWeekOpen(true)}
      />

      <MorningCheckIn daily={daily} update={update} />

      <div className="grid gap-6 xl:grid-cols-2">
        <PrioritiesSection
          priorities={daily.priorities}
          extras={daily.extra_tasks}
          updatePriorities={(value) => update({ priorities: value })}
          updateExtras={(value) => update({ extra_tasks: value })}
        />
        <RhythmSection
          blocks={daily.rhythm_blocks}
          events={daily.important_events}
          update={(value) => update({ rhythm_blocks: value })}
        />
      </div>

      <HabitsSection
        habits={daily.habits_state}
        water={daily.water_count}
        movement={daily.movement_note}
        updateHabits={(value) => update({ habits_state: value })}
        update={update}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <ExtraTasksSection
          tasks={daily.extra_tasks}
          priorities={daily.priorities}
          updateTasks={(value) => update({ extra_tasks: value })}
          updatePriorities={(value) => update({ priorities: value })}
        />
        <div className="space-y-6">
          <FinanceSection logs={daily.finance_logs} dailyId={daily.id} date={daily.date} update={(value) => update({ finance_logs: value })} />
          <PauseSection actions={daily.pause_actions} worry={daily.worry_note} update={update} />
        </div>
      </div>

      {daily.extra_tasks.some((task) => !task.done && cleanTitle(task.title)) ? (
        <div className="rounded-[1.25rem] border border-warning/30 bg-warning/10 p-4 text-sm text-zinc-700">
          Quer levar alguma pendência para amanhã? Use o botão de calendário em Tarefas extras para adiar sem peso.
        </div>
      ) : null}

      <NightSection daily={daily} update={update} />

      <div className="flex justify-center">
        <Button size="xl" className="rounded-full px-10" onClick={closeDay}>
          <Star className="h-4 w-4" />
          Encerrar meu dia
        </Button>
      </div>

      {daily.day_closed_at ? (
        <div className="rounded-[1.25rem] border border-success/20 bg-success/10 p-4 text-center text-sm font-medium text-zinc-700">
          Seu dia foi encerrado e o resumo ficou salvo no histórico semanal.
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-3 py-2 shadow-[0_-10px_30px_rgba(82,66,96,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
          <Button variant="ghost" className="h-12 flex-col gap-1 rounded-2xl text-[0.68rem]" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <SunMedium className="h-4 w-4" />
            Hoje
          </Button>
          <Button variant="ghost" className="h-12 flex-col gap-1 rounded-2xl text-[0.68rem]" onClick={() => update({ extra_tasks: [...daily.extra_tasks, { id: uid("extra"), title: "", category: "Pessoal", dueDate: "", done: false }] })}>
            <Plus className="h-4 w-4" />
            Tarefa
          </Button>
          <Button variant="ghost" className="h-12 flex-col gap-1 rounded-2xl text-[0.68rem]" onClick={() => update({ pause_actions: [...new Set([...daily.pause_actions, "Respirar por 1 minuto"])] })}>
            <Coffee className="h-4 w-4" />
            Pausa
          </Button>
          <Button variant="ghost" className="h-12 flex-col gap-1 rounded-2xl text-[0.68rem]" onClick={closeDay}>
            <Moon className="h-4 w-4" />
            Encerrar
          </Button>
        </div>
      </div>

      <ReorganizeDialog
        open={reorganizeOpen}
        onOpenChange={setReorganizeOpen}
        selected={reorganizeChoice}
        setSelected={(value) => {
          setReorganizeChoice(value);
          update({ day_mode: value });
        }}
      />
      <WeekDialog daily={daily} open={weekOpen} onOpenChange={setWeekOpen} />
    </div>
  );
}
