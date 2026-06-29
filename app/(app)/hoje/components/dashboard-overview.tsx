"use client";

import { useEffect, useState } from "react";
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

type DashboardData = {
  tasks: {
    doneCount: number;
    openCount: number;
    priorityTasks: Array<{
      id: string;
      title: string;
      priority: "low" | "medium" | "high";
    }>;
  };
  finances: {
    income: number;
    expenses: number;
    balance: number;
  };
  wellbeing: {
    label: string;
  } | null;
  habits: {
    completed: number;
    total: number;
    percent: number;
    bestStreak: number;
  };
  creator: {
    value: number;
    inProduction: number;
    activePublis: number;
  };
};

const emptyDashboardData: DashboardData = {
  tasks: {
    doneCount: 0,
    openCount: 0,
    priorityTasks: [],
  },
  finances: {
    income: 0,
    expenses: 0,
    balance: 0,
  },
  wellbeing: null,
  habits: {
    completed: 0,
    total: 0,
    percent: 0,
    bestStreak: 0,
  },
  creator: {
    value: 0,
    inProduction: 0,
    activePublis: 0,
  },
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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
  const [data, setData] = useState<DashboardData>(emptyDashboardData);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setMessage("");
      const timeout = window.setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch("/api/dashboard", {
          signal: controller.signal,
        });

        if (!active) return;

        if (response.ok) {
          setData((await response.json()) as DashboardData);
          return;
        }

        setData(emptyDashboardData);
        setMessage(
          response.status === 401
            ? "Entre na sua conta para carregar seus dados salvos."
            : "Nao foi possivel atualizar o panorama agora.",
        );
      } catch {
        if (active) {
          setData(emptyDashboardData);
          setMessage("Nao foi possivel atualizar o panorama agora.");
        }
      } finally {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const priorityTasks = data?.tasks.priorityTasks ?? [];

  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-9">
      {(loading || message) && (
        <div className="flex min-h-12 items-center gap-3 rounded-[18px] border border-rose-100 bg-white/74 px-4 py-3 text-sm text-muted-foreground shadow-sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-rose-800" /> : <Inbox className="h-4 w-4 text-rose-800" />}
          <span>{loading ? "Atualizando panorama..." : message}</span>
          {message.includes("Entre") && (
            <Button className="ml-auto rounded-full" size="sm" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
          )}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Saldo do mês"
          value={money.format(data.finances.balance)}
          description={data.finances.balance >= 0 ? "Mês financeiramente equilibrado." : "Ajuste as saídas para fechar melhor."}
          icon={Banknote}
          tone="sage"
        />
        <StatCard
          label="Foco da semana"
          value={`${data.tasks.doneCount} entregas`}
          description={`${data.tasks.openCount} prioridades abertas`}
          icon={Sparkles}
        />
        <StatCard
          label="Bem-estar"
          value={data.wellbeing ? data.wellbeing.label : "Sem check-in"}
          description={data.wellbeing ? "Seu estado do dia já foi registrado." : "Seu check-in de hoje ainda não foi feito."}
          icon={HeartPulse}
        />
        <StatCard
          label="Creator"
          value={money.format(data.creator.value)}
          description={`${data.creator.inProduction} em producao - ${data.creator.activePublis} publis ativas`}
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
                  Você ainda não criou prioridades para hoje.
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
          <PanelHeader eyebrow="Resumo do mês" title="Financeiro" icon={Inbox} tone="sage" />
          <div className="mt-5 space-y-3">
            <MetricRow label="Saldo" helper="resultado atual" value={money.format(data.finances.balance)} />
            <MetricRow label="Renda" helper="entradas registradas" value={money.format(data.finances.income)} />
            <MetricRow label="Saidas" helper="fixas + variaveis" value={money.format(data.finances.expenses)} />
            <MetricRow label="Pendências" helper="contas aguardando" value="0" />
          </div>
        </div>

        <div className="min-h-[394px] rounded-[24px] border border-rose-100 bg-white/78 p-5 shadow-[0_20px_55px_rgba(48,32,42,0.08)]">
          <PanelHeader eyebrow="Ritmo e energia" title="Estado do dia" icon={HeartPulse} />
          <div className="mt-5 rounded-[24px] border border-rose-100/80 bg-white/48 p-5">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-rose-800 shadow-sm">
              <HeartPulse className="h-5 w-5" />
            </span>
            <p className="mt-5 text-sm font-semibold text-foreground">
              {data.wellbeing
                ? `Hoje você está: ${data.wellbeing.label.toLowerCase()}.`
                : "Seu check-in ainda não foi registrado."}
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Hábitos</p>
                <p className="text-sm font-semibold text-rose-900">{data.habits.percent}%</p>
              </div>
            </div>
            <div className="flex min-h-[62px] items-center gap-3 rounded-[18px] border border-rose-100 bg-rose-50/35 px-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm">
                <Sprout className="h-4 w-4 text-rose-800" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Streak</p>
                <p className="text-sm font-semibold text-rose-900">{data.habits.bestStreak} dias</p>
              </div>
            </div>
          </div>
          {data.habits.total > 0 && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              {data.habits.completed} de {data.habits.total} hábitos concluídos hoje
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


