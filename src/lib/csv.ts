import { FoodLog, WeightEntry } from "./types";

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
