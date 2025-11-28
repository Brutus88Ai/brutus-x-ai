// src/utils/firebase.js – SICHER MIT ENV-VARS
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";

// Env-Vars aus Vercel (sicher – nicht im Code)
const pickEnv = (value, fallback) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return fallback;
};

const firebaseConfig = {
  apiKey: pickEnv(import.meta.env.VITE_FIREBASE_API_KEY, "AIzaSyATsVHwFTOb3y-X97UO0rapAbOZfMHbbW0"),
  authDomain: pickEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, "brutusai-43b25.firebaseapp.com"),
  projectId: pickEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, "brutusai-43b25"),
  storageBucket: pickEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, "brutusai-43b25.firebasestorage.app"),
  messagingSenderId: pickEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, "208486508282"),
  appId: pickEnv(import.meta.env.VITE_FIREBASE_APP_ID, "1:208486508282:web:72ff088ecaf074098b0b43"),
  measurementId: pickEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, "G-7M2ZD84W1Z")
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");
export const analytics = getAnalytics(app);
