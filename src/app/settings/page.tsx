"use client";

import { useState, useEffect } from "react";
import { signInWithGoogle, getCurrentUser, signOutUser, handleRedirectResult, type SignInResult } from "@/lib/firebase";
import * as firestore from "@/lib/firestore";
import { mealsToCSV, weightToCSV, downloadCSV } from "@/lib/csv";
import { User } from "firebase/auth";
import { LogIn, LogOut, Shield, User as UserIcon, Download, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());

    (async () => {
      try {
        const result: SignInResult | null = await handleRedirectResult();
        if (!result) return;

        if (result.migratedFrom) {
          setMigrating(true);
          await firestore.migrateUserData(result.migratedFrom, result.user.uid);
          setMigrating(false);
        }
        setUser(result.user);
      } catch (err) {
        console.error("[FUEL] Redirect result error:", err);
        setError("Erreur de connexion Google");
      }
    })();
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (result.migratedFrom) {
        setMigrating(true);
        await firestore.migrateUserData(result.migratedFrom, result.user.uid);
        setMigrating(false);
      }
      setUser(result.user);
    } catch (err) {
      console.error("[FUEL] Google sign-in error:", err);
      setError("Erreur de connexion Google");
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
          <p className="text-xs text-red-400 text-center">{error}</p>
        )}
      </div>

      <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800/50 space-y-3">
        <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Export données
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={async () => {
              const logs = await firestore.getRecentLogs(90);
              if (logs.length === 0) return;
              downloadCSV(mealsToCSV(logs), `fuel-repas-${new Date().toISOString().split("T")[0]}.csv`);
            }}
            className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-xs font-medium transition-colors"
          >
            <Download size={14} />
            Repas (90j)
          </button>
          <button
            onClick={async () => {
              const entries = await firestore.getWeightEntries(365);
              if (entries.length === 0) return;
              downloadCSV(weightToCSV(entries), `fuel-poids-${new Date().toISOString().split("T")[0]}.csv`);
            }}
            className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-xs font-medium transition-colors"
          >
            <Download size={14} />
            Poids
          </button>
        </div>
      </div>

      <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800/50">
        <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">UID</p>
        <p className="text-xs text-slate-400 font-mono mt-1 break-all">{user?.uid || "—"}</p>
      </div>
    </div>
  );
}
