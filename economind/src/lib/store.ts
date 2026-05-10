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
  // ── Salaire (priorité haute) ──
  { keyword: "drfip", category: "Salaire" },
  { keyword: "ddfip", category: "Salaire" },
  { keyword: "remuneration", category: "Salaire" },
  { keyword: "rémunération", category: "Salaire" },
  { keyword: "salaire", category: "Salaire" },
  { keyword: "traitement", category: "Salaire" },
  { keyword: "paie", category: "Salaire" },

  // ── Virements internes / Épargne (priorité haute) ──
  { keyword: "fortuneo", category: "Investissement PEA" },
  { keyword: "scalable", category: "Investissement PEA" },
  { keyword: "degiro", category: "Investissement PEA" },
  { keyword: "trade republic", category: "Investissement PEA" },
  { keyword: "ldds", category: "Investissement LDDS" },
  { keyword: "lep", category: "Investissement LEP" },
  { keyword: "livret a", category: "Investissement livret" },
  { keyword: "livreta", category: "Investissement livret" },
  { keyword: "epargneprogram", category: "Épargne programmée" },  // collé BoursoBank
  { keyword: "epargne program", category: "Épargne programmée" },
  { keyword: "épargne program", category: "Épargne programmée" },
  { keyword: "vir epargne", category: "Épargne programmée" },
  { keyword: "virements depuis", category: "Virement interne" },
  { keyword: "virement depuis", category: "Virement interne" },
  { keyword: "boursobank", category: "Virement interne" },
  { keyword: "banque pop", category: "Virement interne" },
  { keyword: "compte joint", category: "Virement interne" },
  { keyword: "joint)", category: "Virement interne" },  // BoursoBank: "depuis 2 - BoursoBank (joint)"

  // ── Logement ──
  { keyword: "loyer", category: "Logement" },
  { keyword: "edf", category: "Logement" },
  { keyword: "engie", category: "Logement" },
  { keyword: "total energie", category: "Logement" },
  { keyword: "gaz", category: "Logement" },
  { keyword: "eau", category: "Logement" },
  { keyword: "syndic", category: "Logement" },
  { keyword: "assurance habitation", category: "Logement" },
  { keyword: "maif", category: "Logement" },
  { keyword: "macif", category: "Logement" },
  { keyword: "credit immo", category: "Logement" },
  { keyword: "pret immo", category: "Logement" },
  { keyword: "prêt immo", category: "Logement" },

  // ── Abonnements ──
  { keyword: "netflix", category: "Abonnements" },
  { keyword: "spotify", category: "Abonnements" },
  { keyword: "disney", category: "Abonnements" },
  { keyword: "amazon prime", category: "Abonnements" },
  { keyword: "apple", category: "Abonnements" },
  { keyword: "google", category: "Abonnements" },
  { keyword: "deezer", category: "Abonnements" },
  { keyword: "canal+", category: "Abonnements" },
  { keyword: "orange sa", category: "Abonnements" },    // BoursoBank: "PRLVSEPAORANGE SA"
  { keyword: "prlvsepaorange", category: "Abonnements" },
  { keyword: "sfr", category: "Abonnements" },
  { keyword: "bouygues", category: "Abonnements" },
  { keyword: "free", category: "Abonnements" },
  { keyword: "internet", category: "Abonnements" },
  { keyword: "youprice", category: "Abonnements" },
  { keyword: "you price", category: "Abonnements" },
  { keyword: "boursoprotect", category: "Abonnements" },
  { keyword: "bourso protect", category: "Abonnements" },
  { keyword: "basic fit", category: "Sport" },
  { keyword: "basicfit", category: "Sport" },
  { keyword: "block out", category: "Sport" },
  { keyword: "salle de sport", category: "Sport" },
  { keyword: "fitness", category: "Sport" },

  // ── Alimentation ──
  { keyword: "carrefour", category: "Alimentation" },
  { keyword: "leclerc", category: "Alimentation" },
  { keyword: "lidl", category: "Alimentation" },
  { keyword: "aldi", category: "Alimentation" },
  { keyword: "monoprix", category: "Alimentation" },
  { keyword: "intermarche", category: "Alimentation" },
  { keyword: "franprix", category: "Alimentation" },
  { keyword: "casino", category: "Alimentation" },
  { keyword: "super u", category: "Alimentation" },
  { keyword: "biocoop", category: "Alimentation" },
  { keyword: "picard", category: "Alimentation" },
  { keyword: "jow", category: "Alimentation" },         // service courses BoursoBank
  { keyword: "frite fraich", category: "Restaurant" },  // BoursoBank: "LA FRITE FRAICH"

  // ── Transport ──
  { keyword: "sncf", category: "Transport" },
  { keyword: "ratp", category: "Transport" },
  { keyword: "uber", category: "Transport" },
  { keyword: "bolt", category: "Transport" },
  { keyword: "blablacar", category: "Transport" },
  { keyword: "essence", category: "Transport" },
  { keyword: "total", category: "Transport" },
  { keyword: "bp ", category: "Transport" },
  { keyword: "shell", category: "Transport" },
  { keyword: "autoroute", category: "Transport" },
  { keyword: "parking", category: "Transport" },
  { keyword: "velib", category: "Transport" },
  { keyword: "navigo", category: "Transport" },
  { keyword: "prefecture", category: "Transport" },     // BoursoBank: "PREFECTURE DE P 4" (carte grise)

  // ── Santé ──
  { keyword: "pharmacie", category: "Santé" },
  { keyword: "médecin", category: "Santé" },
  { keyword: "medecin", category: "Santé" },
  { keyword: "mutuelle", category: "Santé" },
  { keyword: "mgp*", category: "Remboursement" },  // AVOIR MGP*Vinted = remboursement Vinted via Mondial Relay
  { keyword: "mgp", category: "Santé" },
  { keyword: "cpam", category: "Santé" },
  { keyword: "ameli", category: "Santé" },
  { keyword: "dentiste", category: "Santé" },
  { keyword: "opticien", category: "Santé" },
  { keyword: "labo", category: "Santé" },
  { keyword: "clinique", category: "Santé" },
  { keyword: "hopital", category: "Santé" },
  { keyword: "hôpital", category: "Santé" },

  // ── Éducation / Enfant ──
  { keyword: "école", category: "Éducation" },
  { keyword: "ecole", category: "Éducation" },
  { keyword: "saint-louis", category: "Éducation" },
  { keyword: "cantine", category: "Enfant" },
  { keyword: "crèche", category: "Enfant" },
  { keyword: "creche", category: "Enfant" },
  { keyword: "nourrice", category: "Enfant" },
  { keyword: "garde", category: "Enfant" },

  // ── Restaurant ──
  { keyword: "mcdo", category: "Restaurant" },
  { keyword: "mcdonald", category: "Restaurant" },
  { keyword: "restaurant", category: "Restaurant" },
  { keyword: "kebab", category: "Restaurant" },
  { keyword: "pizza", category: "Restaurant" },
  { keyword: "sushi", category: "Restaurant" },
  { keyword: "faris", category: "Restaurant" },         // BoursoBank: "FARIS CB*0267"

  // ── Loisirs / Divers ──
  { keyword: "amazon", category: "Loisirs" },
  { keyword: "paypal", category: "Loisirs" },           // PayPal = achats divers
  { keyword: "woupi", category: "Loisirs" },
  { keyword: "mgp*vinted", category: "Remboursement" },  // avoir vinted
  { keyword: "vinted", category: "Loisirs" },
  { keyword: "leboncoin", category: "Loisirs" },
  { keyword: "fnac", category: "Loisirs" },
  { keyword: "decathlon", category: "Loisirs" },
  { keyword: "cinema", category: "Loisirs" },
  { keyword: "bo3", category: "Loisirs" },              // BoursoBank: "BO3 CB*0267"
  { keyword: "amicale", category: "Loisirs" },

  // ── Syndicat / Cotisations ──
  { keyword: "unsa", category: "Autre" },
  { keyword: "syndicat", category: "Autre" },
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
