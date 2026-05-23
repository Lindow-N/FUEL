"use client";

import { useState } from "react";
import { FoodLog } from "@/lib/types";
import { Trash2, Clock, Copy, Pencil, Send, Loader2, X, Star } from "lucide-react";

interface MealLogProps {
  logs: FoodLog[];
  onDelete?: (id: string) => void;
  onDuplicate?: (log: FoodLog) => void;
  onEdit?: (log: FoodLog, correction: string) => Promise<void>;
  onFavorite?: (log: FoodLog) => void;
  editLoading?: boolean;
}

export function MealLog({ logs, onDelete, onDuplicate, onEdit, onFavorite, editLoading }: MealLogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [correction, setCorrection] = useState("");

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

  const handleEditSubmit = async (log: FoodLog) => {
    if (!correction.trim() || !onEdit) return;
    await onEdit(log, correction.trim());
    setEditingId(null);
    setCorrection("");
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setCorrection("");
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, log: FoodLog) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSubmit(log);
    }
    if (e.key === "Escape") {
      handleEditCancel();
    }
  };

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const time = new Date(log.timestamp).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const isEditing = editingId === log.id;

        return (
          <div
            key={log.id}
            className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/50 animate-fade-in"
          >
            <div className="flex items-start justify-between gap-3">
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
                <div className="flex flex-col gap-1 shrink-0">
                  {onEdit && !isEditing && (
                    <button
                      onClick={() => setEditingId(log.id)}
                      className="p-1.5 text-slate-600 hover:text-blue-400 transition-colors"
                      title="Modifier"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {isEditing && (
                    <button
                      onClick={handleEditCancel}
                      className="p-1.5 text-slate-600 hover:text-slate-300 transition-colors"
                      title="Annuler"
                    >
                      <X size={14} />
                    </button>
                  )}
                  {onFavorite && !isEditing && (
                    <button
                      onClick={() => onFavorite(log)}
                      className="p-1.5 text-slate-600 hover:text-amber-400 transition-colors"
                      title="Ajouter aux favoris"
                    >
                      <Star size={14} />
                    </button>
                  )}
                  {onDuplicate && !isEditing && (
                    <button
                      onClick={() => onDuplicate(log)}
                      className="p-1.5 text-slate-600 hover:text-emerald-400 transition-colors"
                      title="Dupliquer"
                    >
                      <Copy size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(log.id)}
                    className="p-1.5 text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            {isEditing && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/50">
                <input
                  type="text"
                  value={correction}
                  onChange={(e) => setCorrection(e.target.value)}
                  onKeyDown={(e) => handleEditKeyDown(e, log)}
                  placeholder="Précise ta correction..."
                  className="flex-1 bg-slate-800/50 text-sm text-white placeholder-slate-500 rounded-lg px-3 py-1.5 outline-none border border-slate-700/50 focus:border-blue-500/50"
                  autoFocus
                  disabled={editLoading}
                />
                <button
                  onClick={() => handleEditSubmit(log)}
                  disabled={editLoading || !correction.trim()}
                  className="p-1.5 text-blue-400 disabled:text-slate-600 disabled:opacity-50 transition-colors"
                >
                  {editLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
