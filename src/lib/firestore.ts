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
} from "firebase/firestore";
import { getDb, ensureAuth } from "./firebase";
import { FoodLog, WeightEntry } from "./types";

function toMillis(t: unknown): number {
  if (t && typeof t === "object" && "toMillis" in (t as object)) {
    return (t as Timestamp).toMillis();
  }
  return typeof t === "number" ? t : Date.now();
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
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, timestamp: toMillis(data.timestamp) } as FoodLog;
  });
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
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WeightEntry);
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
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, timestamp: toMillis(data.timestamp) } as FoodLog;
  });
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

export async function migrateUserData(fromUid: string, toUid: string): Promise<void> {
  const db = getDb();

  const logsSnap = await getDocs(collection(db, "users", fromUid, "dailyLogs"));
  for (const d of logsSnap.docs) {
    await addDoc(collection(db, "users", toUid, "dailyLogs"), d.data());
  }

  const weightSnap = await getDocs(collection(db, "users", fromUid, "weightEntries"));
  for (const d of weightSnap.docs) {
    await setDoc(doc(db, "users", toUid, "weightEntries", d.id), d.data());
  }
}
