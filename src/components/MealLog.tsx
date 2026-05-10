"use client";

import { FoodLog } from "@/lib/types";
import { Trash2, Clock } from "lucide-react";

interface MealLogProps {
  logs: FoodLog[];
  onDelete?: (id: string) => void;
}

export function MealLog({ logs, onDelete }: MealLogProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p className="text-sm">Aucun repas enregistré aujourd&apos;hui</p>
        <p className="text-xs mt-1 text-slate-600">
          Utilisez le champ ci-dessus pour logger
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const time = new Date(log.timestamp).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div
            key={log.id}
            className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/50 animate-fade-in flex items-start justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-white truncate">
                  {log.food}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Clock size={10} />
                  {time}
                </span>
              </div>
              <div className="flex gap-3 mt-1.5">
                <span className="text-xs text-emerald-500 font-medium">
                  {log.calories} kcal
                </span>
                <span className="text-xs text-slate-400">
                  P: {log.protein}g
                </span>
                <span className="text-xs text-slate-400">
                  G: {log.carbs}g
                </span>
                <span className="text-xs text-slate-400">
                  L: {log.fat}g
                </span>
              </div>
              {log.analysis && (
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {log.analysis}
                </p>
              )}
            </div>
            {onDelete && (
              <button
                onClick={() => onDelete(log.id)}
                className="p-1.5 text-slate-600 hover:text-red-400 transition-colors shrink-0"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
