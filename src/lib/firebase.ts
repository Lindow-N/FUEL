import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  linkWithRedirect,
  getRedirectResult,
  signInWithCredential,
  type Auth,
  type User,
} from "firebase/auth";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let cachedUid: string | null = null;

const ANON_UID_KEY = "fuel_anon_uid";

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

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
}

export interface SignInResult {
  user: User;
  migratedFrom?: string;
}

export async function handleRedirectResult(): Promise<SignInResult | null> {
  const authInstance = getAuthInstance();

  try {
    const result = await getRedirectResult(authInstance);
    if (!result) return null;

    cachedUid = result.user.uid;
    return { user: result.user };
  } catch (err: unknown) {
    const error = err as { code?: string; credential?: unknown };

    if (
      error.code === "auth/credential-already-in-use" ||
      error.code === "auth/email-already-in-use"
    ) {
      const anonUid = sessionStorage.getItem(ANON_UID_KEY);
      const credential = error.credential;

      if (credential && anonUid) {
        const result = await signInWithCredential(
          authInstance,
          credential as Parameters<typeof signInWithCredential>[1]
        );
        cachedUid = result.user.uid;
        sessionStorage.removeItem(ANON_UID_KEY);
        return { user: result.user, migratedFrom: anonUid };
      }
    }

    sessionStorage.removeItem(ANON_UID_KEY);
    throw err;
  }
}

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<SignInResult> {
  const authInstance = getAuthInstance();
  const currentUser = authInstance.currentUser;

  if (isMobile()) {
    if (currentUser && currentUser.isAnonymous) {
      sessionStorage.setItem(ANON_UID_KEY, currentUser.uid);
      await linkWithRedirect(currentUser, googleProvider);
      return { user: currentUser };
    }
    await signInWithRedirect(authInstance, googleProvider);
    return { user: currentUser! };
  }

  if (currentUser && currentUser.isAnonymous) {
    try {
      const result = await signInWithPopup(authInstance, googleProvider);
      cachedUid = result.user.uid;
      return { user: result.user };
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (
        error.code === "auth/credential-already-in-use" ||
        error.code === "auth/email-already-in-use"
      ) {
        const anonUid = currentUser.uid;
        const result = await signInWithPopup(authInstance, googleProvider);
        cachedUid = result.user.uid;
        return { user: result.user, migratedFrom: anonUid };
      }
      throw err;
    }
  }

  const result = await signInWithPopup(authInstance, googleProvider);
  cachedUid = result.user.uid;
  return { user: result.user };
}

export function getCurrentUser(): User | null {
  const authInstance = getAuthInstance();
  return authInstance.currentUser;
}

export async function signOutUser(): Promise<void> {
  const authInstance = getAuthInstance();
  cachedUid = null;
  await authInstance.signOut();
  await signInAnonymously(authInstance);
  cachedUid = authInstance.currentUser?.uid || null;
}
