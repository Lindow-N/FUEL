"use client";

import { useState, useEffect, useCallback } from "react";
import { CircularProgress } from "@/components/CircularProgress";
import { MacroCard } from "@/components/MacroCard";
import { MealLog } from "@/components/MealLog";
import { AiInput } from "@/components/AiInput";
import { FoodLog, DailySummary, DAILY_TARGETS } from "@/lib/types";
import { analyzeFood } from "@/lib/gemini";
import * as firestore from "@/lib/firestore";
import { Flame } from "lucide-react";

export default function Dashboard() {
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await firestore.getDailyLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const summary: DailySummary = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fat: acc.fat + log.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const handleAiSubmit = async (text: string, imageBase64?: string) => {
    setLoading(true);
    try {
      const data = await analyzeFood(text, imageBase64);
      const id = await firestore.addFoodLog(data);
      setLogs((prev) => [
        { id, ...data, timestamp: Date.now() },
        ...prev,
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await firestore.deleteFoodLog(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            FUEL
          </h1>
          <p className="text-xs text-slate-500 capitalize mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-500">
          <Flame size={18} />
          <span className="text-sm font-semibold">{summary.calories}</span>
        </div>
      </header>

      <AiInput onSubmit={handleAiSubmit} loading={loading} />

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

      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">
          Repas du jour
        </h2>
        {fetching ? (
          <div className="text-center py-6 text-slate-500 text-sm">
            Chargement...
          </div>
        ) : (
          <MealLog logs={logs} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}
