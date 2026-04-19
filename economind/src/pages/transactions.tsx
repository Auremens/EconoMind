"use client";
import React, { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { useApp } from "@/context/AppContext";
import { Transaction, DEFAULT_CATEGORIES, generateId } from "@/lib/store";
import { formatEur, autoCategory } from "@/lib/analytics";
import { Plus, Search, X, Edit2, Trash2, Check } from "lucide-react";

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  label: "",
  amount: "",
  category: "Autre",
  account: "",
  type: "expense" as "income" | "expense",
};

export default function Transactions() {
  const { data, addTransaction, updateTransaction, deleteTransaction } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const accountNames = useMemo(
    () => data.accounts.map((a) => a.name),
    [data.accounts]
  );

  // Auto-category on label change
  const handleLabelChange = (label: string) => {
    const cat = autoCategory(label, data.categoryRules);
    setForm((f) => ({ ...f, label, category: cat !== "Autre" ? cat : f.category }));
  };

  const handleSubmit = () => {
    if (!form.label || !form.amount || !form.account) return;
    const amount =
      form.type === "expense"
        ? -Math.abs(parseFloat(form.amount))
        : Math.abs(parseFloat(form.amount));

    if (editId) {
      const existing = data.transactions.find((t) => t.id === editId)!;
      updateTransaction({ ...existing, ...form, amount });
      setEditId(null);
    } else {
      addTransaction({
        date: form.date,
        label: form.label,
        amount,
        category: form.category,
        account: form.account,
        source: "manual",
      });
    }
    setForm({ ...EMPTY_FORM, account: form.account });
    setShowForm(false);
  };

  const startEdit = (tx: Transaction) => {
    setForm({
      date: tx.date,
      label: tx.label,
      amount: Math.abs(tx.amount).toString(),
      category: tx.category,
      account: tx.account,
      type: tx.amount >= 0 ? "income" : "expense",
    });
    setEditId(tx.id);
    setShowForm(true);
  };

  const filtered = useMemo(() => {
    return data.transactions.filter((t) => {
      if (filterAccount !== "all" && t.account !== filterAccount) return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      if (filterType === "income" && t.amount < 0) return false;
      if (filterType === "expense" && t.amount > 0) return false;
      if (search && !t.label.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data.transactions, filterAccount, filterCategory, filterType, search]);

  return (
    <Layout>
      <div className="px-4 pt-4 space-y-4 animate-stagger">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="section-title">Transactions</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
              {filtered.length} transaction{filtered.length > 1 ? "s" : ""}
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={() => { setEditId(null); setForm(EMPTY_FORM); setShowForm(!showForm); }}
          >
            <Plus size={16} />
            Ajouter
          </button>
        </div>

        {/* Add / Edit Form */}
        {showForm && (
          <div className="card fade-up space-y-3">
            <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
              {editId ? "Modifier la transaction" : "Nouvelle transaction"}
            </p>

            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2">
              {(["expense", "income"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setForm((f) => ({ ...f, type }))}
                  className="py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background:
                      form.type === type
                        ? type === "expense"
                          ? "rgba(239,68,68,0.15)"
                          : "rgba(34,197,94,0.15)"
                        : "var(--surface-2)",
                    color:
                      form.type === type
                        ? type === "expense"
                          ? "var(--red)"
                          : "var(--green)"
                        : "var(--text-3)",
                  }}
                >
                  {type === "expense" ? "💸 Dépense" : "💰 Revenu"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  className="input"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Montant (€)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="label">Libellé</label>
              <input
                type="text"
                className="input"
                placeholder="ex: Carrefour courses"
                value={form.label}
                onChange={(e) => handleLabelChange(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Catégorie</label>
                <select
                  className="input"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {DEFAULT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Compte</label>
                <select
                  className="input"
                  value={form.account}
                  onChange={(e) => setForm((f) => ({ ...f, account: e.target.value }))}
                >
                  <option value="">Sélectionner</option>
                  {accountNames.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={handleSubmit}>
                <Check size={15} />
                {editId ? "Modifier" : "Ajouter"}
              </button>
              <button
                className="btn-ghost px-3"
                onClick={() => { setShowForm(false); setEditId(null); }}
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
            <input
              type="text"
              className="input pl-9"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { key: "all", label: "Tous" },
              { key: "income", label: "💰 Revenus" },
              { key: "expense", label: "💸 Dépenses" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: filterType === key ? "var(--green)" : "var(--surface-2)",
                  color: filterType === key ? "#0a0d14" : "var(--text-2)",
                }}
              >
                {label}
              </button>
            ))}
            <select
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "none", outline: "none" }}
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
            >
              <option value="all">Tous comptes</option>
              {accountNames.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* Transaction list */}
        <div className="space-y-2 pb-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12" style={{ color: "var(--text-3)" }}>
              <p className="text-4xl mb-2">🔍</p>
              <p className="text-sm">Aucune transaction trouvée</p>
            </div>
          ) : (
            filtered.map((tx) => (
              <TxRow
                key={tx.id}
                tx={tx}
                onEdit={() => startEdit(tx)}
                onDelete={() => deleteTransaction(tx.id)}
              />
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}

function TxRow({
  tx,
  onEdit,
  onDelete,
}: {
  tx: Transaction;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const isIncome = tx.amount > 0;

  return (
    <div
      className="rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-all"
      style={{ background: "var(--surface)" }}
      onClick={() => setShowActions(!showActions)}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm"
        style={{
          background: isIncome ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
        }}
      >
        {isIncome ? "💰" : "💸"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
          {tx.label}
        </p>
        <p className="text-xs" style={{ color: "var(--text-3)" }}>
          {tx.date} · {tx.category} · {tx.account.split(" ").slice(-1)[0]}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p
          className="text-sm font-bold font-num"
          style={{ color: isIncome ? "var(--green)" : "var(--red)" }}
        >
          {isIncome ? "+" : ""}{formatEur(tx.amount)}
        </p>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{
            background: "var(--surface-2)",
            color: "var(--text-3)",
          }}
        >
          {tx.source}
        </span>
      </div>
      {showActions && (
        <div className="flex gap-1 ml-1">
          <button
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: "var(--surface-2)", color: "var(--blue)" }}
            onClick={(e) => { e.stopPropagation(); onEdit(); setShowActions(false); }}
          >
            <Edit2 size={13} />
          </button>
          <button
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)" }}
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Supprimer cette transaction ?")) onDelete();
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
