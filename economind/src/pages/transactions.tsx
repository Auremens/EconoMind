"use client";
import React, { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { useApp } from "@/context/AppContext";
import {
  Transaction, DEFAULT_CATEGORIES, generateId,
  isTransferCategory, TRANSFER_CATEGORIES,
} from "@/lib/store";
import { formatEur, autoCategory } from "@/lib/analytics";
import { Plus, Search, X, Edit2, Trash2, Check, ArrowLeftRight } from "lucide-react";

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  label: "",
  amount: "",
  category: "Autre",
  account: "",
  toAccount: "",  // destination for internal transfers
  type: "expense" as "income" | "expense" | "transfer",
};

const EXPENSE_INCOME_CATEGORIES = DEFAULT_CATEGORIES.filter(
  (c) => !TRANSFER_CATEGORIES.includes(c)
);

export default function Transactions() {
  const { data, addTransaction, updateTransaction, deleteTransaction, dispatch } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const accountNames = useMemo(() => data.accounts.map((a) => a.name), [data.accounts]);

  const handleLabelChange = (label: string) => {
    const cat = autoCategory(label, data.categoryRules);
    setForm((f) => ({
      ...f,
      label,
      category: cat !== "Autre" ? cat : f.category,
      type: TRANSFER_CATEGORIES.includes(cat) ? "transfer" : f.type,
    }));
  };

  const handleCategoryChange = (category: string) => {
    setForm((f) => ({
      ...f,
      category,
      type: TRANSFER_CATEGORIES.includes(category)
        ? "transfer"
        : f.type === "transfer" ? "expense" : f.type,
    }));
  };

  const handleSubmit = () => {
    if (!form.label || !form.amount || !form.account) return;
    const absAmount = Math.abs(parseFloat(form.amount));

    if (form.type === "transfer") {
      // ── Internal transfer: create TWO transactions ──
      const now = Date.now();
      const label = form.toAccount
        ? `${form.label} → ${shortName(form.toAccount)}`
        : form.label;
      const labelTo = form.toAccount
        ? `${form.label} ← ${shortName(form.account)}`
        : form.label;

      // Debit on source account
      addTransaction({
        date: form.date,
        label,
        amount: -absAmount,
        category: form.category,
        account: form.account,
        source: "manual",
      });

      // Credit on destination account (if selected)
      if (form.toAccount && form.toAccount !== form.account) {
        addTransaction({
          date: form.date,
          label: labelTo,
          amount: absAmount,
          category: form.category,
          account: form.toAccount,
          source: "manual",
        });
      }
    } else if (editId) {
      const existing = data.transactions.find((t) => t.id === editId)!;
      const amount = form.type === "expense" ? -absAmount : absAmount;
      updateTransaction({ ...existing, ...form, amount });
      setEditId(null);
    } else {
      const amount = form.type === "expense" ? -absAmount : absAmount;
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
    const isTransfer = isTransferCategory(tx.category);
    setForm({
      date: tx.date,
      label: tx.label,
      amount: Math.abs(tx.amount).toString(),
      category: tx.category,
      account: tx.account,
      toAccount: "",
      type: isTransfer ? "transfer" : tx.amount >= 0 ? "income" : "expense",
    });
    setEditId(tx.id);
    setShowForm(true);
  };

  const filtered = useMemo(() => {
    return data.transactions.filter((t) => {
      if (filterAccount !== "all" && t.account !== filterAccount) return false;
      if (filterType === "income" && (t.amount < 0 || isTransferCategory(t.category))) return false;
      if (filterType === "expense" && (t.amount > 0 || isTransferCategory(t.category))) return false;
      if (filterType === "transfer" && !isTransferCategory(t.category)) return false;
      if (search && !t.label.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data.transactions, filterAccount, filterType, search]);

  const counts = useMemo(() => ({
    income:   data.transactions.filter(t => t.amount > 0 && !isTransferCategory(t.category)).length,
    expense:  data.transactions.filter(t => t.amount < 0 && !isTransferCategory(t.category)).length,
    transfer: data.transactions.filter(t => isTransferCategory(t.category)).length,
  }), [data.transactions]);

  // Group filtered transactions by month
  const groupedByMonth = useMemo(() => {
    const groups: { month: string; label: string; transactions: Transaction[]; income: number; expenses: number }[] = [];
    const seen = new Map<string, number>();
    for (const tx of filtered) {
      const month = tx.date.slice(0, 7);
      if (!seen.has(month)) {
        const [y, m] = month.split("-");
        const label = new Date(parseInt(y), parseInt(m) - 1, 1)
          .toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
        seen.set(month, groups.length);
        groups.push({ month, label, transactions: [], income: 0, expenses: 0 });
      }
      const idx = seen.get(month)!;
      groups[idx].transactions.push(tx);
      if (!isTransferCategory(tx.category)) {
        if (tx.amount > 0) groups[idx].income += tx.amount;
        else groups[idx].expenses += Math.abs(tx.amount);
      }
    }
    return groups;
  }, [filtered]);

  // Accounts available as destination (exclude source)
  const toAccounts = accountNames.filter(a => a !== form.account);

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
          <button className="btn-primary"
            onClick={() => { setEditId(null); setForm(EMPTY_FORM); setShowForm(!showForm); }}>
            <Plus size={16} /> Ajouter
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="card fade-up space-y-3">
            <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
              {editId ? "Modifier" : "Nouvelle transaction"}
            </p>

            {/* Type toggle */}
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: "expense",  label: "💸 Dépense",  color: "var(--red)" },
                { id: "income",   label: "💰 Revenu",   color: "var(--green)" },
                { id: "transfer", label: "↔️ Virement", color: "var(--blue)" },
              ] as const).map(({ id, label, color }) => (
                <button key={id}
                  onClick={() => setForm((f) => ({
                    ...f, type: id,
                    category: id === "transfer"
                      ? "Virement interne"
                      : isTransferCategory(f.category) ? "Autre" : f.category,
                    toAccount: id !== "transfer" ? "" : f.toAccount,
                  }))}
                  className="py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: form.type === id ? `${color}20` : "var(--surface-2)",
                    color: form.type === id ? color : "var(--text-3)",
                    border: form.type === id ? `1px solid ${color}50` : "1px solid transparent",
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Transfer: from → to */}
            {form.type === "transfer" ? (
              <>
                <div
                  className="rounded-xl px-3 py-2 text-xs flex items-center gap-2"
                  style={{ background: "rgba(96,165,250,0.08)", color: "var(--blue)" }}
                >
                  <ArrowLeftRight size={13} />
                  Ce montant ne comptera pas comme une dépense dans tes stats.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Date</label>
                    <input type="date" className="input" value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Montant (€)</label>
                    <input type="number" className="input" placeholder="0.00" value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      min="0" step="0.01" />
                  </div>
                </div>

                <div>
                  <label className="label">Libellé</label>
                  <input type="text" className="input"
                    placeholder="ex: Épargne PEA, Virement joint..."
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
                </div>

                {/* From → To avec flèche visuelle */}
                <div>
                  <label className="label">Compte source → destination</label>
                  <div className="flex items-center gap-2">
                    <select className="input flex-1" value={form.account}
                      onChange={(e) => setForm((f) => ({ ...f, account: e.target.value, toAccount: "" }))}>
                      <option value="">Compte source</option>
                      {accountNames.map((a) => <option key={a} value={a}>{shortName(a)}</option>)}
                    </select>
                    <div className="shrink-0 text-lg" style={{ color: "var(--blue)" }}>→</div>
                    <select className="input flex-1" value={form.toAccount}
                      onChange={(e) => setForm((f) => ({ ...f, toAccount: e.target.value }))}>
                      <option value="">Compte destination</option>
                      {toAccounts.map((a) => <option key={a} value={a}>{shortName(a)}</option>)}
                    </select>
                  </div>
                  {form.account && form.toAccount && (
                    <p className="text-[10px] mt-1.5 px-1" style={{ color: "var(--text-3)" }}>
                      ✅ Créera 2 transactions : débit sur <strong>{shortName(form.account)}</strong> et crédit sur <strong>{shortName(form.toAccount)}</strong>
                    </p>
                  )}
                  {form.account && !form.toAccount && (
                    <p className="text-[10px] mt-1.5 px-1" style={{ color: "var(--text-3)" }}>
                      Sans destination = 1 seule transaction (virement externe ou épargne hors-app)
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Catégorie</label>
                  <select className="input" value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                    {TRANSFER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>
            ) : (
              /* Normal expense/income form */
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Date</label>
                    <input type="date" className="input" value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Montant (€)</label>
                    <input type="number" className="input" placeholder="0.00" value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      min="0" step="0.01" />
                  </div>
                </div>

                <div>
                  <label className="label">Libellé</label>
                  <input type="text" className="input" placeholder="ex: Carrefour courses"
                    value={form.label}
                    onChange={(e) => handleLabelChange(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Catégorie</label>
                    <select className="input" value={form.category}
                      onChange={(e) => handleCategoryChange(e.target.value)}>
                      <optgroup label="Dépenses / Revenus">
                        {EXPENSE_INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                      <optgroup label="Virements internes">
                        {TRANSFER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="label">Compte</label>
                    <select className="input" value={form.account}
                      onChange={(e) => setForm((f) => ({ ...f, account: e.target.value }))}>
                      <option value="">Sélectionner</option>
                      {accountNames.map((a) => <option key={a} value={a}>{shortName(a)}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={handleSubmit}
                disabled={!form.label || !form.amount || !form.account}>
                <Check size={15} /> {editId ? "Modifier" : "Ajouter"}
              </button>
              <button className="btn-ghost px-3"
                onClick={() => { setShowForm(false); setEditId(null); }}>
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-3)" }} />
          <input type="text" className="input pl-9" placeholder="Rechercher..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { key: "all",      label: "Tous" },
            { key: "income",   label: `💰 Revenus (${counts.income})` },
            { key: "expense",  label: `💸 Dépenses (${counts.expense})` },
            { key: "transfer", label: `↔️ Virements (${counts.transfer})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilterType(key)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: filterType === key ? "var(--green)" : "var(--surface-2)",
                color: filterType === key ? "#0a0d14" : "var(--text-2)",
              }}>
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
            {accountNames.map((a) => <option key={a} value={a}>{shortName(a)}</option>)}
          </select>
        </div>

        {/* List grouped by month */}
        <div className="space-y-4 pb-4">
          {groupedByMonth.length === 0 ? (
            <div className="text-center py-12" style={{ color: "var(--text-3)" }}>
              <p className="text-4xl mb-2">🔍</p>
              <p className="text-sm">Aucune transaction trouvée</p>
            </div>
          ) : groupedByMonth.map((group) => (
            <div key={group.month}>
              {/* Month header */}
              <div className="flex items-center justify-between px-1 mb-2">
                <p className="text-xs font-bold uppercase tracking-wider capitalize"
                  style={{ color: "var(--text-2)" }}>
                  {group.label}
                </p>
                <div className="flex items-center gap-3 text-xs font-mono">
                  {group.income > 0 && (
                    <span style={{ color: "var(--green)" }}>+{formatEur(group.income)}</span>
                  )}
                  {group.expenses > 0 && (
                    <span style={{ color: "var(--red)" }}>-{formatEur(group.expenses)}</span>
                  )}
                  <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                    {group.transactions.length} op.
                  </span>
                </div>
              </div>
              {/* Transactions */}
              <div className="space-y-1.5">
                {group.transactions.map((tx) => (
                  <TxRow key={tx.id} tx={tx}
                    onEdit={() => startEdit(tx)}
                    onDelete={() => deleteTransaction(tx.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortName(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 14);
  const two = words.slice(0, 2).join(" ");
  return two.length > 16 ? words[0].slice(0, 14) : two;
}

function TxRow({ tx, onEdit, onDelete }: {
  tx: Transaction; onEdit: () => void; onDelete: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const isTransfer = isTransferCategory(tx.category);
  const isIncome = tx.amount > 0 && !isTransfer;

  const icon = isTransfer ? "↔️" : isIncome ? "💰" : "💸";
  const bgColor = isTransfer
    ? "rgba(96,165,250,0.1)"
    : isIncome ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)";
  const amtColor = isTransfer ? "var(--blue)"
    : isIncome ? "var(--green)" : "var(--red)";

  return (
    <div
      className="rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-all"
      style={{ background: "var(--surface)" }}
      onClick={() => setShowActions(!showActions)}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm"
        style={{ background: bgColor }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{tx.label}</p>
        <p className="text-xs" style={{ color: "var(--text-3)" }}>
          {tx.date} · {tx.category} · {shortName(tx.account)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold font-num" style={{ color: amtColor }}>
          {isIncome ? "+" : ""}{formatEur(tx.amount)}
        </p>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ background: "var(--surface-2)", color: "var(--text-3)" }}>
          {tx.source}
        </span>
      </div>
      {showActions && (
        <div className="flex gap-1 ml-1">
          <button className="p-1.5 rounded-lg"
            style={{ background: "var(--surface-2)", color: "var(--blue)" }}
            onClick={(e) => { e.stopPropagation(); onEdit(); setShowActions(false); }}>
            <Edit2 size={13} />
          </button>
          <button className="p-1.5 rounded-lg"
            style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)" }}
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Supprimer cette transaction ?")) onDelete();
            }}>
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
