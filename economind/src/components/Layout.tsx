"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  LayoutDashboard, ArrowDownUp, Upload,
  BarChart3, Target, Settings, Download,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { exportData, importData } from "@/lib/store";

const NAV = [
  { href: "/",             icon: LayoutDashboard, label: "Dashboard" },
  { href: "/transactions", icon: ArrowDownUp,     label: "Transactions" },
  { href: "/import",       icon: Upload,          label: "Import" },
  { href: "/objectifs",    icon: Target,          label: "Objectifs" },
  { href: "/analyse",      icon: BarChart3,       label: "Analyse" },
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
    const last = data?.lastBackup;
    if (!last || Date.now() - last > 7 * 24 * 3600 * 1000) {
      setBackupNag(true);
    }
  }, [data?.lastBackup]);

  useEffect(() => {
    if (!data) return;
    if (data.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [data?.darkMode]);

  const handleExport = () => {
    exportData(data);
    dispatch({ type: "SET_LAST_BACKUP", ts: Date.now() });
    setBackupNag(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header
        className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between border-b"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        }}
      >
        <span className="text-lg font-bold tracking-tight"
          style={{ fontFamily: "'Syne', sans-serif", color: "var(--green)" }}>
          EconoMind
        </span>
        <div className="flex items-center gap-1">
          {showInstall && (
            <button
              onClick={async () => { (installPrompt as any).prompt(); setShowInstall(false); }}
              className="btn-ghost text-xs px-2 py-1.5"
            >
              Installer
            </button>
          )}
          <button
            onClick={handleExport}
            className="p-2 rounded-lg"
            style={{ color: "var(--text-2)" }}
            title="Exporter les données"
          >
            <Download size={17} />
          </button>
          <Link
            href="/parametres"
            className="p-2 rounded-lg transition-colors"
            style={{
              color: router.pathname === "/parametres" ? "var(--green)" : "var(--text-2)",
            }}
            title="Paramètres"
          >
            <Settings size={17} />
          </Link>
        </div>
      </header>

      {backupNag && (
        <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl flex items-center justify-between text-sm fade-up"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "var(--amber)" }}>
          <span>💾 Pense à sauvegarder tes données</span>
          <button onClick={handleExport} className="font-semibold underline ml-3 shrink-0">Exporter</button>
        </div>
      )}

      <main className="pb-nav">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t"
        style={{ background: "var(--surface)", borderColor: "var(--border)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = router.pathname === href;
            return (
              <Link key={href} href={href}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors"
                style={{ color: active ? "var(--green)" : "var(--text-3)" }}>
                <Icon size={19} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[9px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
