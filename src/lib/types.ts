export interface FoodLog {
  id: string;
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  analysis: string;
  timestamp: number;
}

export interface WeightEntry {
  id: string;
  date: string;
  value: number;
}

export interface Favorite {
  id: string;
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailySummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type GeminiResponse = Omit<FoodLog, "id" | "timestamp">;

export const DEFAULT_TARGETS: DailySummary = {
  calories: 1900,
  protein: 185,
  carbs: 165,
  fat: 55,
};

export interface GoalEntry {
  id: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  effectiveDate: string;
  createdAt: number;
}

export function buildUserProfile(targets: DailySummary): string {
  return `
PROFIL UTILISATEUR :
- Anthony, 27 ans, QA Automation Engineer (travail sédentaire mais intense mentalement)
- 90kg+, CrossFit + Haltérophilie haut volume (4-5 sessions/semaine, focus Jerk/Squat)
- Objectif : sèche intense (perte de gras) tout en maintenant masse musculaire et force
- Cibles : ${targets.calories} kcal/jour, priorité absolue protéines (${targets.protein}g/jour)
- BANNI (déteste) : courgettes et champignons — ALERTER si détecté dans un repas
- Favoris : poulet, poisson blanc (colin), thon, haricots blancs, épinards
- Satiété : konjac et pain de seigle (limiter seigle si poids stagne)
- Suppléments : whey et créatine
- Habitudes : batch cooking, repas propres (ex: poulet sauce curry madras, riz BIO)
`;
}
