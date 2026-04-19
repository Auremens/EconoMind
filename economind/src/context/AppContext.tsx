"use client";
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
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
  | { type: "SET_LAST_BACKUP"; ts: number };

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
  importTransactions: (transactions: Transaction[]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, null as unknown as AppData);

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadData();
    dispatch({ type: "LOAD", data: loaded });
  }, []);

  // Save to localStorage on every change
  useEffect(() => {
    if (data) saveData(data);
  }, [data]);

  // Apply dark mode
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

  const importTransactions = useCallback((transactions: Transaction[]) => {
    dispatch({ type: "BULK_ADD", transactions });
  }, []);

  if (!data) return null; // Loading

  return (
    <AppContext.Provider
      value={{
        data,
        dispatch,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        importTransactions,
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
