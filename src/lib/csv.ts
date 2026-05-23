import { FoodLog, WeightEntry, DAILY_TARGETS, USER_PROFILE } from "./types";

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function mealsToCSV(logs: FoodLog[]): string {
  const header = "Date,Heure,Aliment,Calories,Protéines(g),Glucides(g),Lipides(g),Analyse";
  const rows = logs.map((log) => {
    const d = new Date(log.timestamp);
    const date = d.toISOString().split("T")[0];
    const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return [
      date,
      time,
      escapeCsv(log.food),
      log.calories,
      Math.round(log.protein),
      Math.round(log.carbs),
      Math.round(log.fat),
      escapeCsv(log.analysis || ""),
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

export function weightToCSV(entries: WeightEntry[]): string {
  const header = "Date,Poids(kg)";
  const rows = entries.map((e) => `${e.date},${e.value}`);
  return [header, ...rows].join("\n");
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface DayData {
  date: string;
  repas: {
    heure: string;
    aliment: string;
    calories: number;
    proteines_g: number;
    glucides_g: number;
    lipides_g: number;
    analyse: string;
  }[];
  total_calories: number;
  total_proteines_g: number;
  total_glucides_g: number;
  total_lipides_g: number;
}

export function buildFullExport(
  logs: FoodLog[],
  weightEntries: WeightEntry[]
): object {
  const byDay = new Map<string, DayData>();

  for (const log of logs) {
    const d = new Date(log.timestamp);
    const date = d.toISOString().split("T")[0];
    const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    if (!byDay.has(date)) {
      byDay.set(date, { date, repas: [], total_calories: 0, total_proteines_g: 0, total_glucides_g: 0, total_lipides_g: 0 });
    }
    const day = byDay.get(date)!;
    day.repas.push({
      heure: time,
      aliment: log.food,
      calories: Math.round(log.calories),
      proteines_g: Math.round(log.protein),
      glucides_g: Math.round(log.carbs),
      lipides_g: Math.round(log.fat),
      analyse: log.analysis || "",
    });
    day.total_calories += Math.round(log.calories);
    day.total_proteines_g += Math.round(log.protein);
    day.total_glucides_g += Math.round(log.carbs);
    day.total_lipides_g += Math.round(log.fat);
  }

  const jours = Array.from(byDay.values()).sort((a, b) => b.date.localeCompare(a.date));

  return {
    exporte_le: new Date().toISOString(),
    profil: USER_PROFILE.trim(),
    objectifs_quotidiens: {
      calories: DAILY_TARGETS.calories,
      proteines_g: DAILY_TARGETS.protein,
      glucides_g: DAILY_TARGETS.carbs,
      lipides_g: DAILY_TARGETS.fat,
    },
    suivi_poids: weightEntries.map((e) => ({ date: e.date, poids_kg: e.value })),
    poids_dernier: weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].value : null,
    stats_globales: {
      nombre_repas_total: logs.length,
      nombre_jours_suivis: jours.length,
      premier_jour: jours.length > 0 ? jours[jours.length - 1].date : null,
      dernier_jour: jours.length > 0 ? jours[0].date : null,
    },
    journal: jours,
  };
}

export function downloadJSON(data: object, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
