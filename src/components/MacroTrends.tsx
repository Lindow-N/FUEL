"use client";

import { useState, useEffect } from "react";
import * as firestore from "@/lib/firestore";
import { DAILY_TARGETS } from "@/lib/types";
import { BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

interface DayMacro {
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function MacroTrends() {
  const [data, setData] = useState<DayMacro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const logs = await firestore.getRecentLogs(7);
        const byDay = new Map<string, DayMacro>();

        for (const log of logs) {
          const date = new Date(log.timestamp).toISOString().split("T")[0];
          const label = new Date(date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
          const existing = byDay.get(date) || { label, calories: 0, protein: 0, carbs: 0, fat: 0 };
          existing.calories += log.calories;
          existing.protein += log.protein;
          existing.carbs += log.carbs;
          existing.fat += log.fat;
          byDay.set(date, existing);
        }

        const sorted = Array.from(byDay.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, v]) => ({
            ...v,
            calories: Math.round(v.calories),
            protein: Math.round(v.protein),
            carbs: Math.round(v.carbs),
            fat: Math.round(v.fat),
          }));

        setData(sorted);
      } catch (err) {
        console.error("[FUEL] MacroTrends error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return null;
  if (data.length < 2) return null;

  return (
    <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/50">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={14} className="text-emerald-500" />
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Tendance {data.length}j
        </h3>
      </div>
      <div className="w-full h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="label"
              stroke="#475569"
              tick={{ fill: "#64748b", fontSize: 10 }}
              axisLine={{ stroke: "#1e293b" }}
            />
            <YAxis
              stroke="#475569"
              tick={{ fill: "#64748b", fontSize: 10 }}
              axisLine={{ stroke: "#1e293b" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "12px",
                fontSize: "11px",
                color: "#e2e8f0",
              }}
            />
            <ReferenceLine
              y={DAILY_TARGETS.calories}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            <Bar dataKey="calories" fill="#10b981" radius={[4, 4, 0, 0]} name="Calories" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-4 mt-2">
        <span className="text-[10px] text-slate-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          Calories
        </span>
        <span className="text-[10px] text-slate-500 flex items-center gap-1">
          <span className="w-2 h-0.5 bg-emerald-500/50 inline-block border-dashed" />
          Objectif {DAILY_TARGETS.calories}
        </span>
      </div>
    </div>
  );
}
