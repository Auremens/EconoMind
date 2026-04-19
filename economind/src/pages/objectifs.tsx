"use client";
import React, { useState } from "react";
import Layout from "@/components/Layout";
import { useApp } from "@/context/AppContext";
import { Goal, generateId } from "@/lib/store";
import { formatEur } from "@/lib/analytics";
import { Plus, Target, Trash2, Edit2, Check, X } from "lucide-react";

const GOAL_COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#10b981",
];

const EMPTY_FORM = {
  name: "",
  targetAmount: "",
  currentAmount: "",
  deadline: "",
  color: GOAL_COLORS[0],
};

export default function Objectifs() {
  const { data, dispatch } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const handleSubmit = () => {
    if (!form.name || !form.targetAmount) return;
    const goal: Goal = {
      id: editId || generateId(),
      name: form.name,
      targetAmount: parseFloat(form.targetAmount),
      currentAmount: parseFloat(form.currentAmount) || 0,
      deadline: form.deadline,
      color: form.color,
      createdAt: Date.now(),
    };
    if (editId) {
      dispatch({ type: "UPDATE_GOAL", goal });
    } else {
      dispatch({ type: "ADD_GOAL", goal });
    }
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (g: Goal) => {
    setForm({
      name: g.name,
      targetAmount: g.targetAmount.toString(),
      currentAmount: g.currentAmount.toString(),
      deadline: g.deadline,
      color: g.color,
    });
    setEditId(g.id);
    setShowForm(true);
  };

  const addFunds = (goalId: string, amount: number) => {
    const goal = data.goals.find((g) => g.id === goalId)!;
    dispatch({
      type: "UPDATE_GOAL",
      goal: {
        ...goal,
        currentAmount: Math.min(goal.targetAmount, goal.currentAmount + amount),
      },
    });
  };

  const totalTarget = data.goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = data.goals.reduce((s, g) => s + g.currentAmount, 0);

  return (
    <Layout>
      <div className="px-4 pt-4 space-y-4 animate-stagger">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="section-title">Objectifs</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
              {data.goals.length} objectif{data.goals.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={() => { setEditId(null); setForm(EMPTY_FORM); setShowForm(!showForm); }}
          >
            <Plus size={16} />
            Objectif
          </button>
        </div>

        {/* Summary */}
        {data.goals.length > 0 && (
          <div className="card">
            <div className="flex justify-between mb-2 text-sm">
              <span style={{ color: "var(--text-2)" }}>Total épargné</span>
              <span className="font-bold" style={{ color: "var(--green)" }}>{formatEur(totalSaved)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0}%`,
                  background: "var(--green)",
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs" style={{ color: "var(--text-3)" }}>
              <span>{totalTarget > 0 ? `${((totalSaved / totalTarget) * 100).toFixed(0)}%` : "0%"}</span>
              <span>Objectif : {formatEur(totalTarget)}</span>
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="card fade-up space-y-3">
            <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
              {editId ? "Modifier l'objectif" : "Nouvel objectif"}
            </p>

            <div>
              <label className="label">Nom</label>
              <input
                type="text"
                className="input"
                placeholder="ex: Vacances été 2026"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Objectif (€)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="3000"
                  value={form.targetAmount}
                  onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
                  min="0"
                />
              </div>
              <div>
                <label className="label">Déjà épargné (€)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0"
                  value={form.currentAmount}
                  onChange={(e) => setForm((f) => ({ ...f, currentAmount: e.target.value }))}
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="label">Échéance</label>
              <input
                type="date"
                className="input"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </div>

            {/* Color picker */}
            <div>
              <label className="label">Couleur</label>
              <div className="flex gap-2 flex-wrap">
                {GOAL_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className="w-7 h-7 rounded-full transition-all"
                    style={{
                      background: c,
                      outline: form.color === c ? `2px solid ${c}` : "none",
                      outlineOffset: "2px",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={handleSubmit}>
                <Check size={15} />
                {editId ? "Modifier" : "Créer"}
              </button>
              <button className="btn-ghost px-3" onClick={() => { setShowForm(false); setEditId(null); }}>
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Goals list */}
        {data.goals.length === 0 && !showForm && (
          <div className="text-center py-12" style={{ color: "var(--text-3)" }}>
            <Target size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun objectif pour l'instant</p>
            <p className="text-xs mt-1">Crée ton premier objectif d'épargne</p>
          </div>
        )}

        {data.goals.map((goal) => {
          const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
          const daysLeft = goal.deadline
            ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)
            : null;
          const status = pct >= 100 ? "🟢" : daysLeft !== null && daysLeft < 30 && pct < 80 ? "🔴" : "🟠";
          const monthlyNeeded =
            daysLeft && daysLeft > 0 && pct < 100
              ? ((goal.targetAmount - goal.currentAmount) / (daysLeft / 30)).toFixed(0)
              : null;

          return (
            <div key={goal.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${goal.color}22` }}
                  >
                    <Target size={16} style={{ color: goal.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{goal.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>
                      {status} {daysLeft !== null ? `${daysLeft > 0 ? daysLeft + " jours restants" : "Échu"}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    className="p-1.5 rounded-lg"
                    style={{ background: "var(--surface-2)", color: "var(--blue)" }}
                    onClick={() => startEdit(goal)}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    className="p-1.5 rounded-lg"
                    style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)" }}
                    onClick={() => {
                      if (confirm("Supprimer cet objectif ?"))
                        dispatch({ type: "DELETE_GOAL", id: goal.id });
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-2)" }}>
                  <span className="font-bold font-num" style={{ color: goal.color }}>
                    {formatEur(goal.currentAmount)}
                  </span>
                  <span>{formatEur(goal.targetAmount)}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, pct)}%`, background: goal.color }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px]" style={{ color: "var(--text-3)" }}>
                  <span>{pct.toFixed(0)}%</span>
                  {monthlyNeeded && <span>~{formatEur(parseFloat(monthlyNeeded))}/mois</span>}
                </div>
              </div>

              {/* Quick add */}
              <div className="flex gap-2 mt-3">
                {[50, 100, 200].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => addFunds(goal.id, amt)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: `${goal.color}15`, color: goal.color }}
                  >
                    +{amt}€
                  </button>
                ))}
                <button
                  onClick={() => {
                    const v = prompt("Montant à ajouter (€) :");
                    if (v && !isNaN(parseFloat(v))) addFunds(goal.id, parseFloat(v));
                  }}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "var(--surface-2)", color: "var(--text-3)" }}
                >
                  Autre
                </button>
              </div>
            </div>
          );
        })}

      </div>
    </Layout>
  );
}
