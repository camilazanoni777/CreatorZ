"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { centsToBRL } from "@/lib/money";

export type FlowDatum = {
  label: string;
  income: number;
  expenses: number;
  balance: number;
};

export type CategoryDatum = {
  name: string;
  total_cents: number;
  color: string;
};

export function FinanceFlowChart({ data, mode }: { data: FlowDatum[]; mode: "flow" | "balance" }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(value) => centsToBRL(Number(value)).replace(",00", "")} />
        <Tooltip
          formatter={(value) => centsToBRL(Number(value))}
          contentStyle={{ borderRadius: "14px", border: "1px solid var(--border)", fontSize: "12px" }}
        />
        {mode === "flow" ? (
          <>
            <Bar dataKey="income" name="Receitas" fill="#86efac" radius={[8, 8, 0, 0]} />
            <Bar dataKey="expenses" name="Despesas" fill="#fca5a5" radius={[8, 8, 0, 0]} />
          </>
        ) : null}
        <Line type="monotone" dataKey="balance" name="Saldo acumulado" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function FinanceEvolutionChart({ data }: { data: FlowDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeSoft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.24} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseSoft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f87171" stopOpacity={0.20} />
            <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(value) => centsToBRL(Number(value)).replace(",00", "")} />
        <Tooltip formatter={(value) => centsToBRL(Number(value))} contentStyle={{ borderRadius: "14px", border: "1px solid var(--border)", fontSize: "12px" }} />
        <Area type="monotone" dataKey="income" name="Receitas" stroke="#16a34a" fill="url(#incomeSoft)" strokeWidth={2} />
        <Area type="monotone" dataKey="expenses" name="Despesas" stroke="#ef4444" fill="url(#expenseSoft)" strokeWidth={2} />
        <Line type="monotone" dataKey="balance" name="Saldo" stroke="#8b5cf6" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function FinanceCategoriesChart({ data }: { data: CategoryDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.total_cents, 0);
  return (
    <div className="grid gap-5 lg:grid-cols-[220px_1fr] lg:items-center">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={92}
            paddingAngle={3}
            dataKey="total_cents"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => centsToBRL(Number(value))} contentStyle={{ borderRadius: "14px", fontSize: "12px" }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-3">
        {data.map((item, index) => {
          const percent = total > 0 ? Math.round((item.total_cents / total) * 100) : 0;
          return (
            <div key={item.name} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold" style={{ backgroundColor: item.color }}>
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{percent}% das despesas</p>
                </div>
              </div>
              <span className="text-sm font-semibold">{centsToBRL(item.total_cents)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BudgetBarsChart({ data }: { data: Array<{ name: string; usedCents: number; limitCents: number; color: string }> }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tickFormatter={(value) => centsToBRL(Number(value)).replace(",00", "")} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <Tooltip formatter={(value) => centsToBRL(Number(value))} contentStyle={{ borderRadius: "14px", fontSize: "12px" }} />
        <Bar dataKey="usedCents" name="Usado" radius={[0, 8, 8, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
