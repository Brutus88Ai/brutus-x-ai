// src/lib/firebase.ts
// Firebase v9 modular initialization and exports

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

// IMPORTANT: In Vite projects environment variables exposed to the client
// must start with VITE_. Do NOT put secret API keys here. Use Cloud
// Functions + Secret Manager for provider keys. These vars are only
// for Firebase project config (public metadata), not provider secrets.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// Helper note:
// - Do NOT store external provider API keys in this repo or in VITE_* envs.
// - Use Google Secret Manager and reference them inside Cloud Functions.
// - For callable functions usage on the client, use `httpsCallable(functions, 'name')`.

export default app;
