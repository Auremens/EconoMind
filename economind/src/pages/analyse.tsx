"use client";
import React, { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { useApp } from "@/context/AppContext";
import {
  computeMonthStats,
  getLast6Months,
  getCurrentMonth,
  computeProjection,
  formatEur,
  computeAccountBalance,
} from "@/lib/analytics";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";

const PIE_COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#10b981",
];

const TABS = ["Résumé", "Comptes", "Budget", "Simulation", "Projection"] as const;
type Tab = typeof TABS[number];

export default function Analyse() {
  const { data, dispatch } = useApp();
  const [tab, setTab] = useState<Tab>("Résumé");
  const [simCategory, setSimCategory] = useState("");
  const [simDelta, setSimDelta] = useState(0);
  const currentMonth = getCurrentMonth();
  const last6 = useMemo(() => getLast6Months(), []);

  const monthlyStats = useMemo(
    () => last6.map((m) => ({ ...computeMonthStats(data.transactions, m), label: m.slice(5) })),
    [data.transactions, last6]
  );

  const currentStats = useMemo(
    () => computeMonthStats(data.transactions, currentMonth),
    [data.transactions, currentMonth]
  );

  const projection = useMemo(
    () => computeProjection(data.transactions, 6),
    [data.transactions]
  );

  const accountStats = useMemo(
    () => data.accounts.map((acc) => ({
      ...acc,
      balance: computeAccountBalance(acc.id, acc.name, acc.initialBalance, data.transactions),
    })),
    [data.accounts, data.transactions]
  );

  // Category list for simulation
  const categories = useMemo(
    () => Object.keys(currentStats.byCategory).filter((c) => currentStats.byCategory[c] > 0),
    [currentStats]
  );

  // Simulation: projected savings with delta
  const simSavings = useMemo(() => {
    const avgBalance =
      monthlyStats.reduce((s, m) => s + m.balance, 0) / (monthlyStats.length || 1);
    const adjusted = avgBalance + simDelta;
    return Array.from({ length: 6 }, (_, i) => ({
      month: `M+${i + 1}`,
      baseline: (avgBalance * (i + 1)),
      simulated: (adjusted * (i + 1)),
    }));
  }, [monthlyStats, simDelta]);

  const pieData = useMemo(() => {
    return Object.entries(currentStats.byCategory)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [currentStats]);

  const handleBudgetMode = (mode: "503020" | "custom") => {
    dispatch({
      type: "SET_BUDGET",
      budget:
        mode === "503020"
          ? { mode: "503020", needs: 50, wants: 30, savings: 20 }
          : { ...data.budgetRule, mode: "custom" },
    });
  };

  const handleBudgetSlider = (field: "needs" | "wants" | "savings", val: number) => {
    const rest = 100 - val;
    const others = ["needs", "wants", "savings"].filter((k) => k !== field) as Array<"needs" | "wants" | "savings">;
    const total = data.budgetRule[others[0]] + data.budgetRule[others[1]];
    const scale = total > 0 ? rest / total : 0.5;
    dispatch({
      type: "SET_BUDGET",
      budget: {
        ...data.budgetRule,
        mode: "custom",
        [field]: val,
        [others[0]]: Math.round(data.budgetRule[others[0]] * scale),
        [others[1]]: Math.round(rest - Math.round(data.budgetRule[others[0]] * scale)),
      },
    });
  };

  return (
    <Layout>
      <div className="px-4 pt-4 space-y-4 animate-stagger">
        <p className="section-title">Analyse</p>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab === t ? "var(--green)" : "var(--surface-2)",
                color: tab === t ? "#0a0d14" : "var(--text-2)",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Résumé ── */}
        {tab === "Résumé" && (
          <div className="space-y-4 fade-up">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Revenus", value: currentStats.income, color: "var(--green)" },
                { label: "Dépenses", value: currentStats.expenses, color: "var(--red)" },
                { label: "Solde", value: currentStats.balance, color: currentStats.balance >= 0 ? "var(--green)" : "var(--red)" },
                { label: "Taux épargne", value: currentStats.savingsRate, isRate: true, color: currentStats.savingsRate >= 20 ? "var(--green)" : "var(--amber)" },
              ].map(({ label, value, color, isRate }) => (
                <div key={label} className="card text-center">
                  <p className="text-xs mb-1" style={{ color: "var(--text-3)" }}>{label}</p>
                  <p className="text-xl font-bold stat-value" style={{ color }}>
                    {isRate ? `${(value as number).toFixed(1)}%` : formatEur(value as number)}
                  </p>
                </div>
              ))}
            </div>

            {/* Revenus vs dépenses bars */}
            <div className="card">
              <p className="font-semibold text-sm mb-3" style={{ color: "var(--text)" }}>Revenus vs Dépenses</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={monthlyStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px", color: "var(--text)" }}
                    formatter={(v: number) => formatEur(v)}
                  />
                  <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Revenus" />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Dépenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie */}
            {pieData.length > 0 && (
              <div className="card">
                <p className="font-semibold text-sm mb-3" style={{ color: "var(--text)" }}>Par catégorie</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" strokeWidth={0}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px", color: "var(--text)" }}
                      formatter={(v: number) => formatEur(v)}
                    />
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: "11px", color: "var(--text-2)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ── Comptes ── */}
        {tab === "Comptes" && (
          <div className="space-y-3 fade-up">
            {accountStats.map((acc) => {
              const status = acc.balance < 0 ? "🔴" : acc.balance < 500 ? "🟠" : "🟢";
              return (
                <div key={acc.id} className="card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl"
                      style={{ background: `${acc.color}22` }}
                    />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{acc.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-3)" }}>
                        Initial : {formatEur(acc.initialBalance)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold font-num" style={{ color: acc.balance < 0 ? "var(--red)" : "var(--text)" }}>
                      {formatEur(acc.balance)}
                    </p>
                    <span className="text-xs">{status}</span>
                  </div>
                </div>
              );
            })}

            <div className="card">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={accountStats.map((a) => ({ name: a.name.split(" ").slice(-1)[0], solde: a.balance, color: a.color }))}
                  margin={{ top: 0, right: 0, left: -10, bottom: 0 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px", color: "var(--text)" }}
                    formatter={(v: number) => formatEur(v)}
                  />
                  <Bar dataKey="solde" radius={[4, 4, 0, 0]}>
                    {accountStats.map((acc, i) => (
                      <Cell key={i} fill={acc.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Budget ── */}
        {tab === "Budget" && (
          <div className="space-y-4 fade-up">
            {/* Mode selector */}
            <div className="grid grid-cols-2 gap-2">
              {(["503020", "custom"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleBudgetMode(mode)}
                  className="py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: data.budgetRule.mode === mode ? "rgba(34,197,94,0.15)" : "var(--surface-2)",
                    color: data.budgetRule.mode === mode ? "var(--green)" : "var(--text-2)",
                    border: data.budgetRule.mode === mode ? "1px solid rgba(34,197,94,0.3)" : "1px solid transparent",
                  }}
                >
                  {mode === "503020" ? "50/30/20" : "Personnalisé"}
                </button>
              ))}
            </div>

            {/* Sliders */}
            {(["needs", "wants", "savings"] as const).map((field) => {
              const labels: Record<string, string> = { needs: "Besoins", wants: "Envies", savings: "Épargne" };
              const colors: Record<string, string> = { needs: "#3b82f6", wants: "#f59e0b", savings: "#22c55e" };
              const val = data.budgetRule[field];
              const budgetAmt = currentStats.income * (val / 100);

              return (
                <div key={field} className="card">
                  <div className="flex justify-between mb-2">
                    <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{labels[field]}</p>
                    <p className="text-sm font-bold font-num" style={{ color: colors[field] }}>
                      {val}% · {formatEur(budgetAmt)}
                    </p>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    value={val}
                    disabled={data.budgetRule.mode === "503020"}
                    onChange={(e) => handleBudgetSlider(field, parseInt(e.target.value))}
                    className="w-full"
                    style={{ accentColor: colors[field] }}
                  />
                </div>
              );
            })}

            {/* Réel vs budget */}
            <div className="card">
              <p className="font-semibold text-sm mb-3" style={{ color: "var(--text)" }}>Réel vs Budget</p>
              {[
                { label: "Besoins", budget: currentStats.income * (data.budgetRule.needs / 100), actual: currentStats.expenses * 0.7 },
                { label: "Envies", budget: currentStats.income * (data.budgetRule.wants / 100), actual: currentStats.expenses * 0.2 },
                { label: "Épargne", budget: currentStats.income * (data.budgetRule.savings / 100), actual: Math.max(0, currentStats.balance) },
              ].map(({ label, budget, actual }) => {
                const pct = budget > 0 ? Math.min(100, (actual / budget) * 100) : 0;
                const over = actual > budget;
                return (
                  <div key={label} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-2)" }}>
                      <span>{label}</span>
                      <span style={{ color: over ? "var(--red)" : "var(--text-2)" }}>
                        {formatEur(actual)} / {formatEur(budget)} {over ? "⚠️" : ""}
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: over ? "var(--red)" : "var(--green)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Simulation ── */}
        {tab === "Simulation" && (
          <div className="space-y-4 fade-up">
            <div className="card">
              <p className="font-semibold text-sm mb-3" style={{ color: "var(--text)" }}>
                💡 Simuler une réduction de dépense
              </p>

              <div className="mb-3">
                <label className="label">Catégorie</label>
                <select
                  className="input"
                  value={simCategory}
                  onChange={(e) => setSimCategory(e.target.value)}
                >
                  <option value="">Toutes les dépenses</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c} ({formatEur(currentStats.byCategory[c] || 0)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="label">
                  Économie mensuelle : <span style={{ color: "var(--green)" }}>{formatEur(simDelta)}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={
                    simCategory
                      ? Math.round(currentStats.byCategory[simCategory] || 500)
                      : 1000
                  }
                  value={simDelta}
                  onChange={(e) => setSimDelta(parseInt(e.target.value))}
                  className="w-full"
                  style={{ accentColor: "var(--green)" }}
                />
              </div>

              {simDelta > 0 && (
                <div
                  className="rounded-xl p-3 text-sm"
                  style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)" }}
                >
                  <p style={{ color: "var(--green)" }} className="font-semibold">
                    Impact sur 6 mois : +{formatEur(simDelta * 6)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-2)" }}>
                    Soit {formatEur(simDelta * 12)}/an en économisant {formatEur(simDelta)}/mois
                  </p>
                </div>
              )}
            </div>

            {/* Simulation chart */}
            <div className="card">
              <p className="font-semibold text-sm mb-3" style={{ color: "var(--text)" }}>
                Épargne cumulée simulée vs actuelle
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={simSavings} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px", color: "var(--text)" }}
                    formatter={(v: number) => formatEur(v)}
                  />
                  <Line type="monotone" dataKey="baseline" stroke="var(--text-3)" strokeWidth={2} dot={false} name="Actuel" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="simulated" stroke="#22c55e" strokeWidth={2.5} dot={false} name="Simulé" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Projection ── */}
        {tab === "Projection" && (
          <div className="space-y-4 fade-up">
            <div className="grid grid-cols-2 gap-2">
              <div className="card text-center">
                <p className="text-xs mb-1" style={{ color: "var(--text-3)" }}>Solde moyen/mois</p>
                <p className="text-lg font-bold stat-value" style={{ color: "var(--green)" }}>
                  {formatEur(
                    monthlyStats.reduce((s, m) => s + m.balance, 0) / (monthlyStats.length || 1)
                  )}
                </p>
              </div>
              <div className="card text-center">
                <p className="text-xs mb-1" style={{ color: "var(--text-3)" }}>Projection 6 mois</p>
                <p className="text-lg font-bold stat-value" style={{ color: projection[5]?.cumulative >= 0 ? "var(--green)" : "var(--red)" }}>
                  {formatEur(projection[5]?.cumulative || 0)}
                </p>
              </div>
            </div>

            <div className="card">
              <p className="font-semibold text-sm mb-3" style={{ color: "var(--text)" }}>Épargne cumulée projetée</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={projection} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradProj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px", color: "var(--text)" }}
                    formatter={(v: number) => formatEur(v)}
                  />
                  <Area type="monotone" dataKey="cumulative" stroke="#22c55e" strokeWidth={2.5} fill="url(#gradProj)" name="Épargne cumulée" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <p className="font-semibold text-sm mb-3" style={{ color: "var(--text)" }}>Projection mensuelle</p>
              <div className="space-y-2">
                {projection.map((p) => (
                  <div key={p.month} className="flex items-center justify-between py-1">
                    <span className="text-sm" style={{ color: "var(--text-2)" }}>{p.month}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: "var(--text-3)" }}>
                        {p.projected >= 0 ? "📈" : "📉"} {formatEur(p.projected)}/mois
                      </span>
                      <span
                        className="text-sm font-bold font-num"
                        style={{ color: p.cumulative >= 0 ? "var(--green)" : "var(--red)" }}
                      >
                        {formatEur(p.cumulative)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
