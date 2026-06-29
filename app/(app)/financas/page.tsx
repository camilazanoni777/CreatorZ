"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpCircle,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  CreditCard,
  Filter,
  Loader2,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { centsToBRL, parseBRLToCents } from "@/lib/money";
import { cn } from "@/lib/utils";

const chartLoader = (
  <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
    Carregando gráfico...
  </div>
);

const FinanceFlowChart = dynamic(
  () => import("./components/finance-charts").then((mod) => mod.FinanceFlowChart),
  { ssr: false, loading: () => chartLoader },
);

const FinanceEvolutionChart = dynamic(
  () => import("./components/finance-charts").then((mod) => mod.FinanceEvolutionChart),
  { ssr: false, loading: () => chartLoader },
);

const FinanceCategoriesChart = dynamic(
  () => import("./components/finance-charts").then((mod) => mod.FinanceCategoriesChart),
  { ssr: false, loading: () => chartLoader },
);

const BudgetBarsChart = dynamic(
  () => import("./components/finance-charts").then((mod) => mod.BudgetBarsChart),
  { ssr: false, loading: () => chartLoader },
);

type FinanceType = "income" | "expense" | "transfer";
type FinanceStatus = "paid" | "pending" | "overdue" | "cancelled";
type PeriodMode = "month" | "last30" | "year" | "custom";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
  monthly_limit_cents: number | null;
};

type Transaction = {
  id: string;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  title: string;
  description: string | null;
  transaction_type: FinanceType;
  amount_cents: number;
  transaction_date: string;
  due_date: string | null;
  paid_at: number | null;
  status: FinanceStatus;
  source: "manual" | "daily" | "recurring" | "imported";
  recurrence_id: string | null;
  payment_method: string | null;
  account_name: string | null;
};

type Breakdown = {
  category_id: string;
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
  monthly_limit_cents: number | null;
  total_cents: number;
  count: number;
};

type FinanceBundle = {
  period: { mode: PeriodMode; start: string; end: string; month: string };
  overview: {
    income: number;
    expenses: number;
    balance: number;
    countIncome: number;
    countExpense: number;
    previousBalance: number;
    balanceDelta: number;
    previousExpense: number;
    expenseDeltaPercent: number | null;
    upcomingAmount: number;
    upcomingCount: number;
  };
  transactions: Transaction[];
  upcoming: Transaction[];
  breakdown: Breakdown[];
  evolution: Array<{ month: string; label: string; income: number; expenses: number; balance: number }>;
  budget: {
    expectedIncomeCents: number;
    fixedExpensesCents: number;
    reserveGoalCents: number;
    freeCents: number;
    categories: Array<{ categoryId: string; name: string; color: string; usedCents: number; limitCents: number; percent: number }>;
  };
  categories: Category[];
  insights: string[];
};

type TransactionForm = {
  title: string;
  amount: string;
  transaction_type: FinanceType;
  category_id: string;
  transaction_date: string;
  due_date: string;
  status: FinanceStatus;
  description: string;
  payment_method: string;
  account_name: string;
  recurring: boolean;
  frequency: "weekly" | "monthly" | "annual";
  due_day: string;
  end_date: string;
  repeat_count: string;
  linkDaily: boolean;
};

const emptyForm = (): TransactionForm => ({
  title: "",
  amount: "",
  transaction_type: "expense",
  category_id: "",
  transaction_date: new Date().toISOString().slice(0, 10),
  due_date: "",
  status: "paid",
  description: "",
  payment_method: "",
  account_name: "",
  recurring: false,
  frequency: "monthly",
  due_day: String(new Date().getDate()),
  end_date: "",
  repeat_count: "",
  linkDaily: false,
});

const defaultCategories: Category[] = [
  { id: "income-general", name: "Receitas", type: "income", icon: "wallet", color: "#22c55e", monthly_limit_cents: null },
  { id: "expense-food", name: "Alimentação", type: "expense", icon: "receipt", color: "#f97316", monthly_limit_cents: null },
  { id: "expense-home", name: "Casa", type: "expense", icon: "wallet", color: "#8b5cf6", monthly_limit_cents: null },
  { id: "expense-health", name: "Saúde", type: "expense", icon: "sparkles", color: "#10b981", monthly_limit_cents: null },
  { id: "expense-work", name: "Trabalho", type: "expense", icon: "credit-card", color: "#3b82f6", monthly_limit_cents: null },
  { id: "expense-leisure", name: "Lazer", type: "expense", icon: "sparkles", color: "#ec4899", monthly_limit_cents: null },
];

function emptyFinanceBundle(month: string, mode: PeriodMode): FinanceBundle {
  const [year, value] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = new Date(year, value, 0).toISOString().slice(0, 10);

  return {
    period: { mode, start, end, month },
    overview: {
      income: 0,
      expenses: 0,
      balance: 0,
      countIncome: 0,
      countExpense: 0,
      previousBalance: 0,
      balanceDelta: 0,
      previousExpense: 0,
      expenseDeltaPercent: null,
      upcomingAmount: 0,
      upcomingCount: 0,
    },
    transactions: [],
    upcoming: [],
    breakdown: [],
    evolution: Array.from({ length: 6 }, (_, index) => {
      const date = new Date(year, value - 6 + index, 1);
      const key = date.toISOString().slice(0, 7);
      return {
        month: key,
        label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date),
        income: 0,
        expenses: 0,
        balance: 0,
      };
    }),
    budget: {
      expectedIncomeCents: 0,
      fixedExpensesCents: 0,
      reserveGoalCents: 0,
      freeCents: 0,
      categories: defaultCategories
        .filter((category) => category.type === "expense")
        .map((category) => ({
          categoryId: category.id,
          name: category.name,
          color: category.color,
          usedCents: 0,
          limitCents: category.monthly_limit_cents ?? 0,
          percent: 0,
        })),
    },
    categories: defaultCategories,
    insights: [],
  };
}

const statusLabel: Record<FinanceStatus, string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Atrasado",
  cancelled: "Cancelado",
};

const typeLabel: Record<FinanceType, string> = {
  income: "Receita",
  expense: "Despesa",
  transfer: "Transferência",
};

function monthLabel(month: string) {
  const [year, value] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, value - 1, 1));
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${date}T12:00:00`));
}

function groupedByDate(items: Transaction[]) {
  return items.reduce<Record<string, Transaction[]>>((acc, item) => {
    const key = item.transaction_date;
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {});
}

function buildFlow(transactions: Transaction[], mode: "daily" | "weekly" | "balance") {
  const ordered = [...transactions].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
  const map = new Map<string, { label: string; income: number; expenses: number; balance: number }>();
  for (const tx of ordered) {
    const date = new Date(`${tx.transaction_date}T12:00:00`);
    const key = mode === "weekly" ? `Semana ${Math.ceil(date.getDate() / 7)}` : tx.transaction_date;
    const label = mode === "weekly" ? key : String(date.getDate()).padStart(2, "0");
    const current = map.get(key) ?? { label, income: 0, expenses: 0, balance: 0 };
    if (tx.transaction_type === "income") current.income += tx.amount_cents;
    if (tx.transaction_type === "expense") current.expenses += tx.amount_cents;
    map.set(key, current);
  }
  let balance = 0;
  return [...map.values()].map((item) => {
    balance += item.income - item.expenses;
    return { ...item, balance };
  });
}

function SoftCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Card className={cn("rounded-[1.25rem] border-zinc-200/80 bg-white/90 shadow-[0_18px_50px_rgba(82,66,96,0.08)]", className)}>
      {children}
    </Card>
  );
}

function SelectField<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  label: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-10 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = "neutral",
}: {
  title: string;
  value: string;
  helper: string;
  icon: typeof Wallet;
  tone?: "neutral" | "good" | "bad" | "lavender";
}) {
  const toneClass = {
    neutral: "bg-zinc-100 text-zinc-700",
    good: "bg-success/10 text-success",
    bad: "bg-destructive/10 text-destructive",
    lavender: "bg-primary/10 text-primary",
  }[tone];
  return (
    <SoftCard className="transition hover:-translate-y-0.5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
            <p className="mt-2 text-xl font-semibold tracking-normal">{value}</p>
          </div>
          <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", toneClass)}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{helper}</p>
      </CardContent>
    </SoftCard>
  );
}

function TransactionModal({
  open,
  onOpenChange,
  categories,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onSave: (form: TransactionForm) => Promise<void>;
}) {
  const [form, setForm] = useState<TransactionForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const availableCategories = useMemo(
    () => categories.filter((item) => item.type === (form.transaction_type === "income" ? "income" : "expense")),
    [categories, form.transaction_type],
  );
  const firstCategoryId = availableCategories[0]?.id ?? "";

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm((current) => {
      const categoryIsValid = availableCategories.some((category) => category.id === current.category_id);
      if (categoryIsValid || current.category_id === firstCategoryId) return current;
      return { ...current, category_id: firstCategoryId };
    });
  }, [open, firstCategoryId, availableCategories]);

  async function submit() {
    const cents = parseBRLToCents(form.amount);
    if (!form.title.trim()) return setError("Dê um nome para o lançamento.");
    if (cents <= 0) return setError("Informe um valor válido.");
    if (!form.category_id) return setError("Escolha uma categoria.");
    setSaving(true);
    try {
      await onSave(form);
      setForm(emptyForm());
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[1.25rem] bg-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo lançamento</DialogTitle>
          <DialogDescription>Registre sem transformar seu dia em uma planilha.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="grid gap-2 sm:grid-cols-3">
            {(["income", "expense", "transfer"] as FinanceType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm((current) => ({ ...current, transaction_type: type, category_id: "" }))}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                  form.transaction_type === type ? "border-primary bg-primary/10 text-primary" : "border-zinc-200 bg-white text-zinc-700",
                )}
              >
                {typeLabel[type]}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="R$ 0,00" className="rounded-2xl" />
              <div className="flex gap-2">
                {["10", "50", "100"].map((value) => (
                  <button key={value} type="button" className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary" onClick={() => setForm({ ...form, amount: value })}>
                    R$ {value}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <SelectField
                value={form.category_id}
                onChange={(value) => setForm({ ...form, category_id: value })}
                label="Categoria"
                options={availableCategories.map((category) => ({ value: category.id, label: category.name }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome do lançamento</Label>
              <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Mercado, salário, academia..." className="rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={form.transaction_date} onChange={(event) => setForm({ ...form, transaction_date: event.target.value })} className="rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} className="rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <SelectField
                value={form.status}
                onChange={(value) => setForm({ ...form, status: value })}
                label="Status"
                options={[
                  { value: "paid", label: "Pago" },
                  { value: "pending", label: "Pendente" },
                  { value: "overdue", label: "Atrasado" },
                  { value: "cancelled", label: "Cancelado" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label>Conta/cartão</Label>
              <Input value={form.account_name} onChange={(event) => setForm({ ...form, account_name: event.target.value })} placeholder="Nubank, carteira, cartão..." className="rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Input value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value })} placeholder="Pix, crédito, débito..." className="rounded-2xl" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Opcional" className="min-h-20 rounded-2xl" />
          </div>

          <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.linkDaily} onChange={(event) => setForm({ ...form, linkDaily: event.target.checked })} />
              Vincular à Daily atual
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.recurring} onChange={(event) => setForm({ ...form, recurring: event.target.checked })} />
              Criar como recorrente
            </label>
            {form.recurring ? (
              <>
                <SelectField
                  value={form.frequency}
                  onChange={(value) => setForm({ ...form, frequency: value })}
                  label="Frequência"
                  options={[
                    { value: "weekly", label: "Semanal" },
                    { value: "monthly", label: "Mensal" },
                    { value: "annual", label: "Anual" },
                  ]}
                />
                <Input value={form.due_day} onChange={(event) => setForm({ ...form, due_day: event.target.value })} placeholder="Dia de vencimento" className="rounded-2xl bg-white" />
                <Input type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} className="rounded-2xl bg-white" />
                <Input value={form.repeat_count} onChange={(event) => setForm({ ...form, repeat_count: event.target.value })} placeholder="Repetições opcionais" className="rounded-2xl bg-white" />
              </>
            ) : null}
          </div>

          {error ? <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
          <Button className="w-full rounded-full" size="lg" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? "Salvando..." : "Salvar lançamento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function FinancasPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [activeTab, setActiveTab] = useState("lancamentos");
  const [bundleState, setBundle] = useState<FinanceBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [chartMode, setChartMode] = useState<"daily" | "weekly" | "balance">("daily");
  const [filters, setFilters] = useState({ search: "", type: "all", status: "all", category_id: "all", sort: "recent" });
  const bundle = bundleState ?? emptyFinanceBundle(month, periodMode);

  const loadFinance = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ month, mode: periodMode, ...filters });
      const response = await fetch(`/api/transactions?${params.toString()}`);
      if (!response.ok) {
        setBundle(emptyFinanceBundle(month, periodMode));
        setError("");
        return;
      }
      setBundle(await response.json());
      setError("");
    } catch {
      setBundle(emptyFinanceBundle(month, periodMode));
      setError("");
    } finally {
      setLoading(false);
    }
  }, [filters, month, periodMode]);

  useEffect(() => {
    loadFinance();
  }, [loadFinance]);

  const flowData = useMemo(() => buildFlow(bundle?.transactions ?? [], chartMode === "weekly" ? "weekly" : chartMode === "balance" ? "balance" : "daily"), [bundle, chartMode]);
  const expenseBreakdown = useMemo(() => (bundle?.breakdown ?? []).filter((item) => item.type === "expense" && item.total_cents > 0), [bundle]);
  const groups = useMemo(() => groupedByDate(bundle?.transactions ?? []), [bundle]);
  const hasData = bundle.transactions.length > 0 || bundle.overview.income > 0 || bundle.overview.expenses > 0;

  function shiftMonth(delta: number) {
    const [year, value] = month.split("-").map(Number);
    const next = new Date(year, value - 1 + delta, 1);
    setMonth(next.toISOString().slice(0, 7));
  }

  async function saveTransaction(form: TransactionForm) {
    const category = bundle?.categories.find((item) => item.id === form.category_id);
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        amount_cents: parseBRLToCents(form.amount),
        transaction_type: form.transaction_type,
        category_id: form.category_id,
        category_name: category?.name,
        transaction_date: form.transaction_date,
        due_date: form.due_date || form.transaction_date,
        status: form.status,
        source: "manual",
        description: form.description,
        payment_method: form.payment_method,
        account_name: form.account_name,
        recurring: form.recurring,
        recurrence: form.recurring
          ? {
              frequency: form.frequency,
              due_day: Number(form.due_day) || null,
              start_date: form.transaction_date,
              end_date: form.end_date || null,
              repeat_count: form.repeat_count ? Number(form.repeat_count) : null,
            }
          : null,
      }),
    });
    if (!response.ok) {
      const amountCents = parseBRLToCents(form.amount);
      const localTransaction: Transaction = {
        id: `local-${Date.now()}`,
        category_id: form.category_id,
        category_name: category?.name ?? form.category_id,
        category_icon: category?.icon ?? null,
        category_color: category?.color ?? null,
        title: form.title,
        description: form.description || null,
        transaction_type: form.transaction_type,
        amount_cents: amountCents,
        transaction_date: form.transaction_date,
        due_date: form.due_date || form.transaction_date,
        paid_at: form.status === "paid" ? Math.floor(Date.now() / 1000) : null,
        status: form.status,
        source: form.linkDaily ? "daily" : "manual",
        recurrence_id: null,
        payment_method: form.payment_method || null,
        account_name: form.account_name || null,
      };

      setBundle((current) => {
        const base = current ?? emptyFinanceBundle(month, periodMode);
        const transactions = [localTransaction, ...base.transactions];
        const income = transactions.filter((item) => item.transaction_type === "income").reduce((sum, item) => sum + item.amount_cents, 0);
        const expenses = transactions.filter((item) => item.transaction_type === "expense").reduce((sum, item) => sum + item.amount_cents, 0);

        return {
          ...base,
          transactions,
          overview: {
            ...base.overview,
            income,
            expenses,
            balance: income - expenses,
            countIncome: transactions.filter((item) => item.transaction_type === "income").length,
            countExpense: transactions.filter((item) => item.transaction_type === "expense").length,
          },
        };
      });
      return;
    }
    await loadFinance();
  }

  async function action(id: string, actionName: "delete" | "duplicate" | "mark_paid" | "postpone") {
    if (actionName === "delete" && !window.confirm("Excluir este lançamento? Ele será arquivado para manter seu histórico.")) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await fetch(`/api/transactions?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName, new_date: tomorrow.toISOString().slice(0, 10) }),
    });
    await loadFinance();
  }

  if (loading && !bundleState) {
    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="h-36 animate-pulse rounded-[1.5rem] bg-white" />
        <div className="grid gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-[1.25rem] bg-white" />)}
        </div>
      </div>
    );
  }

  const balanceHelper = !hasData
    ? "Seu resumo aparece aqui quando você registrar suas movimentações."
    : bundle.overview.balance >= 0
      ? "Boa. Você está gastando menos do que entrou neste período."
      : "Este mês está mais apertado. Vamos olhar para o que ainda pode ser ajustado.";

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24">
      {error ? <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div> : null}

      <section className="rounded-[1.5rem] border border-primary/10 bg-[linear-gradient(135deg,#fff_0%,#fbf7ff_52%,#f7fff9_100%)] p-5 shadow-[0_24px_70px_rgba(82,66,96,0.10)] sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Central financeira</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">Finanças</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Seu dinheiro também merece clareza.</p>
            <p className="mt-2 text-lg font-medium capitalize">{monthLabel(month)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" className="rounded-full bg-white" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-[150px] rounded-full bg-white" />
            <Button variant="outline" size="icon" className="rounded-full bg-white" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="rounded-full bg-white" onClick={() => setMonth(new Date().toISOString().slice(0, 7))}>Hoje</Button>
            <Button variant="outline" className="rounded-full bg-white" onClick={() => setActiveTab("planejamento")}>Ver planejamento</Button>
            <Button className="rounded-full" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Novo lançamento
            </Button>
          </div>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {[
            ["month", "Este mês"],
            ["last30", "Últimos 30 dias"],
            ["year", "Este ano"],
            ["custom", "Período personalizado"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriodMode(value as PeriodMode)}
              className={cn("shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition", periodMode === value ? "border-primary bg-primary text-white" : "border-zinc-200 bg-white/80 text-muted-foreground")}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Saldo do mês" value={centsToBRL(bundle.overview.balance)} helper={balanceHelper} icon={Wallet} tone={bundle.overview.balance >= 0 ? "good" : "bad"} />
        <MetricCard title="Receitas" value={centsToBRL(bundle.overview.income)} helper={`${bundle.overview.countIncome} entradas neste período`} icon={ArrowUpCircle} tone="good" />
        <MetricCard title="Despesas" value={centsToBRL(bundle.overview.expenses)} helper={bundle.overview.expenseDeltaPercent === null ? "Sem comparação anterior ainda" : `${Math.abs(bundle.overview.expenseDeltaPercent)}% ${bundle.overview.expenseDeltaPercent >= 0 ? "maior" : "menor"} que no período anterior`} icon={ArrowDownCircle} tone="bad" />
        <MetricCard title="A pagar" value={centsToBRL(bundle.overview.upcomingAmount)} helper={`${bundle.overview.upcomingCount} contas previstas até o fim do período`} icon={Clock3} tone="lavender" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <SoftCard>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Como seu dinheiro se movimentou</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Receitas, despesas e saldo acumulado sem ruído.</p>
            </div>
            <SelectField
              value={chartMode}
              onChange={setChartMode}
              label="Tipo de gráfico"
              className="w-44"
              options={[
                { value: "daily", label: "Fluxo diário" },
                { value: "weekly", label: "Fluxo semanal" },
                { value: "balance", label: "Saldo acumulado" },
              ]}
            />
          </CardHeader>
          <CardContent>
            {flowData.length === 0 ? (
              <div className="grid min-h-[250px] place-items-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 text-center">
                <div className="max-w-sm px-6">
                  <Sparkles className="mx-auto h-8 w-8 text-primary" />
                  <p className="mt-3 font-medium">Quando você começar a registrar movimentações, seu mês ganha desenho.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[520px]">
                  <FinanceFlowChart data={flowData} mode={chartMode === "balance" ? "balance" : "flow"} />
                </div>
              </div>
            )}
          </CardContent>
        </SoftCard>
        <SoftCard>
          <CardHeader>
            <CardTitle className="text-lg">Resumo rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bundle.insights.length === 0 ? (
              <p className="text-sm text-muted-foreground">Seus insights aparecem quando houver dados suficientes.</p>
            ) : (
              bundle.insights.map((insight) => (
                <div key={insight} className="flex gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-3 text-sm text-zinc-700">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{insight}</span>
                </div>
              ))
            )}
          </CardContent>
        </SoftCard>
      </div>

      <SoftCard>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Próximos compromissos</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Contas futuras, recorrentes ou pendentes.</p>
          </div>
          <Button variant="outline" className="hidden rounded-full bg-white sm:inline-flex" onClick={() => setModalOpen(true)}>
            <RefreshCw className="h-4 w-4" />
            Adicionar conta recorrente
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {bundle.upcoming.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-200 p-5 text-center text-sm text-muted-foreground">
              Você não tem contas previstas neste período. Uma paz financeira em construção.
            </p>
          ) : (
            bundle.upcoming.map((bill) => (
              <div key={bill.id} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-3 md:grid-cols-[1fr_130px_120px_auto] md:items-center">
                <div>
                  <p className="font-medium">{bill.title}</p>
                  <p className="text-xs text-muted-foreground">{bill.category_name ?? "Sem categoria"} · Dia {dateLabel(bill.due_date ?? bill.transaction_date)}</p>
                </div>
                <p className="font-semibold text-destructive">{centsToBRL(bill.amount_cents)}</p>
                <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{statusLabel[bill.status]}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={() => action(bill.id, "mark_paid")} aria-label="Marcar como pago"><Check className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={() => action(bill.id, "postpone")} aria-label="Adiar"><CalendarDays className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-destructive" onClick={() => action(bill.id, "delete")} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </SoftCard>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto rounded-2xl bg-white p-1">
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="evolucao">Evolução</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="planejamento">Planejamento</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos" className="mt-5 space-y-4">
          <SoftCard>
            <CardContent className="grid gap-3 p-4 lg:grid-cols-[1.3fr_150px_150px_180px_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Buscar por nome ou descrição" className="rounded-2xl bg-white pl-9" />
              </div>
              <SelectField value={filters.type} onChange={(value) => setFilters({ ...filters, type: value })} label="Tipo" options={[{ value: "all", label: "Todas" }, { value: "income", label: "Receitas" }, { value: "expense", label: "Despesas" }, { value: "transfer", label: "Transferências" }]} />
              <SelectField value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })} label="Status" options={[{ value: "all", label: "Todos" }, { value: "paid", label: "Pagos" }, { value: "pending", label: "Pendentes" }, { value: "overdue", label: "Atrasados" }]} />
              <SelectField value={filters.sort} onChange={(value) => setFilters({ ...filters, sort: value })} label="Ordenação" options={[{ value: "recent", label: "Mais recente" }, { value: "amount_desc", label: "Maior valor" }, { value: "amount_asc", label: "Menor valor" }, { value: "category", label: "Categoria" }, { value: "due", label: "Vencimento" }]} />
              <Button variant="outline" className="rounded-full bg-white" onClick={() => setFilters({ search: "", type: "all", status: "all", category_id: "all", sort: "recent" })}>
                <Filter className="h-4 w-4" />
                Limpar
              </Button>
            </CardContent>
          </SoftCard>

          {bundle.transactions.length === 0 ? (
            <SoftCard>
              <CardContent className="grid min-h-[260px] place-items-center text-center">
                <div className="max-w-md">
                  <Receipt className="mx-auto h-10 w-10 text-primary" />
                  <h3 className="mt-4 text-lg font-semibold">Seu mês ainda está em branco.</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Registre uma entrada ou um gasto para começar a enxergar para onde seu dinheiro está indo.</p>
                  <Button className="mt-5 rounded-full" onClick={() => setModalOpen(true)}>Adicionar primeiro lançamento</Button>
                </div>
              </CardContent>
            </SoftCard>
          ) : (
            Object.entries(groups).map(([date, items]) => (
              <div key={date} className="space-y-2">
                <h3 className="px-1 text-sm font-semibold capitalize text-muted-foreground">{dateLabel(date)}</h3>
                {items.map((tx) => (
                  <div key={tx.id} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm lg:grid-cols-[1.4fr_160px_110px_110px_120px_auto] lg:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", tx.transaction_type === "income" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                        {tx.transaction_type === "income" ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{tx.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{tx.description || tx.source}</p>
                      </div>
                    </div>
                    <p className="text-sm">{tx.category_name ?? "Sem categoria"}</p>
                    <p className="text-sm text-muted-foreground">{dateLabel(tx.transaction_date)}</p>
                    <p className="text-sm">{typeLabel[tx.transaction_type]}</p>
                    <p className={cn("font-semibold", tx.transaction_type === "income" ? "text-success" : "text-destructive")}>
                      {tx.transaction_type === "income" ? "+" : "-"}{centsToBRL(tx.amount_cents)}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-[0.68rem] font-semibold text-zinc-600">{statusLabel[tx.status]}</span>
                      <Button variant="ghost" size="icon" className="rounded-full" onClick={() => action(tx.id, "duplicate")} aria-label="Duplicar"><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="rounded-full" onClick={() => action(tx.id, "mark_paid")} aria-label="Marcar pago"><Check className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-destructive" onClick={() => action(tx.id, "delete")} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="evolucao" className="mt-5 space-y-5">
          <SoftCard>
            <CardHeader><CardTitle>Comparativo mensal</CardTitle></CardHeader>
            <CardContent><FinanceEvolutionChart data={bundle.evolution} /></CardContent>
          </SoftCard>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard title="Mês atual x anterior" value={centsToBRL(bundle.overview.balanceDelta)} helper="Comparação de saldo do período" icon={RefreshCw} tone="lavender" />
            <MetricCard title="Média de gastos" value={centsToBRL(Math.round(bundle.evolution.reduce((sum, item) => sum + item.expenses, 0) / Math.max(bundle.evolution.length, 1)))} helper="Baseada nos meses carregados" icon={CreditCard} tone="bad" />
            <MetricCard title="Gastos recorrentes" value={centsToBRL(bundle.upcoming.reduce((sum, item) => sum + item.amount_cents, 0))} helper="Contas futuras pendentes" icon={Clock3} tone="neutral" />
          </div>
          <SoftCard>
            <CardHeader><CardTitle>Insights financeiros</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {bundle.insights.map((insight) => (
                <div key={insight} className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm text-zinc-700">{insight}</div>
              ))}
            </CardContent>
          </SoftCard>
        </TabsContent>

        <TabsContent value="categorias" className="mt-5 space-y-5">
          <SoftCard>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Para onde seu dinheiro foi</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Categorias maiores do período.</p>
              </div>
              <Button variant="outline" className="rounded-full bg-white"><Plus className="h-4 w-4" /> Nova categoria</Button>
            </CardHeader>
            <CardContent>
              {expenseBreakdown.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma despesa por categoria ainda.</p> : <FinanceCategoriesChart data={expenseBreakdown} />}
            </CardContent>
          </SoftCard>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {bundle.breakdown.map((category) => {
              const percent = category.type === "expense" && bundle.overview.expenses > 0 ? Math.round((category.total_cents / bundle.overview.expenses) * 100) : 0;
              const limit = category.monthly_limit_cents ?? 0;
              const used = limit > 0 ? Math.round((category.total_cents / limit) * 100) : 0;
              return (
                <SoftCard key={category.category_id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{category.name}</p>
                        <p className="text-xs text-muted-foreground">{typeLabel[category.type]} · {category.count} lançamentos</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="rounded-full"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <p className="mt-4 text-xl font-semibold">{centsToBRL(category.total_cents)}</p>
                    <p className="text-xs text-muted-foreground">{percent}% do total de despesas</p>
                    {limit > 0 ? (
                      <div className="mt-3">
                        <Progress value={Math.min(100, used)} className="h-2" />
                        <p className="mt-2 text-xs text-muted-foreground">
                          {centsToBRL(category.total_cents)} de {centsToBRL(limit)} usados
                        </p>
                        {used >= 90 ? <p className="mt-2 text-xs text-primary">Você já usou {used}% do limite definido para {category.name}.</p> : null}
                      </div>
                    ) : null}
                  </CardContent>
                </SoftCard>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="planejamento" className="mt-5 space-y-5">
          <SoftCard>
            <CardHeader>
              <CardTitle>Seu plano para o mês</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Receita esperada, gastos, limites e valor livre estimado.</p>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <MetricCard title="Receita esperada" value={centsToBRL(bundle.budget.expectedIncomeCents)} helper="Planejamento mensal" icon={PiggyBank} tone="good" />
              <MetricCard title="Gastos fixos" value={centsToBRL(bundle.budget.fixedExpensesCents)} helper="Base configurada" icon={Receipt} tone="neutral" />
              <MetricCard title="Reserva" value={centsToBRL(bundle.budget.reserveGoalCents)} helper="Meta de cuidado futuro" icon={Wallet} tone="lavender" />
              <MetricCard title="Livre estimado" value={centsToBRL(bundle.budget.freeCents)} helper="Depois dos limites usados" icon={Sparkles} tone={bundle.budget.freeCents >= 0 ? "good" : "bad"} />
            </CardContent>
          </SoftCard>
          <SoftCard>
            <CardHeader><CardTitle>Limites por categoria</CardTitle></CardHeader>
            <CardContent>
              {bundle.budget.categories.some((item) => item.limitCents > 0) ? (
                <BudgetBarsChart data={bundle.budget.categories.filter((item) => item.limitCents > 0)} />
              ) : (
                <p className="rounded-2xl border border-dashed border-zinc-200 p-5 text-center text-sm text-muted-foreground">Defina limites nas categorias para acompanhar seu plano com mais clareza.</p>
              )}
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {bundle.budget.categories.filter((item) => item.limitCents > 0).map((item) => (
                  <div key={item.categoryId} className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.percent}%</p>
                    </div>
                    <Progress value={Math.min(100, item.percent)} className="mt-3 h-2" />
                    <p className="mt-2 text-xs text-muted-foreground">{centsToBRL(item.usedCents)} de {centsToBRL(item.limitCents)} usados</p>
                    {item.percent > 100 ? <p className="mt-2 text-xs text-primary">Seu limite foi alcançado. Talvez seja um bom momento para decidir com intenção os próximos gastos.</p> : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </SoftCard>
        </TabsContent>
      </Tabs>

      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-lg md:hidden"
      >
        <Plus className="h-4 w-4" />
        Lançamento
      </button>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-3 py-2 shadow-[0_-10px_30px_rgba(82,66,96,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {[
            ["lancamentos", "Resumo", Wallet],
            ["lancamentos", "Lançamentos", Receipt],
            ["add", "Adicionar", Plus],
            ["planejamento", "Plano", CalendarDays],
            ["categorias", "Categorias", ChevronDown],
          ].map(([value, label, Icon]) => (
            <button
              key={`${value}-${label}`}
              type="button"
              onClick={() => value === "add" ? setModalOpen(true) : setActiveTab(value as string)}
              className="flex h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[0.65rem] font-medium text-muted-foreground"
            >
              <Icon className="h-4 w-4" />
              {label as string}
            </button>
          ))}
        </div>
      </div>

      <TransactionModal open={modalOpen} onOpenChange={setModalOpen} categories={bundle.categories} onSave={saveTransaction} />
    </div>
  );
}
