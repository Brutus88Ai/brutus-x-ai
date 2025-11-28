// src/utils/firebase.js – SICHER MIT ENV-VARS
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";

// Env-Vars aus Vercel (sicher – nicht im Code)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyATsVHwFTOb3y-X97UO0rapAbOZfMHbbW0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "brutusai-43b25.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "brutusai-43b25",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "brutusai-43b25.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "208486508282",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:208486508282:web:72ff088ecaf074098b0b43",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-7M2ZD84W1Z"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");
export const analytics = getAnalytics(app);
