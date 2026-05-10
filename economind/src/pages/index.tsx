"use client";
import React, { useMemo } from "react";
import Layout from "@/components/Layout";
import { useApp } from "@/context/AppContext";
import {
  computeMonthStats,
  getCurrentMonth,
  formatEur,
  generateSuggestions,
  computeProjection,
  computeAccountBalance,
  getLast6Months,
} from "@/lib/analytics";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { isTransferCategory } from "@/lib/store";

const PIE_COLORS = [
  "#22c55e","#3b82f6","#f59e0b","#ef4444",
  "#8b5cf6","#06b6d4","#ec4899","#10b981",
];

// Smart label: show first 2 words, max 12 chars
function shortName(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 12);
  const two = words.slice(0, 2).join(" ");
  return two.length > 14 ? words[0].slice(0, 12) : two;
}

export default function Dashboard() {
  const { data } = useApp();
  const currentMonth = getCurrentMonth();

  const stats = useMemo(
    () => computeMonthStats(data.transactions, currentMonth),
    [data.transactions, currentMonth]
  );

  const suggestions = useMemo(
    () => generateSuggestions(data.transactions, currentMonth),
    [data.transactions, currentMonth]
  );

  const projection = useMemo(
    () => computeProjection(data.transactions, 6),
    [data.transactions]
  );

  const last6 = useMemo(() => getLast6Months(), []);
  const monthlyData = useMemo(
    () => last6.map((m) => {
      const s = computeMonthStats(data.transactions, m);
      return { name: m.slice(5), revenus: s.income, dépenses: s.expenses, solde: s.balance };
    }),
    [data.transactions, last6]
  );

  const accountStats = useMemo(
    () => data.accounts.map((acc) => ({
      ...acc,
      balance: computeAccountBalance(acc.id, acc.name, acc.initialBalance, data.transactions),
    })),
    [data.accounts, data.transactions]
  );

  const alerts = useMemo(() => {
    const a: string[] = [];
    accountStats.forEach((acc) => {
      if (acc.balance < 0)
        a.push(`🔴 ${acc.name} est en négatif (${formatEur(acc.balance)})`);
    });
    if (stats.expenses > stats.income * 0.9 && stats.income > 0)
      a.push("🟠 Dépenses proches du revenu ce mois-ci");
    if (stats.savingsRate < 5 && stats.income > 0)
      a.push("🔴 Taux d'épargne très faible ce mois");
    return a.slice(0, 3);
  }, [accountStats, stats]);

  // Pie — exclude transfer categories
  const pieData = useMemo(() => {
    return Object.entries(stats.byCategory)
      .filter(([cat, v]) => v > 0 && !isTransferCategory(cat))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [stats.byCategory]);

  const budgetNeeds   = stats.income * (data.budgetRule.needs / 100);
  const budgetWants   = stats.income * (data.budgetRule.wants / 100);
  const budgetSavings = stats.income * (data.budgetRule.savings / 100);

  const hasData = data.transactions.length > 0 || data.accounts.some(a => a.initialBalance > 0);

  return (
    <Layout>
      <div className="px-4 pt-4 space-y-4 animate-stagger">

        {/* Hero */}
        <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "var(--surface)" }}>
          <div className="absolute inset-0 opacity-5"
            style={{ background: "radial-gradient(ellipse at top right, var(--green), transparent)" }} />
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>
            Reste à vivre — {currentMonth.replace("-", " / ")}
          </p>
          <p className="text-4xl font-bold stat-value mb-2"
            style={{ color: stats.balance >= 0 ? "var(--green)" : "var(--red)" }}>
            {formatEur(stats.balance)}
          </p>
          <div className="flex gap-4 text-sm">
            <span style={{ color: "var(--text-2)" }}>
              <span className="income font-semibold">{formatEur(stats.income)}</span> revenus
            </span>
            <span style={{ color: "var(--text-2)" }}>
              <span className="expense font-semibold">{formatEur(stats.expenses)}</span> dépenses
            </span>
            {stats.transfers > 0 && (
              <span style={{ color: "var(--text-2)" }}>
                <span className="font-semibold" style={{ color: "var(--blue)" }}>{formatEur(stats.transfers)}</span> épargnés
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--surface-3)" }}>
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, stats.income > 0 ? (stats.expenses / stats.income) * 100 : 0)}%`,
                  background: stats.expenses > stats.income ? "var(--red)" : "var(--green)",
                }} />
            </div>
            <span className="text-xs font-mono" style={{ color: "var(--text-3)" }}>
              {stats.income > 0
                ? `${((stats.expenses / stats.income) * 100).toFixed(0)}% dépensé`
                : "Aucun revenu"}
            </span>
          </div>
        </div>

        {/* Empty state */}
        {!hasData && (
          <div className="card text-center py-8">
            <p className="text-3xl mb-2">📂</p>
            <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>Aucune transaction</p>
            <p className="text-xs mt-1 mb-4" style={{ color: "var(--text-3)" }}>
              Importe un relevé CSV ou PDF, ou ajoute une transaction manuellement.
            </p>
            <div className="flex gap-2 justify-center">
              <Link href="/import" className="btn-primary text-sm px-4 py-2">Importer</Link>
              <Link href="/transactions" className="btn-ghost text-sm px-4 py-2">Ajouter</Link>
            </div>
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="rounded-2xl p-4 space-y-2"
            style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--amber)" }}>
              ⚠️ Points importants
            </p>
            {alerts.map((a, i) => (
              <p key={i} className="text-sm" style={{ color: "var(--text-2)" }}>{a}</p>
            ))}
          </div>
        )}

        {/* Comptes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-title">Comptes</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {accountStats.map((acc) => {
              const status = acc.balance < 0 ? "🔴" : acc.balance < 200 ? "🟠" : "🟢";
              return (
                <div key={acc.id} className="rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium truncate" style={{ color: "var(--text-2)" }}>
                      {shortName(acc.name)}
                    </span>
                    <span className="text-xs">{status}</span>
                  </div>
                  <p className="text-base font-bold font-num"
                    style={{ color: acc.balance < 0 ? "var(--red)" : "var(--text)" }}>
                    {formatEur(acc.balance)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Budget */}
        {hasData && (
          <div className="card">
            <p className="section-title mb-3">
              Budget {data.budgetRule.mode === "503020" ? "50/30/20" : "Personnalisé"}
            </p>
            {[
              { label: "Besoins", budget: budgetNeeds, actual: stats.expenses * 0.7, pct: data.budgetRule.needs },
              { label: "Envies",  budget: budgetWants, actual: stats.expenses * 0.2, pct: data.budgetRule.wants },
              { label: "Épargne", budget: budgetSavings, actual: stats.balance > 0 ? stats.balance : 0, pct: data.budgetRule.savings },
            ].map(({ label, budget, actual, pct }) => {
              const ratio = budget > 0 ? Math.min(1, actual / budget) : 0;
              const over = actual > budget && budget > 0;
              return (
                <div key={label} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-2)" }}>
                    <span className="font-semibold">{label} ({pct}%)</span>
                    <span className={over ? "text-red-400 font-bold" : ""}>
                      {formatEur(actual)} / {formatEur(budget)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "var(--surface-3)" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${ratio * 100}%`, background: over ? "var(--red)" : "var(--green)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Chart */}
        {hasData && (
          <div className="card">
            <p className="section-title mb-3">Évolution 6 mois</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={monthlyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px", color: "var(--text)" }}
                  formatter={(v: number) => formatEur(v)}
                />
                <Area type="monotone" dataKey="revenus" stroke="#22c55e" strokeWidth={2} fill="url(#gIncome)" />
                <Area type="monotone" dataKey="dépenses" stroke="#ef4444" strokeWidth={2} fill="url(#gExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pie */}
        {pieData.length > 0 && (
          <div className="card">
            <p className="section-title mb-3">Répartition dépenses</p>
            <div className="flex gap-4 items-center">
              <PieChart width={120} height={120}>
                <Pie data={pieData} cx={55} cy={55} innerRadius={30} outerRadius={55} dataKey="value" strokeWidth={0}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
              </PieChart>
              <div className="flex-1 space-y-1.5 min-w-0">
                {pieData.slice(0, 5).map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                      <span className="text-xs truncate" style={{ color: "var(--text-2)" }}>{item.name}</span>
                    </div>
                    <span className="text-xs font-mono font-semibold shrink-0" style={{ color: "var(--text)" }}>
                      {formatEur(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Projection */}
        {hasData && projection.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="section-title">Projection 6 mois</p>
              {projection[5].cumulative > 0
                ? <TrendingUp size={18} style={{ color: "var(--green)" }} />
                : <TrendingDown size={18} style={{ color: "var(--red)" }} />}
            </div>
            <p className="text-2xl font-bold stat-value"
              style={{ color: projection[5].cumulative >= 0 ? "var(--green)" : "var(--red)" }}>
              {formatEur(projection[5].cumulative)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
              Épargne cumulée estimée sur 6 mois
            </p>
            <div className="mt-3 grid grid-cols-6 gap-1">
              {projection.map((p) => {
                const maxAbs = Math.max(...projection.map((x) => Math.abs(x.projected)));
                const h = maxAbs > 0 ? (Math.abs(p.projected) / maxAbs) * 40 : 4;
                return (
                  <div key={p.month} className="flex flex-col items-center gap-1">
                    <div className="w-full rounded-sm"
                      style={{ height: `${h}px`, background: p.projected >= 0 ? "var(--green)" : "var(--red)", opacity: 0.8 }} />
                    <span className="text-[9px]" style={{ color: "var(--text-3)" }}>{p.month.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommandations */}
        {suggestions.length > 0 && (
          <div className="card">
            <p className="section-title mb-3">💡 Recommandations</p>
            <div className="space-y-3">
              {suggestions.map((s, i) => (
                <div key={i} className="flex gap-3 items-start p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
                  <span className="text-xl">{s.icon}</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{s.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-2 pb-2">
          <Link href="/transactions" className="card flex items-center justify-between p-4 active:scale-95 transition-transform">
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Transactions</span>
            <ChevronRight size={16} style={{ color: "var(--text-3)" }} />
          </Link>
          <Link href="/objectifs" className="card flex items-center justify-between p-4 active:scale-95 transition-transform">
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Objectifs</span>
            <ChevronRight size={16} style={{ color: "var(--text-3)" }} />
          </Link>
        </div>

      </div>
    </Layout>
  );
}
