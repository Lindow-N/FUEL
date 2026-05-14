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

export interface DailySummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type GeminiResponse = Omit<FoodLog, "id" | "timestamp">;

export const DAILY_TARGETS: DailySummary = {
  calories: 2000,
  protein: 180,
  carbs: 220,
  fat: 65,
};

export const USER_PROFILE = `
PROFIL UTILISATEUR :
- Anthony, 27 ans, QA Automation Engineer (travail sédentaire mais intense mentalement)
- 90kg+, CrossFit + Haltérophilie haut volume (4-5 sessions/semaine, focus Jerk/Squat)
- Objectif : sèche intense (perte de gras) tout en maintenant masse musculaire et force
- Cibles : ${DAILY_TARGETS.calories} kcal/jour, priorité absolue protéines (${DAILY_TARGETS.protein}g/jour)
- BANNI (déteste) : courgettes et champignons — ALERTER si détecté dans un repas
- Favoris : poulet, poisson blanc (colin), thon, haricots blancs, épinards
- Satiété : konjac et pain de seigle (limiter seigle si poids stagne)
- Suppléments : whey et créatine
- Habitudes : batch cooking, repas propres (ex: poulet sauce curry madras, riz BIO)
`;
