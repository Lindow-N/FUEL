import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  type Auth,
} from "firebase/auth";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let cachedUid: string | null = null;

function getFirebaseApp() {
  if (app) return app;
  if (typeof window === "undefined") {
    throw new Error("Firebase is client-only");
  }

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  auth = getAuth(app);
  return app;
}

export function getDb(): Firestore {
  getFirebaseApp();
  return db!;
}

export function getAuthInstance(): Auth {
  getFirebaseApp();
  return auth!;
}

export async function ensureAuth(): Promise<string> {
  if (cachedUid) return cachedUid;

  const authInstance = getAuthInstance();

  if (authInstance.currentUser) {
    cachedUid = authInstance.currentUser.uid;
    return cachedUid;
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error("Auth timeout"));
    }, 8000);

    const unsubscribe = onAuthStateChanged(authInstance, (user) => {
      clearTimeout(timeout);
      unsubscribe();
      if (user) {
        cachedUid = user.uid;
        resolve(user.uid);
        return;
      }
      signInAnonymously(authInstance)
        .then((cred) => {
          cachedUid = cred.user.uid;
          resolve(cred.user.uid);
        })
        .catch(reject);
    });
  });
}
