// src/utils/firebase.js – DEINE CONFIG INTEGRIERT
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";

// Deine Config (sicher – in Vercel Env-Vars setzen)
const firebaseConfig = {
  apiKey: "AIzaSyATsVHwFTOb3y-X97UO0rapAbOZfMHbbW0",
  authDomain: "brutusai-43b25.firebaseapp.com",
  projectId: "brutusai-43b25",
  storageBucket: "brutusai-43b25.firebasestorage.app",
  messagingSenderId: "208486508282",
  appId: "1:208486508282:web:72ff088ecaf074098b0b43",
  measurementId: "G-7M2ZD84W1Z"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const analytics = getAnalytics(app);
