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

export interface GeminiResponse {
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  analysis: string;
}

export const DAILY_TARGETS: DailySummary = {
  calories: 2200,
  protein: 180,
  carbs: 250,
  fat: 70,
};
