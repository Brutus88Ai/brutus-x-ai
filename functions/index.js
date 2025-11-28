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
  let niches = ["viral", "funny"];
  
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      niches = userDoc.data()?.niches || niches;
    }
  } catch (e) {
    console.log("User doc nicht gefunden, verwende Defaults");
  }

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
  
  // User-Stats aktualisieren (mit Fehlerbehandlung)
  try {
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      await userRef.update({
        videosCreated: (userDoc.data()?.videosCreated || 0) + 1,
        lastUpload: new Date().toISOString()
      });
    } else {
      // User-Dokument erstellen wenn nicht vorhanden
      await userRef.set({
        videosCreated: 1,
        totalViews: 0,
        isPro: false,
        niches: ["viral", "funny"],
        lastUpload: new Date().toISOString()
      });
    }
  } catch (e) {
    console.log("Stats-Update fehlgeschlagen:", e.message);
  }
  
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

// Caption Optimizer mit AI
export const optimizeCaption = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Bitte einloggen!");
  }

  const { caption } = request.data;
  
  if (!caption || caption.length < 10) {
    throw new HttpsError("invalid-argument", "Caption muss mindestens 10 Zeichen haben!");
  }

  // AI-basierte Optimierung (später mit echtem AI-Service)
  const optimized = optimizeCaptionLogic(caption);
  
  return {
    optimizedCaption: optimized.text,
    improvements: optimized.improvements
  };
});

// Caption-Optimierungs-Logik
function optimizeCaptionLogic(caption) {
  let optimized = caption.trim();
  const improvements = [];
  
  // 1. Emoji hinzufügen wenn keine vorhanden
  if (!/[\u{1F600}-\u{1F64F}]/u.test(optimized)) {
    optimized = "🔥 " + optimized;
    improvements.push("Emoji für mehr Aufmerksamkeit hinzugefügt");
  }
  
  // 2. Hashtags optimieren
  const hashtagCount = (optimized.match(/#/g) || []).length;
  if (hashtagCount < 3) {
    optimized += " #viral #fyp #trending";
    improvements.push("Relevante Hashtags für bessere Reichweite ergänzt");
  } else if (hashtagCount > 10) {
    improvements.push("Hinweis: Zu viele Hashtags können spammy wirken");
  }
  
  // 3. Call-to-Action hinzufügen
  const hasCallToAction = /follow|like|comment|share|subscribe|check out|link in bio/i.test(optimized);
  if (!hasCallToAction) {
    optimized += " 👉 Follow for more!";
    improvements.push("Call-to-Action hinzugefügt für mehr Engagement");
  }
  
  // 4. Länge optimieren
  if (optimized.length > 300) {
    improvements.push("Caption ist etwas lang - kürzer ist oft besser für Shorts");
  }
  
  // 5. Erste Wörter optimieren (Hook)
  const firstWords = optimized.split(' ').slice(0, 3).join(' ').toLowerCase();
  const goodHooks = ['watch', 'wait', 'stop', 'pov:', 'this is', 'omg', 'you won\'t'];
  const hasGoodHook = goodHooks.some(hook => firstWords.includes(hook));
  if (!hasGoodHook) {
    improvements.push("Tipp: Starke Hooks wie 'Wait for it...' oder 'POV:' ziehen mehr Aufmerksamkeit");
  }
  
  return {
    text: optimized,
    improvements
  };
}
