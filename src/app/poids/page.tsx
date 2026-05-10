"use client";

import { useState, useEffect, useCallback } from "react";
import { WeightChart } from "@/components/WeightChart";
import { WeightEntry } from "@/lib/types";
import * as firestore from "@/lib/firestore";
import { Plus, Scale } from "lucide-react";

export default function PoidsPage() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const fetchEntries = useCallback(async () => {
    try {
      const data = await firestore.getWeightEntries(30);
      setEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleSubmit = async () => {
    const numVal = parseFloat(value.replace(",", "."));
    if (isNaN(numVal) || numVal < 30 || numVal > 300) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const id = await firestore.upsertWeightEntry(numVal);
      setEntries((prev) => {
        const filtered = prev.filter((e) => e.date !== today);
        return [...filtered, { id, date: today, value: numVal }].sort(
          (a, b) => a.date.localeCompare(b.date)
        );
      });
      setValue("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const lastEntry = entries[entries.length - 1];

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Poids
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">Évolution sur 30 jours</p>
      </header>

      <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-slate-400 uppercase tracking-wider font-medium">
              Poids du jour
            </label>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                step="0.1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder={lastEntry ? `${lastEntry.value}` : "75.0"}
                className="w-full bg-slate-800/50 rounded-xl px-4 py-3 text-white text-lg font-semibold outline-none border border-slate-700/50 focus:border-emerald-500/50 transition-colors placeholder-slate-600"
              />
              <span className="text-sm text-slate-400 font-medium">kg</span>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || !value}
            className="mt-6 p-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:opacity-50 rounded-xl text-white transition-colors"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      {lastEntry && (
        <div className="flex items-center gap-3 bg-slate-900/40 rounded-xl p-3 border border-slate-800/30">
          <Scale size={18} className="text-emerald-500" />
          <div>
            <p className="text-sm text-slate-300">
              Dernier poids :{" "}
              <span className="font-bold text-white">{lastEntry.value} kg</span>
            </p>
            <p className="text-[11px] text-slate-500">
              {new Date(lastEntry.date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
        </div>
      )}

      <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800/50">
        <h2 className="text-sm font-semibold text-slate-300 mb-2">
          Courbe de poids
        </h2>
        {fetching ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            Chargement...
          </div>
        ) : (
          <WeightChart entries={entries} />
        )}
      </div>
    </div>
  );
}
