import {
  collection,
  addDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { getDb, ensureAuth } from "./firebase";
import { FoodLog, WeightEntry, Favorite } from "./types";

function toMillis(t: unknown): number {
  if (t && typeof t === "object" && "toMillis" in (t as object)) {
    return (t as Timestamp).toMillis();
  }
  return typeof t === "number" ? t : Date.now();
}

function validateFoodLog(data: Record<string, unknown>, id: string): FoodLog {
  return {
    id,
    food: String(data.food ?? "Inconnu"),
    calories: Number(data.calories) || 0,
    protein: Number(data.protein) || 0,
    carbs: Number(data.carbs) || 0,
    fat: Number(data.fat) || 0,
    analysis: String(data.analysis ?? ""),
    timestamp: toMillis(data.timestamp),
  };
}

function validateWeightEntry(data: Record<string, unknown>, id: string): WeightEntry {
  return {
    id,
    date: String(data.date ?? ""),
    value: Number(data.value) || 0,
  };
}

export async function getDailyLogs(date?: string): Promise<FoodLog[]> {
  const db = getDb();
  const userId = await ensureAuth();
  const targetDate = date || new Date().toISOString().split("T")[0];

  const start = Timestamp.fromDate(new Date(`${targetDate}T00:00:00`));
  const end = Timestamp.fromDate(new Date(`${targetDate}T23:59:59`));

  const q = query(
    collection(db, "users", userId, "dailyLogs"),
    where("timestamp", ">=", start),
    where("timestamp", "<=", end),
    orderBy("timestamp", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => validateFoodLog(d.data(), d.id));
}

export async function addFoodLog(
  log: Omit<FoodLog, "id" | "timestamp">
): Promise<string> {
  const db = getDb();
  const userId = await ensureAuth();
  const ref = await addDoc(collection(db, "users", userId, "dailyLogs"), {
    ...log,
    timestamp: Timestamp.now(),
  });
  return ref.id;
}

export async function updateFoodLog(
  logId: string,
  data: Partial<Omit<FoodLog, "id" | "timestamp">>
): Promise<void> {
  const db = getDb();
  const userId = await ensureAuth();
  await updateDoc(doc(db, "users", userId, "dailyLogs", logId), data);
}

export async function deleteFoodLog(logId: string): Promise<void> {
  const db = getDb();
  const userId = await ensureAuth();
  await deleteDoc(doc(db, "users", userId, "dailyLogs", logId));
}

export async function deleteWeightEntry(entryId: string): Promise<void> {
  const db = getDb();
  const userId = await ensureAuth();
  await deleteDoc(doc(db, "users", userId, "weightEntries", entryId));
}

export async function getWeightEntries(
  days: number = 30
): Promise<WeightEntry[]> {
  const db = getDb();
  const userId = await ensureAuth();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  const q = query(
    collection(db, "users", userId, "weightEntries"),
    where("date", ">=", sinceStr),
    orderBy("date", "asc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => validateWeightEntry(d.data(), d.id));
}

export async function getRecentLogs(days: number = 7): Promise<FoodLog[]> {
  const db = getDb();
  const userId = await ensureAuth();
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);
  const start = Timestamp.fromDate(since);

  const q = query(
    collection(db, "users", userId, "dailyLogs"),
    where("timestamp", ">=", start),
    orderBy("timestamp", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => validateFoodLog(d.data(), d.id));
}

export async function upsertWeightEntry(value: number): Promise<string> {
  const db = getDb();
  const userId = await ensureAuth();
  const today = new Date().toISOString().split("T")[0];
  const docId = `w_${today}`;
  const ref = doc(db, "users", userId, "weightEntries", docId);
  await setDoc(ref, {
    date: today,
    value,
    timestamp: Timestamp.now(),
  });
  return docId;
}

export async function getAllLogs(): Promise<FoodLog[]> {
  const db = getDb();
  const userId = await ensureAuth();

  const q = query(
    collection(db, "users", userId, "dailyLogs"),
    orderBy("timestamp", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => validateFoodLog(d.data(), d.id));
}

export async function getAllWeightEntries(): Promise<WeightEntry[]> {
  const db = getDb();
  const userId = await ensureAuth();

  const q = query(
    collection(db, "users", userId, "weightEntries"),
    orderBy("date", "asc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => validateWeightEntry(d.data(), d.id));
}

export async function migrateUserData(fromUid: string, toUid: string): Promise<void> {
  const db = getDb();

  const logsSnap = await getDocs(collection(db, "users", fromUid, "dailyLogs"));
  const weightSnap = await getDocs(collection(db, "users", fromUid, "weightEntries"));

  const allDocs = [
    ...logsSnap.docs.map((d) => ({ ref: doc(collection(db, "users", toUid, "dailyLogs")), data: d.data() })),
    ...weightSnap.docs.map((d) => ({ ref: doc(db, "users", toUid, "weightEntries", d.id), data: d.data() })),
  ];

  const BATCH_SIZE = 450;
  for (let i = 0; i < allDocs.length; i += BATCH_SIZE) {
    const chunk = allDocs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const { ref, data } of chunk) {
      batch.set(ref, data);
    }
    await batch.commit();
  }
}

export async function getFavorites(): Promise<Favorite[]> {
  const db = getDb();
  const userId = await ensureAuth();

  const q = query(
    collection(db, "users", userId, "favorites"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    food: String(d.data().food ?? ""),
    calories: Number(d.data().calories) || 0,
    protein: Number(d.data().protein) || 0,
    carbs: Number(d.data().carbs) || 0,
    fat: Number(d.data().fat) || 0,
  }));
}

export async function addFavorite(
  fav: Omit<Favorite, "id">
): Promise<string> {
  const db = getDb();
  const userId = await ensureAuth();
  const ref = await addDoc(collection(db, "users", userId, "favorites"), {
    ...fav,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function deleteFavorite(favId: string): Promise<void> {
  const db = getDb();
  const userId = await ensureAuth();
  await deleteDoc(doc(db, "users", userId, "favorites", favId));
}
