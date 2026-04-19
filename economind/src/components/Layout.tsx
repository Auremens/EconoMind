"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  LayoutDashboard,
  ArrowDownUp,
  Target,
  BarChart3,
  Settings,
  Moon,
  Sun,
  Download,
  Upload,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { exportData, importData } from "@/lib/store";

const NAV = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/transactions", icon: ArrowDownUp, label: "Transactions" },
  { href: "/import", icon: Upload, label: "Import" },
  { href: "/objectifs", icon: Target, label: "Objectifs" },
  { href: "/analyse", icon: BarChart3, label: "Analyse" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data, dispatch } = useApp();
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [backupNag, setBackupNag] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    // Show backup nag every 7 days
    const last = data?.lastBackup;
    if (!last || Date.now() - last > 7 * 24 * 3600 * 1000) {
      setBackupNag(true);
    }
  }, [data?.lastBackup]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    (installPrompt as any).prompt();
    setShowInstall(false);
  };

  const handleExport = () => {
    exportData(data);
    dispatch({ type: "SET_LAST_BACKUP", ts: Date.now() });
    setBackupNag(false);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const restored = await importData(file);
        dispatch({ type: "LOAD", data: restored });
        alert("✅ Données restaurées avec succès !");
      } catch {
        alert("❌ Fichier invalide");
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between border-b"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        }}
      >
        <span
          className="text-lg font-bold tracking-tight"
          style={{ fontFamily: "'Syne', sans-serif", color: "var(--green)" }}
        >
          EconoMind
        </span>
        <div className="flex items-center gap-1">
          {showInstall && (
            <button
              onClick={handleInstall}
              className="btn-ghost text-xs px-2 py-1.5"
            >
              Installer
            </button>
          )}
          <button
            onClick={handleExport}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--text-2)" }}
            title="Exporter les données"
          >
            <Download size={17} />
          </button>
          <button
            onClick={handleImport}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--text-2)" }}
            title="Importer des données"
          >
            <Upload size={17} />
          </button>
          <button
            onClick={() => dispatch({ type: "TOGGLE_DARK" })}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--text-2)" }}
          >
            {data?.darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      {/* Backup nag */}
      {backupNag && (
        <div
          className="mx-4 mt-3 px-4 py-2.5 rounded-xl flex items-center justify-between text-sm fade-up"
          style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.2)",
            color: "var(--amber)",
          }}
        >
          <span>💾 Pense à sauvegarder tes données</span>
          <button
            onClick={handleExport}
            className="font-semibold underline ml-3 shrink-0"
          >
            Exporter
          </button>
        </div>
      )}

      {/* Page content */}
      <main className="pb-nav">{children}</main>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = router.pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors"
                style={{
                  color: active ? "var(--green)" : "var(--text-3)",
                }}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px]">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
