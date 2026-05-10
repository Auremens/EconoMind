import { Transaction, generateId, CategoryRule } from "./store";
import { autoCategory } from "./analytics";

declare global {
  interface Window { pdfjsLib: any; }
}

async function loadPdfJs(): Promise<any> {
  if (typeof window === "undefined") throw new Error("Client only");
  if (window.pdfjsLib) return window.pdfjsLib;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error("Impossible de charger pdf.js"));
    document.head.appendChild(script);
  });
}

interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
}

async function extractItems(file: File): Promise<TextItem[][]> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allPages: TextItem[][] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items: TextItem[] = content.items
      .filter((item: any) => item.str.trim().length > 0)
      .map((item: any) => ({
        text: item.str.trim(),
        x: Math.round(item.transform[4] * 10) / 10,
        y: Math.round(item.transform[5] * 10) / 10,
        width: Math.round(item.width * 10) / 10,
      }));
    allPages.push(items);
  }
  return allPages;
}

function isDate(s: string): boolean { return /^\d{2}\/\d{2}\/\d{4}$/.test(s); }
function parseDate(s: string): string {
  const [d, m, y] = s.split("/"); return `${y}-${m}-${d}`;
}
function isAmount(s: string): boolean {
  return /^\d[\d.]*,\d{2}$/.test(s.replace(/\s/g, ""));
}
function parseAmount(s: string): number {
  return parseFloat(s.replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
}

function groupByY(items: TextItem[], tolerance = 4): Map<number, TextItem[]> {
  const rows = new Map<number, TextItem[]>();
  for (const item of items) {
    const snap = Math.round(item.y / tolerance) * tolerance;
    let found = false;
    for (const [ky] of rows) {
      if (Math.abs(ky - snap) <= tolerance) { rows.get(ky)!.push(item); found = true; break; }
    }
    if (!found) rows.set(snap, [item]);
  }
  for (const [, row] of rows) row.sort((a, b) => a.x - b.x);
  return rows;
}

function joinWithSpaces(items: TextItem[]): string {
  if (items.length === 0) return "";
  let result = items[0].text;
  for (let i = 1; i < items.length; i++) {
    const gap = items[i].x - (items[i - 1].x + items[i - 1].width);
    result += (gap > 2 ? " " : "") + items[i].text;
  }
  return result.trim();
}

// ─── Opening balance detection ────────────────────────────────────────────────

function detectOpeningBalance(pages: TextItem[][]): number | null {
  for (const pageItems of pages) {
    const allText = pageItems.map(i => i.text).join(" ");

    // Pattern: SOLDEAU: dd/mm/yyyy amount  (BoursoBank)
    const match = allText.match(/SOLDEAU\s*:?\s*\d{2}\/\d{2}\/\d{4}\s+([\d.,]+)/i)
      || allText.match(/SOLDE\s+AU\s*:?\s*\d{2}\/\d{2}\/\d{4}\s+([\d.,]+)/i)
      || allText.match(/solde\s+précédent\s*:?\s*([\d.,]+)/i)
      || allText.match(/old\s+balance\s*:?\s*([\d.,]+)/i)
      || allText.match(/solde\s+initial\s*:?\s*([\d.,]+)/i);

    if (match) {
      const raw = match[1];
      const val = parseFloat(raw.replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
      if (!isNaN(val)) return val;
    }

    // Positional: look for row with "SOLDE" + amount in credit column (last page)
    const rows = groupByY(pageItems, 4);
    const sortedYs = Array.from(rows.keys()).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const row = rows.get(y)!;
      const texts = row.map(i => i.text);
      const hasSolde = texts.some(t => t.toUpperCase().includes("SOLDE"));
      const amounts = row.filter(i => isAmount(i.text));
      if (hasSolde && amounts.length > 0) {
        const val = parseAmount(amounts[amounts.length - 1].text);
        if (val > 0) return val;
      }
    }
  }
  return null;
}

// ─── BoursoBank parser ────────────────────────────────────────────────────────

function parseBoursobank(
  pages: TextItem[][],
  accountName: string,
  rules: CategoryRule[]
): Transaction[] {
  const transactions: Transaction[] = [];

  for (const pageItems of pages) {
    let debitX = 441, creditX = 506, valeurX = 381;
    for (const item of pageItems) {
      if (item.text === "Débit" || item.text === "DØbit") debitX = item.x;
      else if (item.text === "Crédit" || item.text === "CrØdit") creditX = item.x;
      else if (item.text === "Valeur") valeurX = item.x;
    }

    const COL_TOLERANCE = 40;
    const DATE_MAX_X = valeurX - 100;
    const rows = groupByY(pageItems, 4);
    const sortedYs = Array.from(rows.keys()).sort((a, b) => b - a);

    for (const y of sortedYs) {
      const row = rows.get(y)!;
      const dateItem = row.find(i => i.x < DATE_MAX_X && isDate(i.text));
      const debitItem = row.find(i => isAmount(i.text) && Math.abs(i.x - debitX) < COL_TOLERANCE);
      const creditItem = row.find(i => isAmount(i.text) && Math.abs(i.x - creditX) < COL_TOLERANCE);

      if (!dateItem || (!debitItem && !creditItem)) continue;

      const labelItems = row.filter(
        i => i.x >= 75 && i.x < valeurX - 5 && !isDate(i.text) && !isAmount(i.text)
      );
      const rawLabel = joinWithSpaces(labelItems);
      if (!rawLabel || rawLabel.includes("SOLDE") || rawLabel === "Libellé" || rawLabel === "LibellØ") continue;

      const date = parseDate(dateItem.text);
      const amount = creditItem ? parseAmount(creditItem.text) : -parseAmount(debitItem!.text);
      const cleanLabel = rawLabel.replace(/\s*Rèf\s*:?\s*\S+/gi, "").replace(/\s*RUM\s+\S+/gi, "").replace(/\s{2,}/g, " ").trim();
      if (!cleanLabel) continue;

      transactions.push({
        id: generateId(), date, label: cleanLabel, amount,
        category: autoCategory(cleanLabel, rules),
        account: accountName, source: "pdf", createdAt: Date.now(),
      });
    }
  }

  const seen = new Set<string>();
  return transactions.filter(t => {
    const key = `${t.date}|${t.amount}|${t.label.slice(0, 15)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseGeneric(pages: TextItem[][], accountName: string, rules: CategoryRule[]): Transaction[] {
  const transactions: Transaction[] = [];
  for (const pageItems of pages) {
    const rows = groupByY(pageItems, 4);
    const sortedYs = Array.from(rows.keys()).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const row = rows.get(y)!;
      const dateItem = row.find(i => isDate(i.text) && i.x < 100);
      if (!dateItem) continue;
      const amounts = row.filter(i => isAmount(i.text));
      if (amounts.length === 0) continue;
      const labelItems = row.filter(i => !isDate(i.text) && !isAmount(i.text) && i.x > 60);
      const label = joinWithSpaces(labelItems) || "Transaction";
      if (label.includes("SOLDE") || label === "Libellé") continue;
      transactions.push({
        id: generateId(), date: parseDate(dateItem.text), label,
        amount: -parseAmount(amounts[amounts.length - 1].text),
        category: autoCategory(label, rules),
        account: accountName, source: "pdf", createdAt: Date.now(),
      });
    }
  }
  const seen = new Set<string>();
  return transactions.filter(t => {
    const key = `${t.date}|${t.amount}|${t.label.slice(0, 15)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function detectBank(pages: TextItem[][]): string {
  const text = pages[0]?.map(i => i.text).join(" ").toLowerCase() || "";
  if (text.includes("bourso")) return "boursobank";
  if (text.includes("bnp")) return "bnp";
  if (text.includes("crédit agricole") || text.includes("credit agricole")) return "ca";
  if (text.includes("société générale") || text.includes("societe generale")) return "sg";
  if (text.includes("la banque postale")) return "lbp";
  return "generic";
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface PDFImportResult {
  transactions: Transaction[];
  openingBalance: number | null; // detected from PDF
}

export async function parsePDF(
  file: File,
  accountName: string,
  rules: CategoryRule[]
): Promise<PDFImportResult> {
  const pages = await extractItems(file);
  const bank = detectBank(pages);

  const transactions = bank === "boursobank"
    ? parseBoursobank(pages, accountName, rules)
    : parseGeneric(pages, accountName, rules);

  if (transactions.length === 0) {
    throw new Error(
      "Aucune transaction détectée. Vérifiez que le PDF est un relevé numérique (texte sélectionnable) et non un scan."
    );
  }

  const openingBalance = detectOpeningBalance(pages);

  return { transactions, openingBalance };
}
