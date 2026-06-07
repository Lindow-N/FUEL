"use client";

import { useState, useEffect } from "react";
import { signInWithGoogle, getCurrentUser, signOutUser, handleRedirectResult, getAuthErrorMessage, getAuthInstance, type SignInResult } from "@/lib/firebase";
import * as firestore from "@/lib/firestore";
import { buildFullExport, downloadJSON } from "@/lib/csv";
import { DEFAULT_TARGETS, type DailySummary, type GoalEntry } from "@/lib/types";
import { User, onAuthStateChanged } from "firebase/auth";
import { LogIn, LogOut, Shield, User as UserIcon, Loader2, AlertCircle, FileJson, Target, Save, History } from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [goals, setGoals] = useState<DailySummary>(DEFAULT_TARGETS);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalsSaving, setGoalsSaving] = useState(false);
  const [goalsSaved, setGoalsSaved] = useState(false);
  const [goalHistory, setGoalHistory] = useState<GoalEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    async function loadGoals() {
      try {
        const [current, history] = await Promise.all([
          firestore.getCurrentGoals(),
          firestore.getAllGoalEntries(),
        ]);
        if (current) {
          setGoals({ calories: current.calories, protein: current.protein, carbs: current.carbs, fat: current.fat });
        }
        setGoalHistory(history);
      } catch (err) {
        console.error("[FUEL] loadGoals error:", err);
      } finally {
        setGoalsLoading(false);
      }
    }
    loadGoals();
  }, []);

  const processMigration = async (result: SignInResult) => {
    if (result.migratedFrom) {
      setMigrating(true);
      try {
        await firestore.migrateUserData(result.migratedFrom, result.user.uid);
      } finally {
        setMigrating(false);
      }
    }
    setUser(result.user);
  };

  useEffect(() => {
    setUser(getCurrentUser());

    const unsubscribe = onAuthStateChanged(getAuthInstance(), (u) => {
      if (u) setUser(u);
    });

    (async () => {
      try {
        const result = await handleRedirectResult();
        if (result) await processMigration(result);
      } catch (err) {
        console.error("[FUEL] Redirect result error:", err);
        setError(getAuthErrorMessage(err));
      }
    })();

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (result.redirectPending) return;
      await processMigration(result);
    } catch (err) {
      console.error("[FUEL] Google sign-in error:", err);
      const msg = getAuthErrorMessage(err);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutUser();
      setUser(getCurrentUser());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoals = async () => {
    setGoalsSaving(true);
    setGoalsSaved(false);
    try {
      const today = new Date().toISOString().split("T")[0];
      await firestore.setGoals({
        calories: goals.calories,
        protein: goals.protein,
        carbs: goals.carbs,
        fat: goals.fat,
        effectiveDate: today,
      });
      const history = await firestore.getAllGoalEntries();
      setGoalHistory(history);
      setGoalsSaved(true);
      setTimeout(() => setGoalsSaved(false), 2000);
    } catch (err) {
      console.error("[FUEL] saveGoals error:", err);
    } finally {
      setGoalsSaving(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    setExportError(null);
    try {
      const [logs, entries, goalEntries] = await Promise.all([
        firestore.getAllLogs(),
        firestore.getAllWeightEntries(),
        firestore.getAllGoalEntries(),
      ]);
      if (logs.length === 0 && entries.length === 0) {
        setExportError("Aucune donnée à exporter.");
        return;
      }
      const data = buildFullExport(logs, entries, goalEntries);
      downloadJSON(data, `fuel-bilan-${new Date().toISOString().split("T")[0]}.json`);
    } catch (err) {
      console.error("[FUEL] Export error:", err);
      setExportError("Erreur lors de l'export.");
    } finally {
      setExportLoading(false);
    }
  };

  const isAnonymous = user?.isAnonymous ?? true;

  if (migrating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
        <Loader2 size={32} className="animate-spin text-emerald-500 mb-4" />
        <p className="text-sm text-slate-300 font-medium">Migration de tes données...</p>
        <p className="text-xs text-slate-500 mt-1">Ne ferme pas l&apos;app</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Réglages
        </h1>
      </header>

      <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800/50 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" />
            ) : (
              <UserIcon size={20} className="text-slate-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {isAnonymous ? "Compte anonyme" : user?.displayName || "Utilisateur"}
            </p>
            <p className="text-[11px] text-slate-500">
              {isAnonymous ? "Données non sauvegardées entre appareils" : user?.email}
            </p>
          </div>
        </div>

        {isAnonymous ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
              <Shield size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300/80">
                En mode anonyme, tes données sont liées à cet appareil uniquement. 
                Connecte-toi avec Google pour les sauvegarder. Tes repas existants seront migrés automatiquement.
              </p>
            </div>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-slate-100 disabled:bg-slate-700 disabled:opacity-50 rounded-xl text-slate-900 font-semibold text-sm transition-colors"
            >
              <LogIn size={18} />
              {loading ? "Connexion..." : "Se connecter avec Google"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignOut}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm transition-colors"
          >
            <LogOut size={18} />
            Se déconnecter
          </button>
        )}

        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 rounded-lg p-3 border border-red-500/20">
            <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
      </div>

      <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800/50 space-y-4">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-emerald-400" />
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Objectifs quotidiens
          </h2>
        </div>

        {goalsLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={20} className="animate-spin text-slate-500" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Calories (kcal)</label>
                <input
                  type="number"
                  value={goals.calories}
                  onChange={(e) => setGoals((g) => ({ ...g, calories: Number(e.target.value) || 0 }))}
                  className="w-full bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Protéines (g)</label>
                <input
                  type="number"
                  value={goals.protein}
                  onChange={(e) => setGoals((g) => ({ ...g, protein: Number(e.target.value) || 0 }))}
                  className="w-full bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Glucides (g)</label>
                <input
                  type="number"
                  value={goals.carbs}
                  onChange={(e) => setGoals((g) => ({ ...g, carbs: Number(e.target.value) || 0 }))}
                  className="w-full bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Lipides (g)</label>
                <input
                  type="number"
                  value={goals.fat}
                  onChange={(e) => setGoals((g) => ({ ...g, fat: Number(e.target.value) || 0 }))}
                  className="w-full bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>

            <button
              onClick={handleSaveGoals}
              disabled={goalsSaving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600/20 hover:bg-emerald-600/30 disabled:opacity-50 rounded-xl text-emerald-400 text-sm font-medium transition-colors border border-emerald-500/20"
            >
              {goalsSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : goalsSaved ? (
                <span className="text-emerald-300">Enregistré ✓</span>
              ) : (
                <>
                  <Save size={16} />
                  Enregistrer les objectifs
                </>
              )}
            </button>

            {goalHistory.length > 0 && (
              <div>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <History size={12} />
                  {showHistory ? "Masquer" : "Voir"} l&apos;historique ({goalHistory.length})
                </button>
                {showHistory && (
                  <div className="mt-2 space-y-1.5">
                    {goalHistory.slice().reverse().map((g) => (
                      <div key={g.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2 text-xs">
                        <span className="text-slate-400">{g.effectiveDate}</span>
                        <span className="text-slate-200 font-medium">
                          {g.calories} kcal / {g.protein}g P / {g.carbs}g G / {g.fat}g L
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800/50 space-y-3">
        <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Export données
        </h2>
        <button
          onClick={handleExport}
          disabled={exportLoading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600/20 hover:bg-emerald-600/30 disabled:opacity-50 rounded-xl text-emerald-400 text-sm font-medium transition-colors border border-emerald-500/20"
        >
          {exportLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <FileJson size={16} />
          )}
          {exportLoading ? "Export en cours..." : "Bilan complet (JSON)"}
        </button>
        <p className="text-[10px] text-slate-500 text-center">
          Toutes tes données : repas, poids, macros, historique des objectifs — prêt pour une IA
        </p>
        {exportError && (
          <p className="text-xs text-amber-400 text-center">{exportError}</p>
        )}
      </div>

    </div>
  );
}
