"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/types";

const CATEGORY_COLORS: Record<string, string> = {
  moradia: "#7c3aed",
  alimentacao: "#10b981",
  saude: "#ec4899",
  lazer: "#f59e0b",
  transporte: "#3b82f6",
  renda: "#10b981",
  outros: "#94a3b8",
};

const EXPENSE_CATEGORIES = ["alimentacao", "moradia", "saude", "lazer", "transporte", "outros"];
const CATEGORY_LABELS: Record<string, string> = {
  alimentacao: "Alimentação",
  moradia: "Moradia",
  saude: "Saúde",
  lazer: "Lazer",
  transporte: "Transporte",
  renda: "Renda",
  outros: "Outros",
};

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const chartLoader = (
  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
    Carregando gráfico...
  </div>
);

const FinanceEvolutionChart = dynamic(
  () => import("./components/finance-charts").then((mod) => mod.FinanceEvolutionChart),
  { ssr: false, loading: () => chartLoader },
);

const FinanceCategoriesChart = dynamic(
  () => import("./components/finance-charts").then((mod) => mod.FinanceCategoriesChart),
  { ssr: false, loading: () => chartLoader },
);

export default function FinancasPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<"income" | "expense">("expense");
  const [newCategory, setNewCategory] = useState("alimentacao");
  const [saving, setSaving] = useState(false);

  const month = new Date().toISOString().slice(0, 7);

  const loadTransactions = useCallback(async () => {
    try {
      const res = await fetch(`/api/transactions?month=${month}`);
      if (!res.ok) return;
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const totalIncome = useMemo(() => transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), [transactions]);
  const totalExpense = useMemo(() => transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), [transactions]);
  const balance = totalIncome - totalExpense;

  const pieData = useMemo(() => {
    const cats = transactions.filter((t) => t.type === "expense").reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
    return Object.entries(cats).map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] ?? CATEGORY_COLORS.outros,
    }));
  }, [transactions]);

  const areaData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 3 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (2 - i), 1);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const txMonth = transactions.filter((t) => t.date?.startsWith(m));
      return {
        mes: MONTH_NAMES[d.getMonth()],
        receita: txMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
        despesa: txMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [transactions]);

  const monthLabel = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const addTransaction = async () => {
    const amount = parseFloat(newAmount.replace(",", "."));
    if (!newTitle.trim() || isNaN(amount) || amount <= 0 || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          amount,
          type: newType,
          category: newType === "income" ? "renda" : newCategory,
        }),
      });
      const t = await res.json();
      setTransactions((prev) => [t, ...prev]);
      setNewTitle("");
      setNewAmount("");
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-10 rounded-xl bg-muted/50 animate-pulse w-48" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finanças</h1>
          <p className="text-muted-foreground text-sm mt-1 capitalize">{monthLabel}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Lançamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo lançamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setNewType("income")}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition-all ${newType === "income" ? "border-success bg-success/10 text-success" : "border-border"}`}
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  Receita
                </button>
                <button
                  onClick={() => setNewType("expense")}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition-all ${newType === "expense" ? "border-destructive bg-destructive/10 text-destructive" : "border-border"}`}
                >
                  <ArrowDownCircle className="h-4 w-4" />
                  Despesa
                </button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fin-title">Descrição</Label>
                <Input id="fin-title" placeholder="Ex: Salário, Mercado..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fin-amount">Valor (R$)</Label>
                <Input id="fin-amount" type="number" placeholder="0,00" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} min="0" step="0.01" />
              </div>
              {newType === "expense" && (
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={addTransaction} className="w-full" disabled={!newTitle.trim() || !newAmount || saving}>
                {saving ? "Registrando..." : "Registrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Saldo</span>
            </div>
            <p className={`text-lg font-bold ${balance >= 0 ? "text-success" : "text-destructive"}`}>
              {formatCurrency(balance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Receitas</span>
            </div>
            <p className="text-lg font-bold text-success">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Despesas</span>
            </div>
            <p className="text-lg font-bold text-destructive">{formatCurrency(totalExpense)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lancamentos">
        <TabsList className="w-full">
          <TabsTrigger value="lancamentos" className="flex-1">Lançamentos</TabsTrigger>
          <TabsTrigger value="evolucao" className="flex-1">Evolução</TabsTrigger>
          <TabsTrigger value="categorias" className="flex-1">Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos" className="mt-4 space-y-2">
          {transactions.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                Nenhum lançamento este mês.
              </CardContent>
            </Card>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
                <div className={`p-1.5 rounded-lg ${t.type === "income" ? "bg-success/15" : "bg-destructive/10"}`}>
                  {t.type === "income" ? <ArrowUpCircle className="h-4 w-4 text-success" /> : <ArrowDownCircle className="h-4 w-4 text-destructive" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[t.category] ?? t.category}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${t.type === "income" ? "text-success" : "text-destructive"}`}>
                    {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.date ? new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR") : ""}
                  </p>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="evolucao" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Receitas vs Despesas (últimos 3 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <FinanceEvolutionChart data={areaData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Despesas por categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma despesa registrada.</p>
              ) : (
                <FinanceCategoriesChart data={pieData} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}



