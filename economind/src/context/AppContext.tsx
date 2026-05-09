"use client";
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  AppData,
  Transaction,
  Account,
  BudgetRule,
  Goal,
  CategoryRule,
  loadData,
  saveData,
  generateId,
} from "@/lib/store";
import { learnCategory } from "@/lib/analytics";

// ─── Import history entry ─────────────────────────────────────────────────────

export interface ImportSnapshot {
  id: string;
  timestamp: number;
  label: string; // e.g. "Import CSV — Compte courant Alice — avril 2026"
  transactionsBefore: Transaction[];
  transactionsImported: Transaction[];
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "LOAD"; data: AppData }
  | { type: "ADD_TRANSACTION"; tx: Transaction }
  | { type: "UPDATE_TRANSACTION"; tx: Transaction }
  | { type: "DELETE_TRANSACTION"; id: string }
  | { type: "BULK_ADD"; transactions: Transaction[] }
  | { type: "SET_TRANSACTIONS"; transactions: Transaction[] }
  | { type: "UPDATE_ACCOUNT"; account: Account }
  | { type: "ADD_ACCOUNT"; account: Account }
  | { type: "DELETE_ACCOUNT"; id: string }
  | { type: "SET_BUDGET"; budget: BudgetRule }
  | { type: "ADD_GOAL"; goal: Goal }
  | { type: "UPDATE_GOAL"; goal: Goal }
  | { type: "DELETE_GOAL"; id: string }
  | { type: "LEARN_CATEGORY"; label: string; category: string }
  | { type: "TOGGLE_DARK" }
  | { type: "SET_LAST_BACKUP"; ts: number }
  | { type: "SET_ONBOARDING_DONE" };

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case "LOAD":
      return action.data;
    case "ADD_TRANSACTION":
      return {
        ...state,
        transactions: [action.tx, ...state.transactions].sort(
          (a, b) => b.date.localeCompare(a.date)
        ),
      };
    case "UPDATE_TRANSACTION":
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.tx.id ? action.tx : t
        ),
      };
    case "DELETE_TRANSACTION":
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.id),
      };
    case "BULK_ADD":
      return {
        ...state,
        transactions: [...state.transactions, ...action.transactions].sort(
          (a, b) => b.date.localeCompare(a.date)
        ),
      };
    case "SET_TRANSACTIONS":
      return {
        ...state,
        transactions: action.transactions.sort((a, b) =>
          b.date.localeCompare(a.date)
        ),
      };
    case "UPDATE_ACCOUNT":
      return {
        ...state,
        accounts: state.accounts.map((a) =>
          a.id === action.account.id ? action.account : a
        ),
      };
    case "ADD_ACCOUNT":
      return { ...state, accounts: [...state.accounts, action.account] };
    case "DELETE_ACCOUNT":
      return {
        ...state,
        accounts: state.accounts.filter((a) => a.id !== action.id),
      };
    case "SET_BUDGET":
      return { ...state, budgetRule: action.budget };
    case "ADD_GOAL":
      return { ...state, goals: [...state.goals, action.goal] };
    case "UPDATE_GOAL":
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.goal.id ? action.goal : g
        ),
      };
    case "DELETE_GOAL":
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };
    case "LEARN_CATEGORY":
      return {
        ...state,
        categoryRules: learnCategory(
          action.label,
          action.category,
          state.categoryRules
        ),
      };
    case "TOGGLE_DARK":
      return { ...state, darkMode: !state.darkMode };
    case "SET_LAST_BACKUP":
      return { ...state, lastBackup: action.ts };
    case "SET_ONBOARDING_DONE":
      return { ...state, onboardingDone: true };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  data: AppData;
  dispatch: React.Dispatch<Action>;
  addTransaction: (tx: Omit<Transaction, "id" | "createdAt">) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  // Import with undo support
  importWithSnapshot: (
    transactions: Transaction[],
    label: string,
    setter: (transactions: Transaction[]) => Transaction[]
  ) => void;
  // Undo last import
  lastImport: ImportSnapshot | null;
  undoLastImport: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const SNAPSHOTS_KEY = "economind_import_snapshots";
const MAX_SNAPSHOTS = 5;

function loadSnapshots(): ImportSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveSnapshots(snapshots: ImportSnapshot[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, null as unknown as AppData);
  const [lastImport, setLastImport] = React.useState<ImportSnapshot | null>(null);
  const snapshotsRef = useRef<ImportSnapshot[]>([]);

  useEffect(() => {
    const loaded = loadData();
    dispatch({ type: "LOAD", data: loaded });
    const snaps = loadSnapshots();
    snapshotsRef.current = snaps;
    if (snaps.length > 0) setLastImport(snaps[snaps.length - 1]);
  }, []);

  useEffect(() => {
    if (data) saveData(data);
  }, [data]);

  useEffect(() => {
    if (!data) return;
    if (data.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [data?.darkMode]);

  const addTransaction = useCallback(
    (tx: Omit<Transaction, "id" | "createdAt">) => {
      dispatch({
        type: "ADD_TRANSACTION",
        tx: { ...tx, id: generateId(), createdAt: Date.now() },
      });
    },
    []
  );

  const updateTransaction = useCallback((tx: Transaction) => {
    dispatch({ type: "UPDATE_TRANSACTION", tx });
    dispatch({ type: "LEARN_CATEGORY", label: tx.label, category: tx.category });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    dispatch({ type: "DELETE_TRANSACTION", id });
  }, []);

  // Import with automatic snapshot for undo
  const importWithSnapshot = useCallback(
    (
      transactions: Transaction[],
      label: string,
      setter: (transactions: Transaction[]) => Transaction[]
    ) => {
      // Capture current state before import
      const snapshot: ImportSnapshot = {
        id: generateId(),
        timestamp: Date.now(),
        label,
        transactionsBefore: data.transactions,
        transactionsImported: transactions,
      };

      // Apply the import
      const newTransactions = setter(data.transactions);
      dispatch({ type: "SET_TRANSACTIONS", transactions: newTransactions });

      // Save snapshot
      const updated = [...snapshotsRef.current, snapshot].slice(-MAX_SNAPSHOTS);
      snapshotsRef.current = updated;
      saveSnapshots(updated);
      setLastImport(snapshot);
    },
    [data]
  );

  // Undo last import — restore transactions to before state
  const undoLastImport = useCallback(() => {
    if (!lastImport) return;
    dispatch({
      type: "SET_TRANSACTIONS",
      transactions: lastImport.transactionsBefore,
    });
    // Remove snapshot
    const updated = snapshotsRef.current.filter((s) => s.id !== lastImport.id);
    snapshotsRef.current = updated;
    saveSnapshots(updated);
    const prev = updated.length > 0 ? updated[updated.length - 1] : null;
    setLastImport(prev);
  }, [lastImport]);

  if (!data) return null;

  return (
    <AppContext.Provider
      value={{
        data,
        dispatch,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        importWithSnapshot,
        lastImport,
        undoLastImport,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
