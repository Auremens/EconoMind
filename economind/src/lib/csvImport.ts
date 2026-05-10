import Papa from "papaparse";
import { Transaction, generateId, CategoryRule } from "./store";
import { autoCategory } from "./analytics";

function detectColumns(headers: string[]): {
  date?: number; label?: number; amount?: number;
  debit?: number; credit?: number; balance?: number;
} {
  const map: ReturnType<typeof detectColumns> = {};
  headers.forEach((h, i) => {
    const lh = h.toLowerCase().replace(/\s+/g, "");
    if (map.date === undefined && /date|dat/.test(lh)) map.date = i;
    if (map.label === undefined && /libel|opéra|descrpt|motif|label/.test(lh)) map.label = i;
    if (map.amount === undefined && /montant|amount/.test(lh)) map.amount = i;
    if (map.debit === undefined && /débit|debit/.test(lh)) map.debit = i;
    if (map.credit === undefined && /crédit|credit/.test(lh)) map.credit = i;
    if (map.balance === undefined && /solde|balance/.test(lh)) map.balance = i;
  });
  return map;
}

function parseAmount(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/\s/g, "").replace(",", ".").replace(/[^0-9.\-+]/g, "");
  return parseFloat(cleaned) || 0;
}

function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  const parts = raw.split(/[\/\-\.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return raw;
}

// Detect opening balance from CSV (look for "Solde" row before transactions)
function detectOpeningBalanceCSV(rows: string[][]): number | null {
  for (const row of rows.slice(0, 10)) {
    const joined = row.join(" ").toLowerCase();
    if (joined.includes("solde") || joined.includes("balance")) {
      const amounts = row.filter(cell => {
        const cleaned = cell.replace(/\s/g, "").replace(",", ".").replace(/[^0-9.\-]/g, "");
        return cleaned.length > 0 && !isNaN(parseFloat(cleaned));
      });
      if (amounts.length > 0) {
        const val = parseAmount(amounts[amounts.length - 1]);
        if (val !== 0) return val;
      }
    }
  }
  return null;
}

export interface CSVImportResult {
  transactions: Transaction[];
  openingBalance: number | null;
}

export async function parseCSV(
  file: File,
  accountName: string,
  rules: CategoryRule[]
): Promise<CSVImportResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as string[][];
        if (rows.length < 2) { reject(new Error("CSV vide ou invalide")); return; }

        const openingBalance = detectOpeningBalanceCSV(rows);
        const headers = rows[0];
        const cols = detectColumns(headers);
        const transactions: Transaction[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every((c) => !c)) continue;

          const rawDate = cols.date !== undefined ? row[cols.date] : "";
          const date = parseDate(rawDate);
          const label = cols.label !== undefined ? row[cols.label]?.trim() : `Import ligne ${i}`;
          let amount = 0;
          if (cols.amount !== undefined) {
            amount = parseAmount(row[cols.amount]);
          } else if (cols.debit !== undefined || cols.credit !== undefined) {
            const debit = cols.debit !== undefined ? parseAmount(row[cols.debit]) : 0;
            const credit = cols.credit !== undefined ? parseAmount(row[cols.credit]) : 0;
            amount = credit - Math.abs(debit);
          }
          if (amount === 0) continue;

          transactions.push({
            id: generateId(), date,
            label: label || "Sans libellé",
            amount,
            category: autoCategory(label || "", rules),
            account: accountName, source: "csv", createdAt: Date.now(),
          });
        }

        resolve({ transactions, openingBalance });
      },
      error: (err) => reject(new Error(err.message)),
    });
  });
}

export function replaceMonthWithCSV(
  existing: Transaction[],
  csvTransactions: Transaction[],
  month: string,
  accountName: string
): Transaction[] {
  const kept = existing.filter(
    (t) => !(t.date.startsWith(month) && t.account === accountName && t.source === "manual")
  );
  return [...kept, ...csvTransactions];
}
