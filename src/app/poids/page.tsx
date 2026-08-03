"use client";

import { useState, useEffect, useCallback } from "react";
import { WeightChart } from "@/components/WeightChart";
import { WeightEntry } from "@/lib/types";
import * as firestore from "@/lib/firestore";
import { Plus, Scale, Trash2 } from "lucide-react";

type RangeKey = "30d" | "90d" | "1y" | "all";

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "30d", label: "30 jours", days: 30 },
  { key: "90d", label: "3 mois", days: 90 },
  { key: "1y", label: "1 an", days: 365 },
  { key: "all", label: "Tout", days: null },
];

export default function PoidsPage() {
  const [allEntries, setAllEntries] = useState<WeightEntry[]>([]);
  const [range, setRange] = useState<RangeKey>("all");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      // On charge TOUT l'historique une seule fois ; le filtrage par période
      // se fait côté client (instantané, pas de re-fetch réseau).
      const data = await firestore.getAllWeightEntries();
      setAllEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Entrées filtrées selon la période sélectionnée.
  const entries = (() => {
    const r = RANGES.find((x) => x.key === range)!;
    if (r.days === null) return allEntries;
    const since = new Date();
    since.setDate(since.getDate() - r.days);
    const sinceStr = since.toISOString().split("T")[0];
    return allEntries.filter((e) => e.date >= sinceStr);
  })();

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleSubmit = async () => {
    const numVal = parseFloat(value.replace(",", "."));
    if (isNaN(numVal) || numVal < 30 || numVal > 300) return;

    setLoading(true);
    try {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const id = await firestore.upsertWeightEntry(numVal);
      setAllEntries((prev) => {
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

  const handleDelete = async (entry: WeightEntry) => {
    setDeleting(entry.id);
    try {
      await firestore.deleteWeightEntry(entry.id);
      setAllEntries((prev) => prev.filter((e) => e.id !== entry.id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  const lastEntry = allEntries[allEntries.length - 1];
  const firstEntry = allEntries[0];

  // Progression : poids total depuis le 1er enregistrement (motivant !).
  const totalChange =
    lastEntry && firstEntry && allEntries.length > 1
      ? lastEntry.value - firstEntry.value
      : null;
  const rangeLabel = RANGES.find((r) => r.key === range)!.label;

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Poids
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Évolution — {rangeLabel.toLowerCase()}
          {allEntries.length > 1 && (
            <span className="ml-1 text-slate-600">
              ({allEntries.length} mesures)
            </span>
          )}
        </p>
      </header>

      {/* Indicateur de progression depuis le 1er enregistrement */}
      {totalChange !== null && totalChange !== 0 && (
        <div className="flex items-center gap-3 bg-slate-900/40 rounded-xl p-3 border border-slate-800/30">
          <span
            className={`text-lg ${totalChange < 0 ? "text-emerald-400" : "text-orange-400"}`}
          >
            {totalChange < 0 ? "▼" : "▲"}
          </span>
          <div>
            <p className="text-sm text-slate-300">
              {totalChange < 0 ? "Perdu" : "Pris"}{" "}
              <span
                className={`font-bold ${totalChange < 0 ? "text-emerald-400" : "text-orange-400"}`}
              >
                {Math.abs(totalChange).toFixed(1)} kg
              </span>{" "}
              <span className="text-slate-500 text-xs">
                depuis le {new Date(firstEntry.date).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </p>
          </div>
        </div>
      )}

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
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-300">Courbe de poids</h2>
          <div className="flex gap-1 bg-slate-800/40 rounded-lg p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  range === r.key
                    ? "bg-emerald-500 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {fetching ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            Chargement...
          </div>
        ) : (
          <WeightChart entries={entries} />
        )}
      </div>

      {entries.length > 0 && (
        <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800/50 space-y-2">
          <h2 className="text-sm font-semibold text-slate-300 mb-2">
            Historique
          </h2>
          {[...entries].reverse().slice(0, showAll ? undefined : 5).map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-white">{entry.value} kg</span>
                <span className="text-xs text-slate-500">
                  {new Date(entry.date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
              <button
                onClick={() => handleDelete(entry)}
                disabled={deleting === entry.id}
                className="p-1.5 text-slate-600 hover:text-red-400 disabled:opacity-50 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {entries.length > 5 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="w-full text-center text-xs text-slate-400 hover:text-emerald-400 py-2 transition-colors"
            >
              {showAll ? "Voir moins" : `Voir tout (${entries.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
