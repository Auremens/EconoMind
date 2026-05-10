"use client";
import React, { useState, useRef } from "react";
import Layout from "@/components/Layout";
import { useApp } from "@/context/AppContext";
import { parseCSV } from "@/lib/csvImport";
import { parsePDF } from "@/lib/pdfImport";
import { detectDuplicates, DuplicateResult, formatEur } from "@/lib/analytics";
import { Transaction } from "@/lib/store";
import { replaceMonthWithCSV } from "@/lib/csvImport";
import {
  Upload, FileText, AlertTriangle, Check, X,
  FileSpreadsheet, RotateCcw, Clock, Info,
} from "lucide-react";

type Step = "idle" | "preview" | "duplicates" | "done";
type FileType = "csv" | "pdf";

export default function Import() {
  const { data, dispatch, importWithSnapshot, lastImport, undoLastImport } = useApp();
  const [step, setStep] = useState<Step>("idle");
  const [selectedAccount, setSelectedAccount] = useState(data.accounts[0]?.name || "");
  const [preview, setPreview] = useState<Transaction[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateResult[]>([]);
  const [toAdd, setToAdd] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileType, setFileType] = useState<FileType>("csv");
  const [fileName, setFileName] = useState("");
  const [openingBalance, setOpeningBalance] = useState<number | null>(null);
  const [updateBalance, setUpdateBalance] = useState(true);
  const [resolvedDuplicates, setResolvedDuplicates] = useState<{
    [key: string]: "keep" | "replace" | "skip";
  }>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedAccountObj = data.accounts.find(a => a.name === selectedAccount);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError("");
    const isPDF = file.name.toLowerCase().endsWith(".pdf");
    setFileType(isPDF ? "pdf" : "csv");
    setFileName(file.name);

    try {
      let transactions: Transaction[];
      let detectedBalance: number | null = null;

      if (isPDF) {
        const result = await parsePDF(file, selectedAccount, data.categoryRules);
        transactions = result.transactions;
        detectedBalance = result.openingBalance;
      } else {
        const result = await parseCSV(file, selectedAccount, data.categoryRules);
        transactions = result.transactions;
        detectedBalance = result.openingBalance;
      }

      const { toAdd: clean, duplicates: dups } = detectDuplicates(transactions, data.transactions);
      setPreview(transactions);
      setToAdd(clean);
      setDuplicates(dups.filter(d => d.level !== "auto"));
      setOpeningBalance(detectedBalance);
      setUpdateBalance(
        detectedBalance !== null &&
        selectedAccountObj !== undefined &&
        selectedAccountObj.initialBalance === 0
      );
      setStep("preview");
    } catch (e: any) {
      setError(e.message || "Erreur lors de l'import");
    }
    setLoading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirmImport = () => {
    if (duplicates.length > 0) { setStep("duplicates"); return; }
    doImport();
  };

  const doImport = () => {
    const month = preview[0]?.date.slice(0, 7) || "";
    const additionalFromDups: Transaction[] = [];
    duplicates.forEach((dup, i) => {
      if ((resolvedDuplicates[i] || "skip") === "replace") additionalFromDups.push(dup.incoming);
    });
    const allNew = [...toAdd, ...additionalFromDups];

    const monthLabel = month
      ? new Date(month + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
      : "";
    const snapshotLabel = `${fileType.toUpperCase()} — ${selectedAccount}${monthLabel ? " — " + monthLabel : ""} (${allNew.length} opérations)`;

    importWithSnapshot(allNew, snapshotLabel, (existing) => {
      if (fileType === "csv") return replaceMonthWithCSV(existing, allNew, month, selectedAccount);
      return [...existing, ...allNew].sort((a, b) => b.date.localeCompare(a.date));
    });

    // Update opening balance if detected and user wants it
    if (updateBalance && openingBalance !== null && selectedAccountObj) {
      dispatch({
        type: "UPDATE_ACCOUNT",
        account: { ...selectedAccountObj, initialBalance: openingBalance },
      });
    }

    setStep("done");
  };

  const handleUndo = () => {
    undoLastImport();
    setStep("idle");
    setPreview([]); setDuplicates([]); setToAdd([]);
    setFileName(""); setOpeningBalance(null);
  };

  const month = preview[0]?.date.slice(0, 7) || "";
  const formatTimestamp = (ts: number) =>
    new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <Layout>
      <div className="px-4 pt-4 space-y-4 animate-stagger">

        <div>
          <p className="section-title">Import</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Importez vos relevés CSV ou PDF</p>
        </div>

        {/* Undo last import */}
        {lastImport && (
          <div className="rounded-2xl p-4 space-y-2"
            style={{ background: "rgba(96,165,250,0.07)", border: "1px solid rgba(96,165,250,0.2)" }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <Clock size={14} style={{ color: "var(--blue)", marginTop: 2, flexShrink: 0 }} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: "var(--blue)" }}>Dernier import</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-2)" }}>{lastImport.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>{formatTimestamp(lastImport.timestamp)}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm(`Annuler l'import "${lastImport.label}" ?\n\nLes ${lastImport.transactionsImported.length} transactions importées seront supprimées.`)) {
                    handleUndo();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all active:scale-95"
                style={{ background: "rgba(96,165,250,0.15)", color: "var(--blue)" }}>
                <RotateCcw size={13} /> Annuler
              </button>
            </div>
          </div>
        )}

        {/* Account selector */}
        <div className="card space-y-2">
          <label className="label">Compte associé</label>
          <select className="input" value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
            {data.accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
          </select>
          {selectedAccountObj && selectedAccountObj.initialBalance === 0 && (
            <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--amber)" }}>
              <Info size={12} />
              Solde initial à 0 — sera mis à jour automatiquement si détecté dans le fichier
            </p>
          )}
          {selectedAccountObj && selectedAccountObj.initialBalance !== 0 && (
            <p className="text-xs" style={{ color: "var(--text-3)" }}>
              Solde initial : {formatEur(selectedAccountObj.initialBalance)}
            </p>
          )}
        </div>

        {/* Drop zone */}
        {step === "idle" && (
          <div
            className="rounded-2xl border-2 border-dashed p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".csv,.pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {loading ? (
              <div className="text-center">
                <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-2"
                  style={{ borderColor: "var(--green)" }} />
                <p className="text-sm" style={{ color: "var(--text-2)" }}>
                  {fileType === "pdf" ? "Extraction PDF en cours..." : "Analyse en cours..."}
                </p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(34,197,94,0.1)" }}>
                  <Upload size={22} style={{ color: "var(--green)" }} />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>Glisser un fichier ici</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>ou cliquer pour sélectionner</p>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: "rgba(34,197,94,0.1)", color: "var(--green)" }}>
                    <FileSpreadsheet size={13} /> CSV
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)" }}>
                    <FileText size={13} /> PDF
                  </div>
                </div>
              </>
            )}
            {error && <p className="text-sm font-medium" style={{ color: "var(--red)" }}>{error}</p>}
          </div>
        )}

        {/* Preview */}
        {step === "preview" && (
          <div className="space-y-3 fade-up">
            <div className="rounded-xl p-4" style={{ background: "var(--surface-2)" }}>
              <div className="flex items-center gap-3 mb-3">
                {fileType === "pdf"
                  ? <FileText size={18} style={{ color: "var(--red)" }} />
                  : <FileSpreadsheet size={18} style={{ color: "var(--green)" }} />}
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                    {preview.length} transactions détectées
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>
                    {fileName} · {month} · {selectedAccount}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {preview.slice(0, 20).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs truncate" style={{ color: "var(--text)" }}>{tx.label}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-3)" }}>{tx.date} · {tx.category}</p>
                    </div>
                    <span className="text-xs font-bold font-num ml-2 shrink-0"
                      style={{ color: tx.amount >= 0 ? "var(--green)" : "var(--red)" }}>
                      {tx.amount >= 0 ? "+" : ""}{formatEur(tx.amount)}
                    </span>
                  </div>
                ))}
                {preview.length > 20 && (
                  <p className="text-xs text-center pt-1" style={{ color: "var(--text-3)" }}>
                    +{preview.length - 20} autres...
                  </p>
                )}
              </div>
            </div>

            {/* Opening balance detected */}
            {openingBalance !== null && (
              <div className="rounded-xl p-3 space-y-2"
                style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold" style={{ color: "var(--green)" }}>
                    ✅ Solde d'ouverture détecté : {formatEur(openingBalance)}
                  </p>
                  <button
                    onClick={() => setUpdateBalance(!updateBalance)}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
                    style={{
                      background: updateBalance ? "rgba(34,197,94,0.15)" : "var(--surface-3)",
                      color: updateBalance ? "var(--green)" : "var(--text-3)",
                    }}>
                    {updateBalance ? "Appliquer ✓" : "Ignorer"}
                  </button>
                </div>
                {updateBalance && selectedAccountObj && (
                  <p className="text-xs" style={{ color: "var(--text-2)" }}>
                    Le solde initial de <strong>{selectedAccount}</strong> passera de{" "}
                    <strong>{formatEur(selectedAccountObj.initialBalance)}</strong> à{" "}
                    <strong>{formatEur(openingBalance)}</strong>.
                  </p>
                )}
              </div>
            )}

            {fileType === "csv" && (
              <div className="rounded-xl p-3 flex items-start gap-2"
                style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <AlertTriangle size={15} style={{ color: "var(--amber)", marginTop: 1 }} />
                <p className="text-xs" style={{ color: "var(--amber)" }}>
                  Les transactions manuelles du mois <strong>{month}</strong> pour <strong>{selectedAccount}</strong> seront remplacées.
                </p>
              </div>
            )}

            {duplicates.length > 0 && (
              <div className="rounded-xl p-3"
                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <p className="text-xs font-semibold" style={{ color: "var(--red)" }}>
                  {duplicates.length} doublon(s) potentiel(s) détecté(s)
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={handleConfirmImport}>
                <Check size={15} /> Confirmer l'import
              </button>
              <button className="btn-ghost px-3" onClick={() => setStep("idle")}>
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Duplicates */}
        {step === "duplicates" && (
          <div className="space-y-3 fade-up">
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>Résolution des doublons</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Ces transactions ressemblent à des existantes</p>
            </div>
            {duplicates.map((dup, i) => (
              <div key={i} className="card space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--amber)" }}>🟠 Doublon potentiel</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[{ label: "Existant", tx: dup.existing }, { label: "Nouveau", tx: dup.incoming }].map(({ label, tx }) => (
                    <div key={label} className="rounded-lg p-2" style={{ background: "var(--surface-2)" }}>
                      <p className="font-semibold mb-1" style={{ color: "var(--text-3)" }}>{label}</p>
                      <p style={{ color: "var(--text)" }}>{tx.label}</p>
                      <p style={{ color: "var(--text-3)" }}>{tx.date}</p>
                      <p className="font-bold" style={{ color: tx.amount >= 0 ? "var(--green)" : "var(--red)" }}>
                        {formatEur(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "skip", label: "Ignorer", color: "var(--text-3)" },
                    { key: "keep", label: "Garder les 2", color: "var(--blue)" },
                    { key: "replace", label: "Remplacer", color: "var(--amber)" },
                  ].map(({ key, label, color }) => (
                    <button key={key}
                      onClick={() => setResolvedDuplicates(r => ({ ...r, [i]: key as any }))}
                      className="py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: resolvedDuplicates[i] === key ? `${color}22` : "var(--surface-2)",
                        color: resolvedDuplicates[i] === key ? color : "var(--text-2)",
                        border: resolvedDuplicates[i] === key ? `1px solid ${color}44` : "1px solid transparent",
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button className="btn-primary w-full" onClick={doImport}>
              <Check size={15} /> Terminer l'import
            </button>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="card text-center py-8 fade-up">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif", color: "var(--text)" }}>
              Import réussi !
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>
              {toAdd.length} transactions importées
              {updateBalance && openingBalance !== null && (
                <span> · solde initial mis à jour</span>
              )}
            </p>
            <button className="btn-ghost mt-4 mx-auto"
              onClick={() => { setStep("idle"); setPreview([]); setDuplicates([]); setToAdd([]); setFileName(""); setOpeningBalance(null); }}>
              Importer un autre fichier
            </button>
          </div>
        )}

        {/* Tips */}
        {step === "idle" && (
          <div className="card space-y-2">
            <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>💡 Conseils</p>
            {[
              "Vérifiez toujours le compte sélectionné avant de valider",
              "Le solde d'ouverture est détecté automatiquement depuis le relevé",
              "PDF : utilisez le relevé officiel numérique (pas un scan)",
              "En cas d'erreur, utilisez le bouton Annuler en haut",
            ].map((tip, i) => (
              <p key={i} className="text-xs" style={{ color: "var(--text-3)" }}>• {tip}</p>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
