"use client";
import React, { useState } from "react";
import Layout from "@/components/Layout";
import { useApp } from "@/context/AppContext";
import { exportData } from "@/lib/store";
import { useRouter } from "next/router";
import { Download, Upload, RotateCcw, Trash2, ChevronRight, Moon, Sun, Shield, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function Parametres() {
  const { data, dispatch } = useApp();
  const router = useRouter();
  const [confirmStep, setConfirmStep] = useState<0 | 1 | 2>(0);

  const handleExport = () => {
    exportData(data);
    dispatch({ type: "SET_LAST_BACKUP", ts: Date.now() });
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const { importData } = await import("@/lib/store");
        const restored = await importData(file);
        dispatch({ type: "LOAD", data: restored });
        alert("✅ Données restaurées !");
      } catch {
        alert("❌ Fichier invalide");
      }
    };
    input.click();
  };

  const handleReset = () => {
    // Clear everything
    localStorage.clear();
    // Reload → will trigger onboarding
    window.location.href = "/";
  };

  return (
    <Layout>
      <div className="px-4 pt-4 space-y-5 animate-stagger">

        <div>
          <p className="section-title">Paramètres</p>
        </div>

        {/* Données */}
        <section className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest px-1"
            style={{ color: "var(--text-3)" }}>Données</p>

         <div className="card space-y-0 divide-y divide-gray-800">

            <button onClick={handleExport}
              className="flex items-center justify-between w-full py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(34,197,94,0.1)" }}>
                  <Download size={15} style={{ color: "var(--green)" }} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    Exporter mes données
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>
                    Télécharge un fichier JSON de sauvegarde
                  </p>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: "var(--text-3)" }} />
            </button>

            <button onClick={handleImport}
              className="flex items-center justify-between w-full py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(59,130,246,0.1)" }}>
                  <Upload size={15} style={{ color: "var(--blue)" }} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    Restaurer une sauvegarde
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>
                    Importe un fichier JSON exporté précédemment
                  </p>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: "var(--text-3)" }} />
            </button>

          </div>
        </section>

        {/* Apparence */}
        <section className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest px-1"
            style={{ color: "var(--text-3)" }}>Apparence</p>

          <div className="card">
            <button
              onClick={() => dispatch({ type: "TOGGLE_DARK" })}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(245,158,11,0.1)" }}>
                  {data.darkMode
                    ? <Sun size={15} style={{ color: "var(--amber)" }} />
                    : <Moon size={15} style={{ color: "var(--amber)" }} />}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    {data.darkMode ? "Mode sombre actif" : "Mode clair actif"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>
                    Appuie pour basculer
                  </p>
                </div>
              </div>
              <div
                className="w-10 h-6 rounded-full relative transition-all"
                style={{ background: data.darkMode ? "var(--green)" : "var(--surface-3)" }}
              >
                <div
                  className="w-4 h-4 rounded-full absolute top-1 transition-all"
                  style={{
                    background: "white",
                    left: data.darkMode ? "calc(100% - 1.25rem)" : "0.25rem",
                  }}
                />
              </div>
            </button>
          </div>
        </section>
{/* Support */}
        <section className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest px-1"
            style={{ color: "var(--text-3)" }}>Support</p>
          <div className="card">
            <Link href="/feedback"
              className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(96,165,250,0.1)" }}>
                  <MessageSquare size={15} style={{ color: "var(--blue)" }} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    Signaler / Suggérer
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>
                    Bug, idée, question — écris-nous
                  </p>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: "var(--text-3)" }} />
            </Link>
          </div>
        </section>
        {/* Confidentialité */}
        <section className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest px-1"
            style={{ color: "var(--text-3)" }}>Confidentialité</p>
          <div className="card flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(34,197,94,0.1)" }}>
              <Shield size={15} style={{ color: "var(--green)" }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                100% local
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                Toutes tes données restent sur cet appareil. Aucun serveur, aucune analytics, aucun compte requis.
              </p>
            </div>
          </div>
        </section>

        {/* Zone danger */}
        <section className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest px-1"
            style={{ color: "var(--red)" }}>Zone dangereuse</p>

          <div className="card space-y-4">

            {confirmStep === 0 && (
              <button
                onClick={() => setConfirmStep(1)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.1)" }}>
                    <RotateCcw size={15} style={{ color: "var(--red)" }} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium" style={{ color: "var(--red)" }}>
                      Réinitialiser l'application
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>
                      Efface toutes les données et repart de zéro
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: "var(--red)" }} />
              </button>
            )}

            {confirmStep === 1 && (
              <div className="space-y-3 fade-up">
                <div
                  className="rounded-xl p-3"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--red)" }}>
                    ⚠️ Cette action est irréversible
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-2)" }}>
                    Toutes tes transactions, comptes, objectifs et paramètres seront définitivement supprimés.
                    L'app repartira comme à la première installation.
                  </p>
                  <p className="text-xs font-semibold mt-2" style={{ color: "var(--amber)" }}>
                    Pense à exporter tes données avant si tu veux les conserver.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-ghost flex-1"
                    onClick={() => setConfirmStep(0)}
                  >
                    Annuler
                  </button>
                  <button
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                    style={{ background: "rgba(239,68,68,0.15)", color: "var(--red)" }}
                    onClick={() => setConfirmStep(2)}
                  >
                    Continuer →
                  </button>
                </div>
              </div>
            )}

            {confirmStep === 2 && (
              <div className="space-y-3 fade-up">
                <div
                  className="rounded-xl p-3"
                  style={{ background: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.35)" }}
                >
                  <p className="text-sm font-bold mb-1" style={{ color: "var(--red)" }}>
                    Dernière confirmation
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-2)" }}>
                    {data.transactions.length} transaction{data.transactions.length > 1 ? "s" : ""},{" "}
                    {data.accounts.length} compte{data.accounts.length > 1 ? "s" : ""} et{" "}
                    {data.goals.length} objectif{data.goals.length > 1 ? "s" : ""} seront supprimés.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost flex-1" onClick={() => setConfirmStep(0)}>
                    Annuler
                  </button>
                  <button
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                    style={{ background: "var(--red)", color: "white" }}
                    onClick={handleReset}
                  >
                    <Trash2 size={14} />
                    Tout effacer
                  </button>
                </div>
              </div>
            )}

          </div>
        </section>

        {/* Version */}
        <p className="text-center text-xs pb-2" style={{ color: "var(--text-3)" }}>
          EconoMind — Investir mieux
        </p>

      </div>
    </Layout>
  );
}
