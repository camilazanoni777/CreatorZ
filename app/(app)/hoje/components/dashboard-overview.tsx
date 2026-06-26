"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ElementType } from "react";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clapperboard,
  HeartPulse,
  Inbox,
  ListChecks,
  Loader2,
  Sparkles,
  Sprout,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CheckIn, Habit, HabitLog, MoodLevel, Task, Transaction } from "@/types";

type HabitWithStatus = Habit & { completed: boolean; streak: number };

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const moodLabels: Record<MoodLevel, string> = {
  1: "Precisa de cuidado",
  2: "Mais sensivel",
  3: "Estavel",
  4: "Leve",
  5: "Muito bem",
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthKey() {
  return todayKey().slice(0, 7);
}

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "rose",
}: {
  label: string;
  value: string;
  description: string;
  icon: ElementType;
  tone?: "sage" | "rose";
}) {
  return (
    <div
      className={cn(
        "min-h-[118px] rounded-[24px] border bg-white/78 p-5 shadow-[0_18px_45px_rgba(48,32,42,0.08)] backdrop-blur",
        tone === "sage" ? "border-emerald-100 shadow-emerald-900/5" : "border-rose-100",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-normal text-foreground">
            {value}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-full",
            tone === "sage" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function PanelHeader({
  eyebrow,
  title,
  icon: Icon,
  tone = "rose",
}: {
  eyebrow: string;
  title: string;
  icon: ElementType;
  tone?: "sage" | "rose";
}) {
  return (
    <div className="flex items-start gap-4">
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-full",
          tone === "sage" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-sm font-semibold tracking-normal text-foreground">
          {title}
        </h2>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  helper,
  value,
}: {
  label: string;
  helper: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[60px] items-center justify-between gap-4 rounded-[18px] border border-rose-100/80 bg-white/60 px-4 py-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </div>
      <p className="shrink-0 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function DashboardOverview() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => todayKey(), []);
  const month = useMemo(() => currentMonthKey(), []);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const [taskRes, transactionRes, checkInRes, habitRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch(`/api/transactions?month=${month}`),
        fetch(`/api/check-ins?month=${month}`),
        fetch(`/api/habits?month=${month}`),
      ]);

      if (!active) return;

      const nextTasks = taskRes.ok ? ((await taskRes.json()) as Task[]) : [];
      const nextTransactions = transactionRes.ok ? ((await transactionRes.json()) as Transaction[]) : [];
      const nextCheckIns = checkInRes.ok ? ((await checkInRes.json()) as CheckIn[]) : [];
      const habitData = habitRes.ok
        ? ((await habitRes.json()) as { habits: Habit[]; logs: HabitLog[] })
        : { habits: [], logs: [] };

      const nextHabits = habitData.habits.map((habit) => {
        const logDates = new Set(
          habitData.logs
            .filter((log) => log.habit_id === habit.id && log.completed !== false)
            .map((log) => log.date),
        );

        let streak = 0;
        for (let i = 0; i < 90; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          if (logDates.has(date.toISOString().slice(0, 10))) streak += 1;
          else if (i > 0) break;
        }

        return { ...habit, completed: logDates.has(today), streak };
      });

      setTasks(Array.isArray(nextTasks) ? nextTasks : []);
      setTransactions(Array.isArray(nextTransactions) ? nextTransactions : []);
      setCheckIns(Array.isArray(nextCheckIns) ? nextCheckIns : []);
      setHabits(nextHabits);
      setLoading(false);
    }

    load().catch(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [month, today]);

  const openTasks = tasks.filter((task) => task.status !== "done");
  const doneTasks = tasks.filter((task) => task.status === "done");
  const priorityTasks = [...openTasks]
    .sort((a, b) => {
      const weight = { high: 0, medium: 1, low: 2 };
      return weight[a.priority] - weight[b.priority];
    })
    .slice(0, 3);

  const todayCheckIn = checkIns.find((entry) => entry.date === today);
  const income = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const expenses = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = income - expenses;
  const completedHabits = habits.filter((habit) => habit.completed).length;
  const bestStreak = habits.reduce((max, habit) => Math.max(max, habit.streak), 0);
  const habitPercent = habits.length > 0 ? Math.round((completedHabits / habits.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando panorama
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-9">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Saldo do mes"
          value={money.format(balance)}
          description={balance >= 0 ? "Mes financeiramente equilibrado." : "Ajuste as saidas para fechar melhor."}
          icon={Banknote}
          tone="sage"
        />
        <StatCard
          label="Foco da semana"
          value={`${doneTasks.length} entregas`}
          description={`${openTasks.length} prioridades abertas`}
          icon={Sparkles}
        />
        <StatCard
          label="Bem-estar"
          value={todayCheckIn ? moodLabels[todayCheckIn.mood] : "Sem check-in"}
          description={todayCheckIn ? "Seu estado do dia ja foi registrado." : "Seu check-in de hoje ainda nao foi feito."}
          icon={HeartPulse}
        />
        <StatCard
          label="Creator"
          value={money.format(0)}
          description="0 em producao - 0 publis ativas"
          icon={Clapperboard}
        />
      </section>

      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-muted-foreground">
          Leitura rapida
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-normal text-foreground">
          Panorama essencial
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          A home agora concentra so o que precisa aparecer primeiro: prioridade, caixa e estado do seu dia.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_0.98fr]">
        <div className="min-h-[394px] rounded-[24px] border border-rose-100 bg-white/74 p-5 shadow-[0_20px_55px_rgba(48,32,42,0.08)]">
          <PanelHeader eyebrow="Hoje e proximos passos" title="Prioridades" icon={Sparkles} />
          <div className="mt-5 rounded-[24px] border border-rose-100/80 bg-white/48 p-5">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-rose-100 text-rose-800">
              <Sparkles className="h-5 w-5" />
            </span>
            {priorityTasks.length > 0 ? (
              <div className="mt-5 space-y-2">
                {priorityTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 rounded-[16px] bg-white/70 px-3 py-3">
                    <ListChecks className="h-4 w-4 shrink-0 text-rose-800" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Prioridade {task.priority === "high" ? "alta" : task.priority === "medium" ? "media" : "baixa"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5">
                <p className="text-sm font-semibold text-foreground">
                  Voce ainda nao criou prioridades para hoje.
                </p>
                <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                  Comece pelo proximo passo mais importante e o restante do painel se organiza ao redor dele.
                </p>
              </div>
            )}
            <Button className="mt-5 rounded-full bg-white text-foreground shadow-sm hover:bg-rose-50" size="sm" asChild>
              <Link href="/tarefas">
                Criar tarefa
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="min-h-[394px] rounded-[24px] border border-emerald-100 bg-emerald-50/45 p-5 shadow-[0_20px_55px_rgba(29,78,64,0.07)]">
          <PanelHeader eyebrow="Resumo do mes" title="Financeiro" icon={Inbox} tone="sage" />
          <div className="mt-5 space-y-3">
            <MetricRow label="Saldo" helper="resultado atual" value={money.format(balance)} />
            <MetricRow label="Renda" helper="entradas registradas" value={money.format(income)} />
            <MetricRow label="Saidas" helper="fixas + variaveis" value={money.format(expenses)} />
            <MetricRow label="Pendencias" helper="contas aguardando" value="0" />
          </div>
        </div>

        <div className="min-h-[394px] rounded-[24px] border border-rose-100 bg-white/78 p-5 shadow-[0_20px_55px_rgba(48,32,42,0.08)]">
          <PanelHeader eyebrow="Ritmo e energia" title="Estado do dia" icon={HeartPulse} />
          <div className="mt-5 rounded-[24px] border border-rose-100/80 bg-white/48 p-5">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-rose-800 shadow-sm">
              <HeartPulse className="h-5 w-5" />
            </span>
            <p className="mt-5 text-sm font-semibold text-foreground">
              {todayCheckIn
                ? `Hoje voce esta: ${moodLabels[todayCheckIn.mood].toLowerCase()}.`
                : "Seu check-in ainda nao foi registrado."}
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Esse espaco foi mantido mais leve, mas continua acolhedor e util quando estiver vazio.
            </p>
            <Button className="mt-5 rounded-full bg-white text-foreground shadow-sm hover:bg-rose-50" size="sm" asChild>
              <Link href="/check-in">
                Fazer check-in
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex min-h-[62px] items-center gap-3 rounded-[18px] border border-rose-100 bg-rose-50/45 px-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm">
                <Waves className="h-4 w-4 text-foreground" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Habitos</p>
                <p className="text-sm font-semibold text-rose-900">{habitPercent}%</p>
              </div>
            </div>
            <div className="flex min-h-[62px] items-center gap-3 rounded-[18px] border border-rose-100 bg-rose-50/35 px-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm">
                <Sprout className="h-4 w-4 text-rose-800" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Streak</p>
                <p className="text-sm font-semibold text-rose-900">{bestStreak} dias</p>
              </div>
            </div>
          </div>
          {habits.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              {completedHabits} de {habits.length} habitos concluidos hoje
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
