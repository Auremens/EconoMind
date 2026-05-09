import { Transaction, generateId, CategoryRule } from "./store";
import { autoCategory } from "./analytics";

// ─── PDF Text Extraction (client-side via pdf.js) ────────────────────────────
// We use pdfjs-dist loaded from CDN to avoid heavy build dependencies

declare global {
  interface Window {
    pdfjsLib: any;
  }
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

async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
}

// ─── Transaction parser from raw PDF text ────────────────────────────────────

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".").replace(/[^0-9.\-+]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function parseDate(raw: string): string | null {
  // dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
  const match = raw.match(/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2,4})/);
  if (!match) return null;
  const [, d, m, y] = match;
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// Generic line-based parser — handles most French bank PDF formats
function parseLinesFromText(
  text: string,
  accountName: string,
  rules: CategoryRule[]
): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);

  // Regex: date + label + amount (positive or negative)
  const lineRegex =
    /(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})\s+(.+?)\s+([-+]?\s*\d[\d\s]*[,\.]\d{2})\s*$/;

  for (const line of lines) {
    const match = line.match(lineRegex);
    if (!match) continue;

    const [, rawDate, rawLabel, rawAmount] = match;
    const date = parseDate(rawDate);
    const amount = parseAmount(rawAmount.replace(/\s/g, ""));
    const label = rawLabel.trim();

    if (!date || amount === null || !label) continue;

    transactions.push({
      id: generateId(),
      date,
      label,
      amount,
      category: autoCategory(label, rules),
      account: accountName,
      source: "pdf",
      createdAt: Date.now(),
    });
  }

  // Fallback: try to find date + amount pairs on adjacent lines
  if (transactions.length === 0) {
    for (let i = 0; i < lines.length - 1; i++) {
      const dateLine = parseDate(lines[i].split(/\s/)[0]);
      if (!dateLine) continue;

      // Look for amount in same or next line
      const amountMatch = lines[i].match(/([-+]?\d[\d\s]*[,\.]\d{2})\s*$/);
      if (!amountMatch) continue;

      const amount = parseAmount(amountMatch[1]);
      if (amount === null) continue;

      // Label is everything between date and amount
      const label = lines[i]
        .replace(lines[i].split(/\s/)[0], "")
        .replace(amountMatch[0], "")
        .trim() || `Transaction ${dateLine}`;

      transactions.push({
        id: generateId(),
        date: dateLine,
        label,
        amount,
        category: autoCategory(label, rules),
        account: accountName,
        source: "pdf",
        createdAt: Date.now(),
      });
    }
  }

  return transactions;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function parsePDF(
  file: File,
  accountName: string,
  rules: CategoryRule[]
): Promise<Transaction[]> {
  const text = await extractTextFromPDF(file);
  const transactions = parseLinesFromText(text, accountName, rules);

  if (transactions.length === 0) {
    throw new Error(
      "Aucune transaction détectée. Le PDF est peut-être scanné (image) ou dans un format non reconnu. Essaie d'exporter en CSV depuis ton espace bancaire."
    );
  }

  return transactions;
}
