"use client";

import { useState, useEffect } from "react";
import { FoodLog, DAILY_TARGETS } from "@/lib/types";
import * as firestore from "@/lib/firestore";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";

interface DayData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function WeeklySummary() {
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const logs = await firestore.getRecentLogs(7);
        const byDay = new Map<string, DayData>();

        for (const log of logs) {
          const date = new Date(log.timestamp).toISOString().split("T")[0];
          const existing = byDay.get(date) || { date, calories: 0, protein: 0, carbs: 0, fat: 0 };
          existing.calories += log.calories;
          existing.protein += log.protein;
          existing.carbs += log.carbs;
          existing.fat += log.fat;
          byDay.set(date, existing);
        }

        setDays(Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date)));
      } catch (err) {
        console.error("[FUEL] WeeklySummary error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return null;
  if (days.length === 0) return null;

  const n = days.length;
  const avgCal = Math.round(days.reduce((s, d) => s + d.calories, 0) / n);
  const avgProt = Math.round(days.reduce((s, d) => s + d.protein, 0) / n);
  const daysOnTarget = days.filter((d) => d.calories <= DAILY_TARGETS.calories + 100).length;
  const adherence = Math.round((daysOnTarget / n) * 100);

  const calDiff = avgCal - DAILY_TARGETS.calories;
  const TrendIcon = calDiff > 100 ? TrendingUp : calDiff < -100 ? TrendingDown : Minus;
  const trendColor = calDiff > 100 ? "text-red-400" : calDiff < -100 ? "text-emerald-400" : "text-slate-400";

  return (
    <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/50">
      <div className="flex items-center gap-2 mb-2">
        <Calendar size={14} className="text-emerald-500" />
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Résumé {n}j
        </h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-slate-500 uppercase">Moy. kcal</p>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-white">{avgCal}</span>
            <TrendIcon size={12} className={trendColor} />
          </div>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase">Moy. prot</p>
          <span className="text-sm font-bold text-white">{avgProt}g</span>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase">Adhérence</p>
          <span className={`text-sm font-bold ${adherence >= 70 ? "text-emerald-400" : adherence >= 40 ? "text-amber-400" : "text-red-400"}`}>
            {adherence}%
          </span>
        </div>
      </div>
    </div>
  );
}
