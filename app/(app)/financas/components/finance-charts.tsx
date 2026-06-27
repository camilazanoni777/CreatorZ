"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

type AreaDatum = {
  mes: string;
  receita: number;
  despesa: number;
};

type PieDatum = {
  name: string;
  value: number;
  color: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  alimentacao: "Alimentação",
  moradia: "Moradia",
  saude: "Saúde",
  lazer: "Lazer",
  transporte: "Transporte",
  renda: "Renda",
  outros: "Outros",
};

export function FinanceEvolutionChart({ data }: { data: AreaDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="receitaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="despesaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", fontSize: "12px" }}
        />
        <Area type="monotone" dataKey="receita" stroke="#10b981" fill="url(#receitaGrad)" strokeWidth={2} name="Receita" />
        <Area type="monotone" dataKey="despesa" stroke="#ef4444" fill="url(#despesaGrad)" strokeWidth={2} name="Despesa" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function FinanceCategoriesChart({ data }: { data: PieDatum[] }) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <ResponsiveContainer width={180} height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2 w-full">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm">{CATEGORY_LABELS[item.name] ?? item.name}</span>
            </div>
            <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
