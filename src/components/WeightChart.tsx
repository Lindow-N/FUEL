"use client";

import { WeightEntry } from "@/lib/types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface WeightChartProps {
  entries: WeightEntry[];
}

const MAX_POINTS = 12; // seuil de lisibilité sur mobile

/**
 * Si on a plus de MAX_POINTS entrées, on agrège par semaine (moyenne).
 * Retourne un tableau au même format que l'entrée, mais réduit. Chaque
 * bucket "semaine" est identifié par le lundi de cette semaine ISO.
 */
function downsample(entries: WeightEntry[]): WeightEntry[] {
  if (entries.length <= MAX_POINTS) return entries;

  const buckets = new Map<string, number[]>(); // key=date ISO du lundi -> valeurs
  for (const e of entries) {
    const d = new Date(e.date + "T00:00:00");
    const day = d.getDay(); // 0=dim ... 6=sam
    const offset = day === 0 ? -6 : 1 - day; // ramène au lundi
    const monday = new Date(d);
    monday.setDate(d.getDate() + offset);
    const key = monday.toISOString().split("T")[0];
    const arr = buckets.get(key);
    if (arr) arr.push(e.value);
    else buckets.set(key, [e.value]);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      id: `week_${date}`,
      date,
      value: Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10,
    }));
}

function formatXLabel(isoDate: string, showYear: boolean): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: showYear ? "2-digit" : undefined,
  });
}

export function WeightChart({ entries }: WeightChartProps) {
  const sampled = downsample(entries);
  const isAggregated = sampled.length < entries.length; // a-t-on regroupé par semaine ?
  const showYear = entries.length > 90;

  const data = sampled.map((e) => ({
    date: formatXLabel(e.date, showYear),
    value: e.value,
  }));

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-sm">Aucune donnée de poids</p>
        <p className="text-xs mt-1 text-slate-600">
          Commencez à enregistrer votre poids
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-64 mt-4">
      {isAggregated && (
        <p className="text-[10px] text-slate-600 mb-1 text-right">
          moyenne par semaine
        </p>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date"
            stroke="#475569"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={{ stroke: "#1e293b" }}
            interval={0} // tous les ticks : peu de points après agrégation
            minTickGap={4}
          />
          <YAxis
            stroke="#475569"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={{ stroke: "#1e293b" }}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "12px",
              fontSize: "12px",
              color: "#e2e8f0",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={{ fill: "#10b981", r: 3, strokeWidth: 0 }}
            activeDot={{ fill: "#34d399", r: 6, strokeWidth: 2, stroke: "#020617" }}
            isAnimationActive={data.length <= 60}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
