"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";
import { chatWithCoach } from "@/lib/gemini";
import {
  FoodLog,
  WeightEntry,
  DailySummary,
  DAILY_TARGETS,
  USER_PROFILE,
} from "@/lib/types";
import * as firestore from "@/lib/firestore";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function summarizeLogs(logs: FoodLog[]): string {
  const byDay: Record<string, DailySummary & { meals: string[] }> = {};

  for (const log of logs) {
    const day = new Date(log.timestamp).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    });
    if (!byDay[day]) {
      byDay[day] = { calories: 0, protein: 0, carbs: 0, fat: 0, meals: [] };
    }
    byDay[day].calories += log.calories;
    byDay[day].protein += log.protein;
    byDay[day].carbs += log.carbs;
    byDay[day].fat += log.fat;
    byDay[day].meals.push(log.food);
  }

  return Object.entries(byDay)
    .map(([date, s]) => {
      const protPct = Math.round((s.protein / DAILY_TARGETS.protein) * 100);
      const calStatus =
        s.calories >= DAILY_TARGETS.calories
          ? "✅"
          : s.calories >= DAILY_TARGETS.calories * 0.8
            ? "🟡"
            : "🔴";
      return `${date}: ${Math.round(s.calories)}/${DAILY_TARGETS.calories} kcal ${calStatus} | P:${Math.round(s.protein)}g (${protPct}%) | Repas: ${s.meals.join(", ")}`;
    })
    .join("\n");
}

function summarizeWeight(entries: WeightEntry[]): string {
  if (entries.length === 0) return "Aucune donnée de poids.";
  const latest = entries[entries.length - 1];
  const oldest = entries[0];
  const diff = latest.value - oldest.value;
  const trend = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
  const allWeights = entries.map((e) => `${e.date}: ${e.value}kg`).join(", ");
  return `Dernier poids: ${latest.value}kg (${latest.date}) | Évolution: ${trend}kg sur la période | Historique: ${allWeights}`;
}

const BASE_PROMPT = `Tu es FUEL Coach, le coach nutrition personnel d'Anthony. ${USER_PROFILE}

TON ET STYLE :
- Ton "Peer-Engineer" : direct, technique, efficace, pas de bullshit
- Parle en grammes, kcal, index glycémique, ratios macro
- Sois concis : 3-5 phrases max par réponse sauf si demande détaillée
- Français uniquement`;

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [contextData, setContextData] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const [logs, weights] = await Promise.all([
          firestore.getRecentLogs(7),
          firestore.getWeightEntries(30),
        ]);

        const nutritionCtx =
          logs.length > 0
            ? `\n\nDONNÉES NUTRITION (7 derniers jours):\n${summarizeLogs(logs)}`
            : "\n\nAucun repas loggé récemment.";

        const weightCtx = `\n\nSUIVI POIDS (30 jours):\n${summarizeWeight(weights)}`;

        const todayLogs = logs.filter((l) => {
          const today = new Date().toISOString().split("T")[0];
          return new Date(l.timestamp).toISOString().split("T")[0] === today;
        });
        const todayCtx =
          todayLogs.length > 0
            ? `\n\nAUJOURD'HUI: ${todayLogs.length} repas loggés → ${summarizeLogs(todayLogs)}`
            : "\n\nAUJOURD'HUI: Aucun repas loggé pour le moment.";

        const full = BASE_PROMPT + nutritionCtx + weightCtx + todayCtx;
        setContextData(full);

        const todaySummary = todayLogs.reduce(
          (acc, l) => ({
            calories: acc.calories + l.calories,
            protein: acc.protein + l.protein,
          }),
          { calories: 0, protein: 0 },
        );

        setMessages([
          {
            role: "assistant",
            content: `Anthony. ${todayLogs.length > 0 ? `Aujourd'hui: ${Math.round(todaySummary.calories)}/${DAILY_TARGETS.calories} kcal, ${Math.round(todaySummary.protein)}/${DAILY_TARGETS.protein}g protéines.` : "Aucun repas loggé aujourd'hui."} ${weights.length > 0 ? `Dernier poids: ${weights[weights.length - 1].value}kg.` : ""} Tes targets: ${DAILY_TARGETS.calories} kcal, ${DAILY_TARGETS.protein}g P. Go.`,
          },
        ]);
      } catch {
        setContextData(BASE_PROMPT);
        setMessages([
          {
            role: "assistant",
            content: `Anthony. Tes targets: ${DAILY_TARGETS.calories} kcal, ${DAILY_TARGETS.protein}g protéines. Je n'ai pas pu charger tes données. On y va quand même.`,
          },
        ]);
      } finally {
        setReady(true);
      }
    }
    load();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : ("user" as const),
        parts: [{ text: m.content }],
      }));

      const fullContents = [
        { role: "user" as const, parts: [{ text: contextData }] },
        {
          role: "model" as const,
          parts: [{ text: "Contexte chargé. J'ai tes données nutrition et poids en tête." }],
        },
        ...history,
        { role: "user" as const, parts: [{ text: input.trim() }] },
      ];

      const response = await chatWithCoach(fullContents);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Erreur. Réessaie.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] animate-fade-in">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Coach</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Tes données sont en contexte
        </p>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2.5 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center mt-1">
                <Bot size={14} className="text-emerald-500" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                msg.role === "user"
                  ? "bg-emerald-600 text-white rounded-br-md"
                  : "bg-slate-800/80 text-slate-200 rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="shrink-0 w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center mt-1">
                <User size={14} className="text-slate-300" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Bot size={14} className="text-emerald-500" />
            </div>
            <div className="bg-slate-800/80 rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 size={16} className="animate-spin text-emerald-500" />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 bg-slate-900/80 rounded-2xl border border-slate-800/50 p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Pose ta question..."
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none py-2 px-2"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="p-2 text-emerald-500 disabled:text-slate-600 disabled:opacity-50 transition-colors"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
