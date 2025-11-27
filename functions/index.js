// functions/index.js – BRUTUS-X-AI CLOUD FUNCTIONS
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

// Personalisierte Trends basierend auf Nutzer-Nischen
export const getPersonalizedTrends = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Bitte einloggen!");
  }

  const uid = request.auth.uid;
  const userDoc = await db.collection("users").doc(uid).get();
  const niches = userDoc.data()?.niches || ["viral", "funny"];

  // Simulierte Trends (später mit echten APIs ersetzen)
  const trends = [
    `${niches[0]} Content Revolution 2026`,
    `Wie ${niches[1]} Videos viral gehen`,
    `${niches[0]} Trends auf TikTok explodieren`,
    `Die besten ${niches[1]} Shorts-Ideen`,
    `${niches[0]} Content mit KI erstellen`
  ];

  return trends;
});

// Video-Generierung (Dummy - später mit Grok/Runway integrieren)
export const generateWithGrok = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Bitte einloggen!");
  }

  const { prompt } = request.data;
  
  // Simulierte Video-URL (später echte API-Integration)
  const videoUrl = `https://storage.googleapis.com/brutusai-43b25.appspot.com/demo-${Date.now()}.mp4`;
  
  return { videoUrl, prompt };
});

// Viral-Score berechnen
export const calculateViralScore = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Bitte einloggen!");
  }

  const { trend, hook } = request.data;
  
  // Einfacher Score-Algorithmus (später ML-Modell)
  let score = 50;
  if (hook.includes("Das passiert")) score += 15;
  if (hook.includes("wenn du")) score += 10;
  if (trend.length < 50) score += 10;
  if (trend.includes("2026") || trend.includes("viral")) score += 15;
  
  return { score: Math.min(score, 100) };
});

// Multi-Platform Upload (Dummy)
export const uploadToAllSix = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Bitte einloggen!");
  }

  const { videoUrl, caption } = request.data;
  const uid = request.auth.uid;
  
  // Simulierter Upload zu 6 Plattformen
  const platforms = ["TikTok", "Instagram", "YouTube Shorts", "Facebook", "X", "LinkedIn"];
  
  // User-Stats aktualisieren
  await db.collection("users").doc(uid).update({
    videosCreated: (await db.collection("users").doc(uid).get()).data()?.videosCreated + 1 || 1,
    lastUpload: new Date().toISOString()
  });
  
  return { 
    success: true, 
    platforms,
    videoUrl,
    caption 
  };
});

// A/B-Testing
export const runABTest = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Bitte einloggen!");
  }

  const { basePrompt } = request.data;
  
  // Zwei Varianten generieren
  const variantA = `${basePrompt} - Kurz & knackig`;
  const variantB = `${basePrompt} - Mit Story-Aufbau`;
  
  return {
    winner: Math.random() > 0.5 ? "A" : "B",
    variantA,
    variantB
  };
});
