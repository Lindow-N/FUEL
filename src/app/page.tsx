"use client";

import { useState, useEffect, useCallback } from "react";
import { CircularProgress } from "@/components/CircularProgress";
import { MacroCard } from "@/components/MacroCard";
import { MealLog } from "@/components/MealLog";
import { AiInput } from "@/components/AiInput";
import { Toast } from "@/components/Toast";
import { FoodLog, DailySummary, DAILY_TARGETS } from "@/lib/types";
import { analyzeFood, refineFood } from "@/lib/gemini";
import * as firestore from "@/lib/firestore";
import { Flame, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

interface ToastData {
  message: string;
  type: "success" | "error";
}

export default function Dashboard() {
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [toast, setToast] = useState<ToastData | null>(null);

  const today = toDateStr(new Date());
  const isToday = selectedDate === today;

  const fetchLogs = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const data = await firestore.getDailyLogs(selectedDate);
      setLogs(data);
    } catch (err) {
      console.error("[FUEL] fetchLogs error:", err);
      setError("Erreur de chargement. Vérifie ta connexion.");
      setLogs([]);
    } finally {
      setFetching(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const goBack = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(toDateStr(d));
  };

  const goForward = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const next = toDateStr(d);
    if (next <= today) setSelectedDate(next);
  };

  const summary: DailySummary = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fat: acc.fat + log.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const handleAiSubmit = async (text: string, imageBase64?: string, imageMime?: string) => {
    setLoading(true);
    try {
      const data = await analyzeFood(text, imageBase64, imageMime);
      const id = await firestore.addFoodLog(data);
      if (isToday) {
        setLogs((prev) => [{ id, ...data, timestamp: Date.now() }, ...prev]);
      }
      setToast({ message: `${data.food} — ${data.calories} kcal loggé`, type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: "Erreur lors de l'analyse", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await firestore.deleteFoodLog(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
      setToast({ message: "Repas supprimé", type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: "Erreur lors de la suppression", type: "error" });
    }
  };

  const handleDuplicate = async (log: FoodLog) => {
    try {
      const { id, timestamp, ...data } = log;
      const newId = await firestore.addFoodLog(data);
      setLogs((prev) => [{ id: newId, ...data, timestamp: Date.now() }, ...prev]);
      setToast({ message: `${data.food} dupliqué`, type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: "Erreur lors de la duplication", type: "error" });
    }
  };

  const handleEdit = async (log: FoodLog, correction: string) => {
    setEditLoading(true);
    try {
      const data = await refineFood(log, correction);
      await firestore.updateFoodLog(log.id, data);
      setLogs((prev) =>
        prev.map((l) => (l.id === log.id ? { ...l, ...data } : l))
      );
      setToast({ message: `${data.food} — corrigé`, type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: "Erreur lors de la correction", type: "error" });
    } finally {
      setEditLoading(false);
    }
  };

  const displayDate = new Date(selectedDate).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            FUEL
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-500">
          <Flame size={18} />
          <span className="text-sm font-semibold">{summary.calories}</span>
        </div>
      </header>

      <div className="flex items-center justify-between bg-slate-900/60 rounded-xl px-2 py-1.5 border border-slate-800/50">
        <button
          onClick={goBack}
          className="p-1.5 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => setSelectedDate(today)}
          className="text-sm font-medium text-slate-200 hover:text-emerald-400 transition-colors"
        >
          {displayDate}
          {isToday && (
            <span className="text-[10px] text-emerald-500 ml-1.5 uppercase font-semibold">
              aujourd&apos;hui
            </span>
          )}
        </button>
        <button
          onClick={goForward}
          disabled={isToday}
          className="p-1.5 text-slate-400 hover:text-white disabled:text-slate-700 disabled:opacity-40 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {!isToday && (
        <button
          onClick={() => setSelectedDate(today)}
          className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-semibold transition-colors"
        >
          ← Revenir à aujourd&apos;hui
        </button>
      )}

      <div className="flex flex-col items-center py-4">
        <CircularProgress
          value={summary.calories}
          max={DAILY_TARGETS.calories}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MacroCard
          label="Protéines"
          value={Math.round(summary.protein)}
          target={DAILY_TARGETS.protein}
          unit="g"
          color="#10b981"
        />
        <MacroCard
          label="Glucides"
          value={Math.round(summary.carbs)}
          target={DAILY_TARGETS.carbs}
          unit="g"
          color="#3b82f6"
        />
        <MacroCard
          label="Lipides"
          value={Math.round(summary.fat)}
          target={DAILY_TARGETS.fat}
          unit="g"
          color="#f59e0b"
        />
      </div>

      {isToday && <AiInput onSubmit={handleAiSubmit} loading={loading} />}

      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">
          Repas{!isToday ? ` — ${displayDate}` : " du jour"}
        </h2>
        {fetching ? (
          <div className="text-center py-6 text-slate-500 text-sm">
            Chargement...
          </div>
        ) : error ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={fetchLogs}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
            >
              <RefreshCw size={12} />
              Réessayer
            </button>
          </div>
        ) : (
          <MealLog
            logs={logs}
            onDelete={isToday ? handleDelete : undefined}
            onDuplicate={isToday ? handleDuplicate : undefined}
            onEdit={isToday ? handleEdit : undefined}
            editLoading={editLoading}
          />
        )}
      </div>
    </div>
  );
}
