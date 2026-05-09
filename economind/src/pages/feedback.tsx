"use client";
import React, { useState } from "react";
import Layout from "@/components/Layout";
import { useApp } from "@/context/AppContext";
import { getCurrentMonth } from "@/lib/analytics";
import { Bug, Lightbulb, HelpCircle, ThumbsUp, Mail } from "lucide-react";

// ── Ton adresse email ─────────────────────────────────────────────────────────
const SUPPORT_EMAIL = "TON_EMAIL@gmail.com"; // ← remplace ici
// ─────────────────────────────────────────────────────────────────────────────

const FEEDBACK_TYPES = [
  { id: "bug",        label: "Bug / Erreur",   icon: Bug,        color: "#ef4444", placeholder: "Décris ce qui s'est passé, les étapes pour reproduire le problème..." },
  { id: "suggestion", label: "Suggestion",      icon: Lightbulb,  color: "#f59e0b", placeholder: "Décris ton idée et pourquoi ce serait utile..." },
  { id: "question",   label: "Question",        icon: HelpCircle, color: "#3b82f6", placeholder: "Quelle est ta question ?" },
  { id: "other",      label: "Autre",           icon: ThumbsUp,   color: "#22c55e", placeholder: "Ton message..." },
] as const;

type FeedbackType = typeof FEEDBACK_TYPES[number]["id"];

export default function Feedback() {
  const { data } = useApp();
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [includeContext, setIncludeContext] = useState(true);

  const currentMonth = getCurrentMonth();
  const selectedType = FEEDBACK_TYPES.find(f => f.id === type)!;

  const context = includeContext
    ? `\n\n---\nContexte : ${data.transactions.length} transactions, ${data.accounts.length} comptes, mois ${currentMonth}`
    : "";

  const subject = encodeURIComponent(`[EconoMind] ${selectedType.label}`);
  const body = encodeURIComponent(message + context);
  const mailtoLink = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

  const canSend = message.trim().length >= 10;

  return (
    <Layout>
      <div className="px-4 pt-4 space-y-4 animate-stagger">

        <div>
          <p className="section-title">Signaler / Suggérer</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
            Un bug, une idée, une question ? Écris-nous directement.
          </p>
        </div>

        {/* Type selector */}
        <div className="grid grid-cols-2 gap-2">
          {FEEDBACK_TYPES.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => setType(id)}
              className="flex items-center gap-2 p-3 rounded-xl transition-all text-left"
              style={{
                background: type === id ? `${color}12` : "var(--surface)",
                border: type === id ? `1.5px solid ${color}40` : "1.5px solid var(--border)",
              }}
            >
              <Icon size={15} style={{ color: type === id ? color : "var(--text-3)" }} />
              <span className="text-xs font-semibold" style={{ color: type === id ? color : "var(--text)" }}>
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* Message */}
        <div className="card space-y-3">
          <div>
            <label className="label">Message</label>
            <textarea
              className="input resize-none"
              rows={6}
              placeholder={selectedType.placeholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-[10px] mt-1 text-right"
              style={{ color: message.length >= 10 ? "var(--green)" : "var(--text-3)" }}>
              {message.length} caractères
            </p>
          </div>

          {/* Context toggle */}
          <button
            onClick={() => setIncludeContext(!includeContext)}
            className="flex items-center justify-between w-full py-2 px-3 rounded-xl text-xs transition-all"
            style={{ background: "var(--surface-2)" }}
          >
            <span style={{ color: "var(--text-2)" }}>
              Joindre le contexte technique
              <span className="ml-1.5" style={{ color: "var(--text-3)" }}>
                ({data.transactions.length} tx, {data.accounts.length} comptes)
              </span>
            </span>
            <span
              className="px-2 py-0.5 rounded-lg text-[10px] font-semibold"
              style={{
                background: includeContext ? "rgba(34,197,94,0.15)" : "var(--surface-3)",
                color: includeContext ? "var(--green)" : "var(--text-3)",
              }}
            >
              {includeContext ? "Inclus ✓" : "Exclu"}
            </span>
          </button>
        </div>

        {/* Send button */}
        <a
          href={mailtoLink}
          className="btn-primary w-full justify-center py-3 text-base"
          style={{
            opacity: canSend ? 1 : 0.4,
            pointerEvents: canSend ? "auto" : "none",
            textDecoration: "none",
            display: "flex",
          }}
        >
          <Mail size={16} />
          Ouvrir dans ma messagerie
        </a>

        <p className="text-xs text-center" style={{ color: "var(--text-3)" }}>
          Ton application mail s'ouvrira avec le message pré-rempli.
        </p>

      </div>
    </Layout>
  );
}
