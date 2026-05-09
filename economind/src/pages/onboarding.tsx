"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useApp } from "@/context/AppContext";
import { Account, generateId } from "@/lib/store";
import {
  Plus, Trash2, ChevronRight, ChevronLeft,
  Check, Wallet, User, Users, UserPlus,
} from "lucide-react";

const ACCOUNT_COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#10b981",
  "#f97316", "#84cc16",
];

const PERSON_COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#10b981",
];

const ACCOUNT_PRESETS = [
  { name: "Compte courant", color: "#22c55e" },
  { name: "Livret A", color: "#3b82f6" },
  { name: "PEA", color: "#8b5cf6" },
  { name: "LEP", color: "#10b981" },
  { name: "Compte joint", color: "#f59e0b" },
  { name: "Épargne", color: "#06b6d4" },
  { name: "Compte pro", color: "#f97316" },
];

type Step = 1 | 2 | 3;

interface PersonForm {
  id: string;
  name: string;
  color: string;
}

interface AccountForm {
  id: string;
  name: string;
  initialBalance: string;
  color: string;
  ownerId: string;
}

const USAGE_MODES = [
  { id: "solo",  label: "Solo",         desc: "Je gère seul(e)",  icon: User,     count: 1 },
  { id: "duo",   label: "Duo / Couple", desc: "Deux personnes",   icon: Users,    count: 2 },
  { id: "coloc", label: "Colocation",   desc: "3 personnes ou +", icon: UserPlus, count: 3 },
] as const;

type UsageMode = typeof USAGE_MODES[number]["id"];

export default function Onboarding() {
  const router = useRouter();
  const { dispatch } = useApp();
  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<UsageMode>("duo");
  const [persons, setPersons] = useState<PersonForm[]>([
    { id: "p1", name: "", color: PERSON_COLORS[0] },
    { id: "p2", name: "", color: PERSON_COLORS[1] },
  ]);
  const [accounts, setAccounts] = useState<AccountForm[]>([]);
  const [accountsInitialized, setAccountsInitialized] = useState(false);
  const [newAccName, setNewAccName] = useState("");
  const [newAccBalance, setNewAccBalance] = useState("");
  const [newAccColor, setNewAccColor] = useState(ACCOUNT_COLORS[0]);
  const [newAccOwner, setNewAccOwner] = useState("p1");

  useEffect(() => {
    const target = USAGE_MODES.find((m) => m.id === mode)!.count;
    setPersons((prev) => {
      if (prev.length === target) return prev;
      if (prev.length < target) {
        const added: PersonForm[] = Array.from(
          { length: target - prev.length },
          (_, i) => ({
            id: `p${prev.length + i + 1}`,
            name: "",
            color: PERSON_COLORS[(prev.length + i) % PERSON_COLORS.length],
          })
        );
        return [...prev, ...added];
      }
      return prev.slice(0, target);
    });
    setAccounts([]);
    setAccountsInitialized(false);
  }, [mode]);

  useEffect(() => {
    if (step === 2 && !accountsInitialized) {
      const defaultAccs: AccountForm[] = persons.map((p) => ({
        id: generateId(),
        name: "Compte courant",
        initialBalance: "",
        color: p.color,
        ownerId: p.id,
      }));
      if (mode !== "solo") {
        defaultAccs.push({
          id: generateId(),
          name: "Compte joint",
          initialBalance: "",
          color: "#f59e0b",
          ownerId: "joint",
        });
      }
      setAccounts(defaultAccs);
      setAccountsInitialized(true);
      setNewAccOwner(persons[0]?.id || "p1");
    }
  }, [step, accountsInitialized, persons, mode]);

  const canProceedStep1 = persons.every((p) => p.name.trim().length > 0);
  const canProceedStep2 = accounts.length > 0;

  const addPerson = () => {
    const idx = persons.length;
    const newId = `px-${Date.now()}`;
    setPersons((prev) => [
      ...prev,
      { id: newId, name: "", color: PERSON_COLORS[idx % PERSON_COLORS.length] },
    ]);
    if (mode !== "coloc") setMode("coloc");
  };

  const removePerson = (id: string) => {
    if (persons.length <= 1) return;
    setPersons((prev) => prev.filter((p) => p.id !== id));
    setAccounts((prev) => prev.filter((a) => a.ownerId !== id));
  };

  const updatePerson = (id: string, name: string) =>
    setPersons((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));

  const addAccount = () => {
    if (!newAccName.trim()) return;
    setAccounts((prev) => [
      ...prev,
      { id: generateId(), name: newAccName.trim(), initialBalance: newAccBalance, color: newAccColor, ownerId: newAccOwner },
    ]);
    setNewAccName("");
    setNewAccBalance("");
  };

  const addPreset = (preset: { name: string; color: string }) =>
    setAccounts((prev) => [
      ...prev,
      { id: generateId(), name: preset.name, initialBalance: "", color: preset.color, ownerId: persons[0]?.id || "p1" },
    ]);

  const removeAccount = (id: string) =>
    setAccounts((prev) => prev.filter((a) => a.id !== id));

  const updateAccount = (id: string, field: keyof AccountForm, value: string) =>
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));

  const getOwnerLabel = (ownerId: string) => {
    if (ownerId === "joint") return "Joint";
    return persons.find((p) => p.id === ownerId)?.name || "?";
  };

  const handleFinish = () => {
    const finalAccounts: Account[] = accounts.map((a) => ({
      id: a.id,
      name: a.ownerId === "joint" ? a.name : `${a.name} ${getOwnerLabel(a.ownerId)}`,
      initialBalance: parseFloat(a.initialBalance) || 0,
      color: a.color,
    }));
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
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="h-1 w-full" style={{ background: "var(--surface-3)" }}>
        <div className="h-full transition-all duration-500" style={{ width: `${(step / 3) * 100}%`, background: "var(--green)" }} />
      </div>

      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6 py-8">

        {/* Step dots */}
        <div className="flex items-center gap-2 mb-8">
          {([1, 2, 3] as Step[]).map((s) => (
            <React.Fragment key={s}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{ background: step >= s ? "var(--green)" : "var(--surface-2)", color: step >= s ? "#0a0d14" : "var(--text-3)" }}>
                {step > s ? <Check size={13} /> : s}
              </div>
              {s < 3 && <div className="flex-1 h-0.5 transition-all" style={{ background: step > s ? "var(--green)" : "var(--surface-3)" }} />}
            </React.Fragment>
          ))}
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="flex-1 flex flex-col fade-up">
            <div className="mb-6">
              <p className="text-3xl font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
                Bienvenue sur<br /><span style={{ color: "var(--green)" }}>EconoMind</span> 👋
              </p>
              <p className="text-sm" style={{ color: "var(--text-2)" }}>Configurons votre profil en 3 étapes.</p>
            </div>

            {/* Mode selector */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {USAGE_MODES.map(({ id, label, desc, icon: Icon }) => (
                <button key={id} onClick={() => setMode(id)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
                  style={{
                    background: mode === id ? "rgba(34,197,94,0.12)" : "var(--surface-2)",
                    border: mode === id ? "1.5px solid rgba(34,197,94,0.4)" : "1.5px solid transparent",
                    color: mode === id ? "var(--green)" : "var(--text-2)",
                  }}>
                  <Icon size={20} />
                  <span className="text-xs font-bold">{label}</span>
                  <span className="text-[10px] text-center" style={{ color: "var(--text-3)" }}>{desc}</span>
                </button>
              ))}
            </div>

            {/* Person inputs */}
            <div className="flex-1 space-y-3">
              {persons.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{ background: `${p.color}20`, color: p.color }}>
                    {p.name[0]?.toUpperCase() || (i + 1)}
                  </div>
                  <input type="text" className="input flex-1"
                    placeholder={mode === "solo" ? "Votre prénom" : mode === "duo" ? `Prénom ${i + 1}` : `Colocataire ${i + 1}`}
                    value={p.name}
                    onChange={(e) => updatePerson(p.id, e.target.value)}
                    autoFocus={i === 0}
                  />
                  {persons.length > 1 && (
                    <button onClick={() => removePerson(p.id)} className="p-1.5 rounded-lg shrink-0"
                      style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)" }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}

              <button onClick={addPerson}
                className="flex items-center gap-2 w-full py-2.5 px-3 rounded-xl text-sm transition-all"
                style={{ background: "var(--surface-2)", color: "var(--text-3)", border: "1.5px dashed var(--border)" }}>
                <UserPlus size={15} /> Ajouter une personne
              </button>

              <div className="rounded-xl p-3" style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <p className="text-xs" style={{ color: "var(--text-2)" }}>
                  🔒 Données <strong>100% locales</strong>. Aucun serveur, aucun compte requis.
                </p>
              </div>
            </div>

            <button className="btn-primary w-full justify-center mt-5 py-3 text-base"
              onClick={() => setStep(2)} disabled={!canProceedStep1} style={{ opacity: canProceedStep1 ? 1 : 0.4 }}>
              Continuer <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="flex-1 flex flex-col fade-up">
            <div className="mb-5">
              <p className="text-2xl font-bold mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>Vos comptes 💳</p>
              <p className="text-sm" style={{ color: "var(--text-2)" }}>Ajoutez vos comptes et leur solde actuel.</p>
            </div>

            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-3)" }}>Ajouter rapidement</p>
              <div className="flex flex-wrap gap-1.5">
                {ACCOUNT_PRESETS.map((p) => (
                  <button key={p.name} onClick={() => addPreset(p)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}30` }}>
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-52 pr-1 mb-3">
              {accounts.length === 0 ? (
                <div className="text-center py-6" style={{ color: "var(--text-3)" }}>
                  <Wallet size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Utilisez les raccourcis ou ajoutez manuellement</p>
                </div>
              ) : accounts.map((acc) => (
                <div key={acc.id} className="rounded-xl p-2.5 flex items-center gap-2" style={{ background: "var(--surface)" }}>
                  <div className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center" style={{ background: `${acc.color}25` }}>
                    <Wallet size={11} style={{ color: acc.color }} />
                  </div>
                  <input className="input py-1 text-xs flex-1 min-w-0" value={acc.name}
                    onChange={(e) => updateAccount(acc.id, "name", e.target.value)} />
                  <input className="input py-1 text-xs w-20 shrink-0" type="number"
                    value={acc.initialBalance} onChange={(e) => updateAccount(acc.id, "initialBalance", e.target.value)}
                    placeholder="Solde €" />
                  {persons.length > 1 && (
                    <select className="text-xs rounded-lg px-1.5 py-1 shrink-0"
                      style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "none", outline: "none" }}
                      value={acc.ownerId} onChange={(e) => updateAccount(acc.id, "ownerId", e.target.value)}>
                      {persons.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      <option value="joint">Joint</option>
                    </select>
                  )}
                  <button onClick={() => removeAccount(acc.id)} className="p-1.5 rounded-lg shrink-0"
                    style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)" }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>

            <div className="rounded-xl p-3 space-y-2" style={{ background: "var(--surface-2)" }}>
              <p className="text-xs font-semibold" style={{ color: "var(--text-3)" }}>Compte personnalisé</p>
              <div className="grid grid-cols-2 gap-2">
                <input className="input py-2 text-xs" placeholder="Nom" value={newAccName} onChange={(e) => setNewAccName(e.target.value)} />
                <input className="input py-2 text-xs" type="number" placeholder="Solde (€)" value={newAccBalance} onChange={(e) => setNewAccBalance(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {persons.length > 1 && (
                  <select className="text-xs rounded-lg px-2 py-1.5 shrink-0"
                    style={{ background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                    value={newAccOwner} onChange={(e) => setNewAccOwner(e.target.value)}>
                    {persons.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    <option value="joint">Joint</option>
                  </select>
                )}
                {ACCOUNT_COLORS.slice(0, 6).map((c) => (
                  <button key={c} onClick={() => setNewAccColor(c)} className="w-5 h-5 rounded-full shrink-0 transition-all"
                    style={{ background: c, outline: newAccColor === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }} />
                ))}
                <button className="btn-primary px-3 py-2 text-xs shrink-0 ml-auto" onClick={addAccount}
                  disabled={!newAccName.trim()} style={{ opacity: newAccName.trim() ? 1 : 0.4 }}>
                  <Plus size={13} /> Ajouter
                </button>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button className="btn-ghost px-3" onClick={() => setStep(1)}><ChevronLeft size={16} /></button>
              <button className="btn-primary flex-1 justify-center py-3 text-base" onClick={() => setStep(3)}
                disabled={!canProceedStep2} style={{ opacity: canProceedStep2 ? 1 : 0.4 }}>
                Continuer <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div className="flex-1 flex flex-col fade-up">
            <div className="mb-6">
              <p className="text-2xl font-bold mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>Tout est prêt ! 🎉</p>
              <p className="text-sm" style={{ color: "var(--text-2)" }}>Voici votre configuration. Tout est modifiable ensuite.</p>
            </div>

            <div className="space-y-3 flex-1">
              <div className="card">
                <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--text-3)" }}>
                  {persons.length === 1 ? "Utilisateur" : `${persons.length} personnes`}
                </p>
                <div className="flex flex-wrap gap-3">
                  {persons.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ background: `${p.color}20`, color: p.color }}>
                        {p.name[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--text-3)" }}>
                  {accounts.length} compte{accounts.length > 1 ? "s" : ""}
                </p>
                <div className="space-y-2">
                  {accounts.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: acc.color }} />
                        <span className="text-sm" style={{ color: "var(--text)" }}>
                          {acc.name}
                          {persons.length > 1 && <span style={{ color: "var(--text-3)" }}> ({getOwnerLabel(acc.ownerId)})</span>}
                        </span>
                      </div>
                      <span className="text-xs font-mono" style={{ color: "var(--text-2)" }}>
                        {acc.initialBalance ? `${parseFloat(acc.initialBalance).toLocaleString("fr-FR")} €` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--text-3)" }}>Budget</p>
                <p className="text-sm" style={{ color: "var(--text-2)" }}>
                  Méthode <strong style={{ color: "var(--green)" }}>50/30/20</strong> — modifiable dans Analyse
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button className="btn-ghost px-3" onClick={() => setStep(2)}><ChevronLeft size={16} /></button>
              <button className="btn-primary flex-1 justify-center py-3 text-base" onClick={handleFinish}>
                <Check size={18} /> Démarrer EconoMind
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
