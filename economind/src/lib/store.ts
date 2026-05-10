// ─── Types ───────────────────────────────────────────────────────────────────

export type TransactionType = "income" | "expense" | "transfer";
export type TransactionSource = "manual" | "csv" | "pdf";

export interface Transaction {
  id: string;
  date: string; // ISO YYYY-MM-DD
  label: string;
  amount: number;        // positive = income/transfer-in, negative = expense/transfer-out
  category: string;
  account: string;
  source: TransactionSource;
  transferType?: "transfer"; // marks internal transfers — excluded from expense stats
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
  needs: number;
  wants: number;
  savings: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
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
  onboardingDone: boolean;
}

// ─── Transfer categories — excluded from expense/income stats ─────────────────

export const TRANSFER_CATEGORIES = [
  "Virement interne",
  "Épargne programmée",
  "Investissement PEA",
  "Investissement LDDS",
  "Investissement LEP",
  "Investissement livret",
];

export const isTransferCategory = (category: string): boolean =>
  TRANSFER_CATEGORIES.includes(category);

// ─── Default categories ───────────────────────────────────────────────────────

export const DEFAULT_CATEGORIES = [
  // Revenus
  "Salaire",
  "Aide sociale",
  "Remboursement",
  // Dépenses courantes
  "Logement",
  "Alimentation",
  "Transport",
  "Santé",
  "Éducation",
  "Loisirs",
  "Habillement",
  "Abonnements",
  "Restaurant",
  "Vacances",
  "Enfant",
  "Autre",
  // Virements internes (ne comptent pas comme dépenses)
  ...TRANSFER_CATEGORIES,
];

export const DEFAULT_CATEGORY_RULES: CategoryRule[] = [
  // Logement
  { keyword: "loyer", category: "Logement" },
  { keyword: "edf", category: "Logement" },
  { keyword: "engie", category: "Logement" },
  // Abonnements
  { keyword: "internet", category: "Abonnements" },
  { keyword: "netflix", category: "Abonnements" },
  { keyword: "spotify", category: "Abonnements" },
  { keyword: "disney", category: "Abonnements" },
  { keyword: "orange", category: "Abonnements" },
  { keyword: "sfr", category: "Abonnements" },
  { keyword: "bouygues", category: "Abonnements" },
  // Alimentation
  { keyword: "carrefour", category: "Alimentation" },
  { keyword: "leclerc", category: "Alimentation" },
  { keyword: "lidl", category: "Alimentation" },
  { keyword: "aldi", category: "Alimentation" },
  { keyword: "monoprix", category: "Alimentation" },
  { keyword: "intermarche", category: "Alimentation" },
  { keyword: "franprix", category: "Alimentation" },
  { keyword: "casino", category: "Alimentation" },
  // Transport
  { keyword: "sncf", category: "Transport" },
  { keyword: "ratp", category: "Transport" },
  { keyword: "uber", category: "Transport" },
  { keyword: "essence", category: "Transport" },
  // Santé
  { keyword: "pharmacie", category: "Santé" },
  { keyword: "médecin", category: "Santé" },
  { keyword: "mutuelle", category: "Santé" },
  { keyword: "mgp", category: "Santé" },
  // Salaire
  { keyword: "salaire", category: "Salaire" },
  { keyword: "drfip", category: "Salaire" },
  { keyword: "ddfip", category: "Salaire" },
  { keyword: "remuneration", category: "Salaire" },
  { keyword: "rémunération", category: "Salaire" },
  // Restaurant
  { keyword: "mcdo", category: "Restaurant" },
  { keyword: "restaurant", category: "Restaurant" },
  // Éducation
  { keyword: "école", category: "Éducation" },
  // ── Virements internes (ne comptent PAS comme dépenses) ──
  { keyword: "fortuneo", category: "Investissement PEA" },
  { keyword: "pea", category: "Investissement PEA" },
  { keyword: "ldds", category: "Investissement LDDS" },
  { keyword: "lep", category: "Investissement LEP" },
  { keyword: "livret", category: "Investissement livret" },
  { keyword: "épargne programmee", category: "Épargne programmée" },
  { keyword: "epargne programmee", category: "Épargne programmée" },
  { keyword: "scalable", category: "Investissement PEA" },
  { keyword: "virement interne", category: "Virement interne" },
  { keyword: "boursobank", category: "Virement interne" },
  { keyword: "banque pop", category: "Virement interne" },
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
    const defaults = getDefaultData();

    // Merge default category rules with user-learned rules
    // Default rules are always present; user rules (learned corrections) are added on top
    const userLearnedRules = (parsed.categoryRules || []).filter(
      (r) => !DEFAULT_CATEGORY_RULES.some((d) => d.keyword === r.keyword)
    );
    const mergedRules = [...userLearnedRules, ...DEFAULT_CATEGORY_RULES];

    return {
      ...defaults,
      ...parsed,
      categoryRules: mergedRules,
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
    accounts: [],
    budgetRule: DEFAULT_BUDGET,
    goals: [],
    categoryRules: DEFAULT_CATEGORY_RULES,
    darkMode: true,
    lastBackup: null,
    onboardingDone: false,
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
        resolve(JSON.parse(e.target?.result as string) as AppData);
      } catch {
        reject(new Error("Fichier JSON invalide"));
      }
    };
    reader.onerror = () => reject(new Error("Erreur de lecture"));
    reader.readAsText(file);
  });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
