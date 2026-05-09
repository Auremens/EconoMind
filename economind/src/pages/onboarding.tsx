"use client";
import React, { useState } from "react";
import { useRouter } from "next/router";
import { useApp } from "@/context/AppContext";
import { Account, generateId } from "@/lib/store";
import { Plus, Trash2, ChevronRight, ChevronLeft, Check, Wallet } from "lucide-react";

const ACCOUNT_COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#10b981",
  "#f97316", "#84cc16",
];

const ACCOUNT_PRESETS = [
  { name: "Compte courant", color: "#22c55e" },
  { name: "Livret A", color: "#3b82f6" },
  { name: "PEA", color: "#8b5cf6" },
  { name: "LEP", color: "#10b981" },
  { name: "Compte joint", color: "#f59e0b" },
  { name: "Épargne", color: "#06b6d4" },
];

type Step = 1 | 2 | 3;

interface PersonForm {
  name: string;
}

interface AccountForm {
  id: string;
  name: string;
  initialBalance: string;
  color: string;
  owner: "A" | "B" | "joint";
}

export default function Onboarding() {
  const router = useRouter();
  const { dispatch } = useApp();
  const [step, setStep] = useState<Step>(1);
  const [persons, setPersons] = useState<[PersonForm, PersonForm]>([
    { name: "" },
    { name: "" },
  ]);
  const [accounts, setAccounts] = useState<AccountForm[]>([
    { id: generateId(), name: "Compte courant", initialBalance: "", color: "#22c55e", owner: "A" },
    { id: generateId(), name: "Compte courant", initialBalance: "", color: "#3b82f6", owner: "B" },
    { id: generateId(), name: "Compte joint", initialBalance: "", color: "#f59e0b", owner: "joint" },
  ]);
  const [newAccName, setNewAccName] = useState("");
  const [newAccBalance, setNewAccBalance] = useState("");
  const [newAccColor, setNewAccColor] = useState(ACCOUNT_COLORS[3]);
  const [newAccOwner, setNewAccOwner] = useState<"A" | "B" | "joint">("A");

  const nameA = persons[0].name || "Personne A";
  const nameB = persons[1].name || "Personne B";

  const canProceedStep1 = persons[0].name.trim().length > 0 && persons[1].name.trim().length > 0;
  const canProceedStep2 = accounts.length > 0;

  const addAccount = () => {
    if (!newAccName.trim()) return;
    setAccounts((prev) => [
      ...prev,
      {
        id: generateId(),
        name: newAccName.trim(),
        initialBalance: newAccBalance,
        color: newAccColor,
        owner: newAccOwner,
      },
    ]);
    setNewAccName("");
    setNewAccBalance("");
  };

  const addPreset = (preset: { name: string; color: string }) => {
    setAccounts((prev) => [
      ...prev,
      {
        id: generateId(),
        name: preset.name,
        initialBalance: "",
        color: preset.color,
        owner: "A",
      },
    ]);
  };

  const removeAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const updateAccount = (id: string, field: keyof AccountForm, value: string) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const handleFinish = () => {
    // Build account label with owner name
    const finalAccounts: Account[] = accounts.map((a) => {
      let label = a.name;
      if (a.owner === "A") label = `${a.name} ${persons[0].name}`;
      else if (a.owner === "B") label = `${a.name} ${persons[1].name}`;
      return {
        id: a.id,
        name: label,
        initialBalance: parseFloat(a.initialBalance) || 0,
        color: a.color,
      };
    });

    dispatch({ type: "ADD_ACCOUNT", account: finalAccounts[0] }); // trigger via bulk
    // Use SET approach — replace all accounts
    dispatch({
      type: "LOAD",
      data: {
        transactions: [],
        accounts: finalAccounts,
        budgetRule: { mode: "503020", needs: 50, wants: 30, savings: 20 },
        goals: [],
        categoryRules: [],
        darkMode: true,
        lastBackup: null,
        onboardingDone: true,
      } as any,
    });

    router.push("/");
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      {/* Progress bar */}
      <div className="h-1 w-full" style={{ background: "var(--surface-3)" }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${(step / 3) * 100}%`,
            background: "var(--green)",
          }}
        />
      </div>

      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6 py-8">

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {([1, 2, 3] as Step[]).map((s) => (
            <React.Fragment key={s}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: step >= s ? "var(--green)" : "var(--surface-2)",
                  color: step >= s ? "#0a0d14" : "var(--text-3)",
                }}
              >
                {step > s ? <Check size={13} /> : s}
              </div>
              {s < 3 && (
                <div
                  className="flex-1 h-0.5 transition-all"
                  style={{ background: step > s ? "var(--green)" : "var(--surface-3)" }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Step 1 : Prénoms ── */}
        {step === 1 && (
          <div className="flex-1 flex flex-col fade-up">
            <div className="mb-8">
              <p
                className="text-3xl font-bold mb-2"
                style={{ fontFamily: "'Syne', sans-serif", color: "var(--text)" }}
              >
                Bienvenue sur<br />
                <span style={{ color: "var(--green)" }}>EconoMind</span> 👋
              </p>
              <p className="text-sm" style={{ color: "var(--text-2)" }}>
                Commençons par vous présenter. Ces prénoms seront utilisés pour nommer vos comptes.
              </p>
            </div>

            <div className="space-y-4 flex-1">
              {([0, 1] as const).map((i) => (
                <div key={i}>
                  <label className="label">
                    {i === 0 ? "👤 Prénom — Personne 1" : "👤 Prénom — Personne 2"}
                  </label>
                  <input
                    type="text"
                    className="input text-base"
                    placeholder={i === 0 ? "ex: Aurélien" : "ex: Alice"}
                    value={persons[i].name}
                    onChange={(e) => {
                      const updated = [...persons] as [PersonForm, PersonForm];
                      updated[i] = { name: e.target.value };
                      setPersons(updated);
                    }}
                    autoFocus={i === 0}
                  />
                </div>
              ))}

              <div
                className="rounded-xl p-4 mt-4"
                style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)" }}
              >
                <p className="text-xs" style={{ color: "var(--text-2)" }}>
                  🔒 Toutes vos données restent <strong>100% locales</strong> sur votre appareil. Aucun serveur, aucun compte requis.
                </p>
              </div>
            </div>

            <button
              className="btn-primary w-full justify-center mt-6 py-3 text-base"
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              style={{ opacity: canProceedStep1 ? 1 : 0.4 }}
            >
              Continuer
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* ── Step 2 : Comptes ── */}
        {step === 2 && (
          <div className="flex-1 flex flex-col fade-up">
            <div className="mb-6">
              <p
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Vos comptes 💳
              </p>
              <p className="text-sm" style={{ color: "var(--text-2)" }}>
                Ajoutez vos comptes bancaires et leur solde actuel. Vous pourrez en ajouter d'autres plus tard.
              </p>
            </div>

            {/* Presets */}
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-3)" }}>
                Ajouter rapidement
              </p>
              <div className="flex flex-wrap gap-2">
                {ACCOUNT_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => addPreset(p)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}30` }}
                  >
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Account list */}
            <div className="flex-1 space-y-2 overflow-y-auto max-h-64 pr-1 mb-4">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="rounded-xl p-3 flex items-center gap-3"
                  style={{ background: "var(--surface)" }}
                >
                  <div
                    className="w-8 h-8 rounded-lg shrink-0"
                    style={{ background: `${acc.color}25` }}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <Wallet size={14} style={{ color: acc.color }} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                    <input
                      className="input py-1.5 text-xs"
                      value={acc.name}
                      onChange={(e) => updateAccount(acc.id, "name", e.target.value)}
                      placeholder="Nom du compte"
                    />
                    <input
                      className="input py-1.5 text-xs"
                      type="number"
                      value={acc.initialBalance}
                      onChange={(e) => updateAccount(acc.id, "initialBalance", e.target.value)}
                      placeholder="Solde (€)"
                    />
                  </div>
                  {/* Owner selector */}
                  <select
                    className="text-xs rounded-lg px-2 py-1.5 shrink-0"
                    style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "none" }}
                    value={acc.owner}
                    onChange={(e) => updateAccount(acc.id, "owner", e.target.value)}
                  >
                    <option value="A">{nameA}</option>
                    <option value="B">{nameB}</option>
                    <option value="joint">Joint</option>
                  </select>
                  <button
                    onClick={() => removeAccount(acc.id)}
                    className="p-1.5 rounded-lg shrink-0"
                    style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add custom account */}
            <div
              className="rounded-xl p-3 space-y-2"
              style={{ background: "var(--surface-2)" }}
            >
              <p className="text-xs font-semibold" style={{ color: "var(--text-3)" }}>Compte personnalisé</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input py-2 text-xs"
                  placeholder="Nom du compte"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                />
                <input
                  className="input py-2 text-xs"
                  type="number"
                  placeholder="Solde initial (€)"
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 flex-wrap flex-1">
                  {ACCOUNT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewAccColor(c)}
                      className="w-5 h-5 rounded-full transition-all"
                      style={{
                        background: c,
                        outline: newAccColor === c ? `2px solid ${c}` : "none",
                        outlineOffset: "2px",
                      }}
                    />
                  ))}
                </div>
                <button
                  className="btn-primary px-3 py-2 text-xs shrink-0"
                  onClick={addAccount}
                  disabled={!newAccName.trim()}
                  style={{ opacity: newAccName.trim() ? 1 : 0.4 }}
                >
                  <Plus size={13} />
                  Ajouter
                </button>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button className="btn-ghost px-3" onClick={() => setStep(1)}>
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn-primary flex-1 justify-center py-3 text-base"
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
                style={{ opacity: canProceedStep2 ? 1 : 0.4 }}
              >
                Continuer
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3 : Récap & confirmation ── */}
        {step === 3 && (
          <div className="flex-1 flex flex-col fade-up">
            <div className="mb-6">
              <p
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Tout est prêt ! 🎉
              </p>
              <p className="text-sm" style={{ color: "var(--text-2)" }}>
                Voici un résumé de votre configuration. Vous pourrez tout modifier à tout moment.
              </p>
            </div>

            {/* Recap */}
            <div className="space-y-3 flex-1">
              {/* Persons */}
              <div className="card">
                <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--text-3)" }}>
                  Utilisateurs
                </p>
                <div className="flex gap-4">
                  {persons.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ background: i === 0 ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.15)", color: i === 0 ? "var(--green)" : "var(--blue)" }}
                      >
                        {p.name[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accounts recap */}
              <div className="card">
                <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--text-3)" }}>
                  {accounts.length} compte{accounts.length > 1 ? "s" : ""}
                </p>
                <div className="space-y-2">
                  {accounts.map((acc) => {
                    const ownerName = acc.owner === "joint" ? "Joint" : acc.owner === "A" ? persons[0].name : persons[1].name;
                    return (
                      <div key={acc.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: acc.color }} />
                          <span className="text-sm" style={{ color: "var(--text)" }}>
                            {acc.name} <span style={{ color: "var(--text-3)" }}>({ownerName})</span>
                          </span>
                        </div>
                        <span className="text-sm font-mono font-semibold" style={{ color: "var(--text-2)" }}>
                          {acc.initialBalance ? `${parseFloat(acc.initialBalance).toLocaleString("fr-FR")} €` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Budget info */}
              <div className="card">
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--text-3)" }}>
                  Règle budgétaire
                </p>
                <p className="text-sm" style={{ color: "var(--text-2)" }}>
                  Méthode <strong style={{ color: "var(--green)" }}>50/30/20</strong> — modifiable dans Analyse
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button className="btn-ghost px-3" onClick={() => setStep(2)}>
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn-primary flex-1 justify-center py-3 text-base"
                onClick={handleFinish}
              >
                <Check size={18} />
                Démarrer EconoMind
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
