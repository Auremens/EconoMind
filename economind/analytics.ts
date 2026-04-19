import { Transaction, CategoryRule, DEFAULT_CATEGORIES } from "./store";

// ─── Auto-categorisation ──────────────────────────────────────────────────────

export function autoCategory(label: string, rules: CategoryRule[]): string {
  const lower = label.toLowerCase();
  // User-learned rules first
  for (const rule of rules) {
    if (lower.includes(rule.keyword.toLowerCase())) {
      return rule.category;
    }
  }
  return "Autre";
}

export function learnCategory(
  label: string,
  category: string,
  rules: CategoryRule[]
): CategoryRule[] {
  // Extract meaningful keyword (first 2 words)
  const keyword = label.toLowerCase().split(/\s+/).slice(0, 2).join(" ");
  const existing = rules.findIndex(
    (r) => r.keyword.toLowerCase() === keyword
  );
  if (existing >= 0) {
    const updated = [...rules];
    updated[existing] = { keyword, category };
    return updated;
  }
  return [{ keyword, category }, ...rules];
}

// ─── Deduplication ────────────────────────────────────────────────────────────

type DuplicateLevel = "auto" | "ask" | "ignore";

export interface DuplicateResult {
  level: DuplicateLevel;
  existing: Transaction;
  incoming: Transaction;
}

function daysDiff(a: string, b: string): number {
  return Math.abs(
    (new Date(a).getTime() - new Date(b).getTime()) / 86400000
  );
}

function amountDiff(a: number, b: number): number {
  return Math.abs(a - b);
}

function labelSimilarity(a: string, b: string): number {
  const na = a.toLowerCase().replace(/\s+/g, "");
  const nb = b.toLowerCase().replace(/\s+/g, "");
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  // Bigram similarity
  const bigrams = (s: string) =>
    Array.from({ length: s.length - 1 }, (_, i) => s.slice(i, i + 2));
  const bg1 = new Set(bigrams(na));
  const bg2 = new Set(bigrams(nb));
  const intersection = Array.from(bg1).filter((x) => bg2.has(x)).length;
  return (2 * intersection) / (bg1.size + bg2.size) || 0;
}

type SourcePriority = { [key: string]: number };
const SOURCE_PRIORITY: SourcePriority = { csv: 3, pdf: 2, manual: 1 };

export function detectDuplicates(
  incoming: Transaction[],
  existing: Transaction[]
): { toAdd: Transaction[]; duplicates: DuplicateResult[] } {
  const toAdd: Transaction[] = [];
  const duplicates: DuplicateResult[] = [];

  for (const inc of incoming) {
    let found = false;
    for (const ex of existing) {
      const dDays = daysDiff(inc.date, ex.date);
      const dAmount = amountDiff(inc.amount, ex.amount);
      const similarity = labelSimilarity(inc.label, ex.label);

      if (dDays <= 3 && dAmount <= 2 && similarity > 0.6) {
        const incPriority = SOURCE_PRIORITY[inc.source] || 1;
        const exPriority = SOURCE_PRIORITY[ex.source] || 1;

        if (similarity > 0.9 && dDays === 0 && dAmount === 0) {
          // Perfect match → auto merge (keep higher priority)
          duplicates.push({
            level: "auto",
            existing: ex,
            incoming: incPriority > exPriority ? inc : ex,
          });
        } else if (similarity > 0.7) {
          duplicates.push({ level: "ask", existing: ex, incoming: inc });
        }
        // else ignore (low similarity with close amount/date)
        found = true;
        break;
      }
    }
    if (!found) toAdd.push(inc);
  }

  return { toAdd, duplicates };
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface MonthStats {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
  byCategory: { [cat: string]: number };
  byAccount: { [acc: string]: number };
}

export function computeMonthStats(
  transactions: Transaction[],
  month: string
): MonthStats {
  const filtered = transactions.filter((t) => t.date.startsWith(month));
  let income = 0;
  let expenses = 0;
  const byCategory: { [cat: string]: number } = {};
  const byAccount: { [acc: string]: number } = {};

  for (const t of filtered) {
    if (t.amount > 0) income += t.amount;
    else expenses += Math.abs(t.amount);

    const cat = t.category;
    byCategory[cat] = (byCategory[cat] || 0) + Math.abs(t.amount);
    byAccount[t.account] = (byAccount[t.account] || 0) + t.amount;
  }

  const balance = income - expenses;
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;

  return { month, income, expenses, balance, savingsRate, byCategory, byAccount };
}

export function getLast6Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Projection ───────────────────────────────────────────────────────────────

export function computeProjection(
  transactions: Transaction[],
  months: number
): { month: string; projected: number; cumulative: number }[] {
  const last6 = getLast6Months();
  const stats = last6.map((m) => computeMonthStats(transactions, m));
  const avgBalance =
    stats.reduce((s, m) => s + m.balance, 0) / (stats.length || 1);

  const result = [];
  let cumulative = 0;
  const now = new Date();

  for (let i = 1; i <= months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    cumulative += avgBalance;
    result.push({ month, projected: avgBalance, cumulative });
  }
  return result;
}

// ─── Suggestions ─────────────────────────────────────────────────────────────

export interface Suggestion {
  type: "high-spend" | "anomaly" | "optimization";
  title: string;
  description: string;
  amount?: number;
  icon: string;
}

export function generateSuggestions(
  transactions: Transaction[],
  currentMonth: string
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const stats = computeMonthStats(transactions, currentMonth);
  const prevMonth = getPrevMonth(currentMonth);
  const prevStats = computeMonthStats(transactions, prevMonth);

  // 1. Highest spending category
  const topCat = Object.entries(stats.byCategory).sort(
    (a, b) => b[1] - a[1]
  )[0];
  if (topCat && topCat[1] > 500) {
    suggestions.push({
      type: "high-spend",
      title: `Dépenses élevées : ${topCat[0]}`,
      description: `Tu as dépensé ${formatEur(topCat[1])} en ${topCat[0]} ce mois-ci.`,
      amount: topCat[1],
      icon: "📊",
    });
  }

  // 2. Anomaly: big increase vs prev month
  for (const [cat, amount] of Object.entries(stats.byCategory)) {
    const prev = prevStats.byCategory[cat] || 0;
    if (prev > 0 && amount > prev * 1.5 && amount - prev > 100) {
      suggestions.push({
        type: "anomaly",
        title: `Hausse inhabituelle : ${cat}`,
        description: `+${formatEur(amount - prev)} vs le mois dernier.`,
        amount: amount - prev,
        icon: "⚠️",
      });
      break;
    }
  }

  // 3. Savings tip
  if (stats.savingsRate < 10 && stats.income > 0) {
    suggestions.push({
      type: "optimization",
      title: "Taux d'épargne faible",
      description: `Seulement ${stats.savingsRate.toFixed(1)}% d'épargne ce mois. Objectif recommandé : 20%.`,
      icon: "💡",
    });
  } else if (stats.savingsRate > 20) {
    const excess = stats.income * (stats.savingsRate - 20) / 100;
    suggestions.push({
      type: "optimization",
      title: "Bon mois ! Investis le surplus",
      description: `Tu as ${formatEur(excess)} de surplus au-delà de 20%. Pense à alimenter ton PEA.`,
      amount: excess,
      icon: "🚀",
    });
  }

  return suggestions.slice(0, 3);
}

function getPrevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Account balance ──────────────────────────────────────────────────────────

export function computeAccountBalance(
  accountId: string,
  accountName: string,
  initialBalance: number,
  transactions: Transaction[]
): number {
  const sum = transactions
    .filter((t) => t.account === accountName)
    .reduce((s, t) => s + t.amount, 0);
  return initialBalance + sum;
}
