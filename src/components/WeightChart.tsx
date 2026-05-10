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

export function WeightChart({ entries }: WeightChartProps) {
  const data = entries.map((e) => ({
    date: new Date(e.date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    }),
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
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date"
            stroke="#475569"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={{ stroke: "#1e293b" }}
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
            dot={{ fill: "#10b981", r: 4, strokeWidth: 0 }}
            activeDot={{ fill: "#34d399", r: 6, strokeWidth: 2, stroke: "#020617" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
