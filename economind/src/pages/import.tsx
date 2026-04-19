"use client";
import React, { useState, useRef } from "react";
import Layout from "@/components/Layout";
import { useApp } from "@/context/AppContext";
import { parseCSV, replaceMonthWithCSV } from "@/lib/csvImport";
import { detectDuplicates, DuplicateResult, formatEur } from "@/lib/analytics";
import { Transaction } from "@/lib/store";
import { Upload, FileText, AlertTriangle, Check, X } from "lucide-react";

type Step = "idle" | "preview" | "duplicates" | "done";

export default function Import() {
  const { data, dispatch } = useApp();
  const [step, setStep] = useState<Step>("idle");
  const [selectedAccount, setSelectedAccount] = useState(data.accounts[0]?.name || "");
  const [preview, setPreview] = useState<Transaction[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateResult[]>([]);
  const [toAdd, setToAdd] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resolvedDuplicates, setResolvedDuplicates] = useState<{ [key: string]: "keep" | "replace" | "skip" }>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError("");
    try {
      const parsed = await parseCSV(file, selectedAccount, data.categoryRules);
      const { toAdd: clean, duplicates: dups } = detectDuplicates(parsed, data.transactions);

      // Auto-resolve perfect duplicates
      const toResolve = dups.filter((d) => d.level !== "auto");
      const autoResolved = dups.filter((d) => d.level === "auto");

      setPreview(parsed);
      setToAdd(clean);
      setDuplicates(toResolve);
      setStep("preview");
    } catch (e: any) {
      setError(e.message || "Erreur lors de l'import");
    }
    setLoading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
  };

  const handleConfirmImport = () => {
    if (duplicates.length > 0) {
      setStep("duplicates");
      return;
    }
    doImport();
  };

  const doImport = () => {
    const month = preview[0]?.date.slice(0, 7) || "";
    const replacedExisting = replaceMonthWithCSV(
      data.transactions,
      toAdd,
      month,
      selectedAccount
    );

    // Add resolved duplicates
    const additionalFromDups: Transaction[] = [];
    duplicates.forEach((dup, i) => {
      const resolution = resolvedDuplicates[i] || "skip";
      if (resolution === "replace") {
        additionalFromDups.push(dup.incoming);
      }
    });

    dispatch({
      type: "SET_TRANSACTIONS",
      transactions: [...replacedExisting, ...additionalFromDups],
    });
    setStep("done");
  };

  const month = preview[0]?.date.slice(0, 7) || "";

  return (
    <Layout>
      <div className="px-4 pt-4 space-y-4 animate-stagger">

        <div>
          <p className="section-title">Import CSV</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
            Import automatique depuis votre banque
          </p>
        </div>

        {/* Account selector */}
        <div className="card space-y-2">
          <label className="label">Compte associé</label>
          <select
            className="input"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            {data.accounts.map((a) => (
              <option key={a.id} value={a.name}>{a.name}</option>
            ))}
          </select>
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
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {loading ? (
              <div className="text-center">
                <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-2" style={{ borderColor: "var(--green)" }} />
                <p className="text-sm" style={{ color: "var(--text-2)" }}>Analyse en cours...</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)" }}>
                  <Upload size={22} style={{ color: "var(--green)" }} />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                    Glisser un fichier CSV
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                    ou cliquer pour sélectionner
                  </p>
                </div>
                <div
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ background: "var(--surface-2)", color: "var(--text-3)" }}
                >
                  Formats : exports bancaires standards (BNP, CA, SG, La Banque Postale, etc.)
                </div>
              </>
            )}
            {error && (
              <p className="text-sm text-red-400 font-medium">{error}</p>
            )}
          </div>
        )}

        {/* Preview */}
        {step === "preview" && (
          <div className="space-y-3 fade-up">
            <div
              className="rounded-xl p-4"
              style={{ background: "var(--surface-2)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <FileText size={18} style={{ color: "var(--green)" }} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                    {preview.length} transactions détectées
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>
                    {month} · {selectedAccount}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {preview.slice(0, 20).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs truncate" style={{ color: "var(--text)" }}>{tx.label}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-3)" }}>{tx.date} · {tx.category}</p>
                    </div>
                    <span
                      className="text-xs font-bold font-num ml-2 shrink-0"
                      style={{ color: tx.amount >= 0 ? "var(--green)" : "var(--red)" }}
                    >
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

            <div
              className="rounded-xl p-3 flex items-start gap-2"
              style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <AlertTriangle size={15} style={{ color: "var(--amber)", marginTop: 1 }} />
              <p className="text-xs" style={{ color: "var(--amber)" }}>
                Les transactions manuelles du mois <strong>{month}</strong> pour le compte <strong>{selectedAccount}</strong> seront remplacées par cet import.
              </p>
            </div>

            {duplicates.length > 0 && (
              <div className="rounded-xl p-3" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <p className="text-xs font-semibold" style={{ color: "var(--red)" }}>
                  {duplicates.length} doublon(s) potentiel(s) détecté(s) — à résoudre à l'étape suivante
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={handleConfirmImport}>
                <Check size={15} />
                Confirmer l'import
              </button>
              <button className="btn-ghost px-3" onClick={() => setStep("idle")}>
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Duplicate resolution */}
        {step === "duplicates" && (
          <div className="space-y-3 fade-up">
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                Résolution des doublons
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                Ces transactions ressemblent à des existantes
              </p>
            </div>

            {duplicates.map((dup, i) => (
              <div key={i} className="card space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--amber)" }}>
                  🟠 Doublon potentiel
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg p-2" style={{ background: "var(--surface-2)" }}>
                    <p className="font-semibold mb-1" style={{ color: "var(--text-3)" }}>Existant</p>
                    <p style={{ color: "var(--text)" }}>{dup.existing.label}</p>
                    <p style={{ color: "var(--text-3)" }}>{dup.existing.date}</p>
                    <p className="font-bold" style={{ color: dup.existing.amount >= 0 ? "var(--green)" : "var(--red)" }}>
                      {formatEur(dup.existing.amount)}
                    </p>
                  </div>
                  <div className="rounded-lg p-2" style={{ background: "var(--surface-2)" }}>
                    <p className="font-semibold mb-1" style={{ color: "var(--text-3)" }}>Nouveau</p>
                    <p style={{ color: "var(--text)" }}>{dup.incoming.label}</p>
                    <p style={{ color: "var(--text-3)" }}>{dup.incoming.date}</p>
                    <p className="font-bold" style={{ color: dup.incoming.amount >= 0 ? "var(--green)" : "var(--red)" }}>
                      {formatEur(dup.incoming.amount)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "skip", label: "Ignorer", color: "var(--text-3)" },
                    { key: "keep", label: "Garder les 2", color: "var(--blue)" },
                    { key: "replace", label: "Remplacer", color: "var(--amber)" },
                  ].map(({ key, label, color }) => (
                    <button
                      key={key}
                      onClick={() => setResolvedDuplicates((r) => ({ ...r, [i]: key as any }))}
                      className="py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: resolvedDuplicates[i] === key ? `${color}22` : "var(--surface-2)",
                        color: resolvedDuplicates[i] === key ? color : "var(--text-2)",
                        border: resolvedDuplicates[i] === key ? `1px solid ${color}44` : "1px solid transparent",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <button className="btn-primary w-full" onClick={doImport}>
              <Check size={15} />
              Terminer l'import
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
            </p>
            <button
              className="btn-ghost mt-4 mx-auto"
              onClick={() => { setStep("idle"); setPreview([]); setDuplicates([]); setToAdd([]); }}
            >
              Importer un autre fichier
            </button>
          </div>
        )}

        {/* Tips */}
        <div className="card space-y-2">
          <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>💡 Conseils import</p>
          {[
            "Téléchargez votre relevé CSV depuis l'espace client de votre banque",
            "Format accepté : colonnes date, libellé, montant (ou débit/crédit)",
            "La catégorisation est automatique et s'améliore avec vos corrections",
            "Un import CSV remplace les transactions manuelles du même mois",
          ].map((tip, i) => (
            <p key={i} className="text-xs" style={{ color: "var(--text-3)" }}>
              • {tip}
            </p>
          ))}
        </div>
      </div>
    </Layout>
  );
}
