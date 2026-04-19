import Papa from "papaparse";
import { Transaction, generateId } from "./store";
import { autoCategory } from "./analytics";
import type { CategoryRule } from "./store";

// ─── CSV Normalizer ───────────────────────────────────────────────────────────

// Try to detect column mapping from header
function detectColumns(headers: string[]): {
  date?: number;
  label?: number;
  amount?: number;
  debit?: number;
  credit?: number;
  account?: number;
} {
  const map: ReturnType<typeof detectColumns> = {};
  headers.forEach((h, i) => {
    const lh = h.toLowerCase().replace(/\s+/g, "");
    if (!map.date && /date|dat/.test(lh)) map.date = i;
    if (!map.label && /libel|opéra|descrpt|motif|label/.test(lh)) map.label = i;
    if (!map.amount && /montant|amount|solde/.test(lh)) map.amount = i;
    if (!map.debit && /débit|debit/.test(lh)) map.debit = i;
    if (!map.credit && /crédit|credit/.test(lh)) map.credit = i;
    if (!map.account && /compte|account/.test(lh)) map.account = i;
  });
  return map;
}

function parseAmount(raw: string): number {
  if (!raw) return 0;
  // Handle French format: 1 234,56 or -1234.56
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^0-9.\-+]/g, "");
  return parseFloat(cleaned) || 0;
}

function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  // Handle dd/mm/yyyy or yyyy-mm-dd
  const parts = raw.split(/[\/\-\.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // yyyy-mm-dd
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    } else {
      // dd/mm/yyyy
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  return raw;
}

export async function parseCSV(
  file: File,
  accountName: string,
  rules: CategoryRule[]
): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as string[][];
        if (rows.length < 2) {
          reject(new Error("CSV vide ou invalide"));
          return;
        }

        const headers = rows[0];
        const cols = detectColumns(headers);
        const transactions: Transaction[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every((c) => !c)) continue;

          // Date
          const rawDate = cols.date !== undefined ? row[cols.date] : "";
          const date = parseDate(rawDate);

          // Label
          const label =
            cols.label !== undefined ? row[cols.label]?.trim() : `Import ligne ${i}`;

          // Amount
          let amount = 0;
          if (cols.amount !== undefined) {
            amount = parseAmount(row[cols.amount]);
          } else if (cols.debit !== undefined || cols.credit !== undefined) {
            const debit =
              cols.debit !== undefined ? parseAmount(row[cols.debit]) : 0;
            const credit =
              cols.credit !== undefined ? parseAmount(row[cols.credit]) : 0;
            amount = credit - Math.abs(debit);
          }

          if (amount === 0) continue;

          const category = autoCategory(label || "", rules);

          transactions.push({
            id: generateId(),
            date,
            label: label || "Sans libellé",
            amount,
            category,
            account: accountName,
            source: "csv",
            createdAt: Date.now(),
          });
        }

        resolve(transactions);
      },
      error: (err) => reject(new Error(err.message)),
    });
  });
}

// ─── Month replacement logic ──────────────────────────────────────────────────

export function replaceMonthWithCSV(
  existing: Transaction[],
  csvTransactions: Transaction[],
  month: string,
  accountName: string
): Transaction[] {
  // Remove manual transactions for that month+account
  const kept = existing.filter(
    (t) =>
      !(
        t.date.startsWith(month) &&
        t.account === accountName &&
        t.source === "manual"
      )
  );
  return [...kept, ...csvTransactions];
}
