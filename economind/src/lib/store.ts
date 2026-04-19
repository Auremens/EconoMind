// ─── Types ───────────────────────────────────────────────────────────────────

export type TransactionType = "income" | "expense";
export type TransactionSource = "manual" | "csv" | "pdf";

export interface Transaction {
  id: string;
  date: string; // ISO YYYY-MM-DD
  label: string;
  amount: number; // positive = income, negative = expense
  category: string;
  account: string;
  source: TransactionSource;
  createdAt: number;
}

export interface Account {
  id: string;
  name: string;
  initialBalance: number;
  color: string;
}

export interface BudgetRule {
  mode: "503020" | "custom";
  needs: number;    // %
  wants: number;    // %
  savings: number;  // %
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // ISO YYYY-MM-DD
  color: string;
  createdAt: number;
}

export interface CategoryRule {
  keyword: string;
  category: string;
}

export interface AppData {
  transactions: Transaction[];
  accounts: Account[];
  budgetRule: BudgetRule;
  goals: Goal[];
  categoryRules: CategoryRule[];
  darkMode: boolean;
  lastBackup: number | null;
}

// ─── Default data ─────────────────────────────────────────────────────────────

const DEFAULT_ACCOUNTS: Account[] = [
  { id: "acc-1", name: "Compte courant Aurélien", initialBalance: 0, color: "#22c55e" },
  { id: "acc-2", name: "Compte courant Alice", initialBalance: 0, color: "#3b82f6" },
  { id: "acc-3", name: "Compte joint", initialBalance: 0, color: "#f59e0b" },
  { id: "acc-4", name: "PEA Aurélien", initialBalance: 15000, color: "#8b5cf6" },
  { id: "acc-5", name: "PEA Alice", initialBalance: 20350, color: "#ec4899" },
  { id: "acc-6", name: "Livret A Alice", initialBalance: 9380, color: "#06b6d4" },
  { id: "acc-7", name: "LEP Alice", initialBalance: 10000, color: "#10b981" },
  { id: "acc-8", name: "LEP Aurélien", initialBalance: 2300, color: "#f97316" },
];

export const DEFAULT_CATEGORIES = [
  "Logement",
  "Alimentation",
  "Transport",
  "Santé",
  "Éducation",
  "Loisirs",
  "Habillement",
  "Épargne",
  "Salaire",
  "Aide sociale",
  "Remboursement",
  "Abonnements",
  "Restaurant",
  "Vacances",
  "Enfant",
  "Autre",
];

const DEFAULT_CATEGORY_RULES: CategoryRule[] = [
  { keyword: "loyer", category: "Logement" },
  { keyword: "edf", category: "Logement" },
  { keyword: "engie", category: "Logement" },
  { keyword: "internet", category: "Abonnements" },
  { keyword: "netflix", category: "Abonnements" },
  { keyword: "spotify", category: "Abonnements" },
  { keyword: "carrefour", category: "Alimentation" },
  { keyword: "leclerc", category: "Alimentation" },
  { keyword: "lidl", category: "Alimentation" },
  { keyword: "aldi", category: "Alimentation" },
  { keyword: "monoprix", category: "Alimentation" },
  { keyword: "sncf", category: "Transport" },
  { keyword: "ratp", category: "Transport" },
  { keyword: "uber", category: "Transport" },
  { keyword: "essence", category: "Transport" },
  { keyword: "pharmacie", category: "Santé" },
  { keyword: "médecin", category: "Santé" },
  { keyword: "mutuelle", category: "Santé" },
  { keyword: "mgp", category: "Santé" },
  { keyword: "salaire", category: "Salaire" },
  { keyword: "virement salaire", category: "Salaire" },
  { keyword: "école", category: "Éducation" },
  { keyword: "saint-louis", category: "Éducation" },
  { keyword: "mcdo", category: "Restaurant" },
  { keyword: "restaurant", category: "Restaurant" },
];

const DEFAULT_BUDGET: BudgetRule = {
  mode: "503020",
  needs: 50,
  wants: 30,
  savings: 20,
};

const STORAGE_KEY = "economind_v1";

// ─── Storage helpers ──────────────────────────────────────────────────────────

export function loadData(): AppData {
  if (typeof window === "undefined") return getDefaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    const parsed = JSON.parse(raw) as AppData;
    // Merge missing fields
    return {
      ...getDefaultData(),
      ...parsed,
      accounts: parsed.accounts?.length ? parsed.accounts : DEFAULT_ACCOUNTS,
    };
  } catch {
    return getDefaultData();
  }
}

export function saveData(data: AppData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getDefaultData(): AppData {
  return {
    transactions: [],
    accounts: DEFAULT_ACCOUNTS,
    budgetRule: DEFAULT_BUDGET,
    goals: [],
    categoryRules: DEFAULT_CATEGORY_RULES,
    darkMode: true,
    lastBackup: null,
  };
}

export function exportData(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `economind-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as AppData;
        resolve(data);
      } catch {
        reject(new Error("Fichier JSON invalide"));
      }
    };
    reader.onerror = () => reject(new Error("Erreur de lecture"));
    reader.readAsText(file);
  });
}

// ─── ID generation ────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
