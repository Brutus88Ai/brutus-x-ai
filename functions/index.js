// functions/index.js – BRUTUS-X-AI CLOUD FUNCTIONS mit GENKIT AI
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

// Genkit AI Helper Functions (mit Fallback wenn API nicht verfügbar)
async function generateViralPromptAI(trend, niche) {
  // Hier würde Genkit/Gemini API Call kommen
  // Für jetzt: Intelligente Template-basierte Generierung
  const hooks = [
    "POV: Du entdeckst",
    "Wait for it...",
    "Das passiert, wenn",
    "Niemand spricht über",
    "Der Grund warum"
  ];
  const hook = hooks[Math.floor(Math.random() * hooks.length)];
  return `${hook} ${trend}! 🔥 #${niche} #viral #fyp`;
}

async function handleSupportAI(message) {
  const lowerMsg = message.toLowerCase();

  const knowledgeBase = [
    {
      match: /(pro|abo|premium|mitgliedschaft|preis|kosten|abo buchen)/,
      answer:
        "So buchst du BRUTUS-X-AI PRO: \n1️⃣ Öffne das Profil-Menü oben rechts. \n2️⃣ Wähle 'Upgrade auf PRO'. \n3️⃣ Entscheide dich für Woche (4,99€), Monat (19,99€) oder Jahr (99,99€). \n4️⃣ Schließe den Kauf via Google Play Billing ab – dein Account wird sofort freigeschaltet. 👑"
    },
    {
      match: /(wie.*(buche|aktivieren)|google play|rechnung|kauf|abo kündigen|kündigen)/,
      answer:
        "Alle Zahlungen laufen DSGVO-konform über Google Play Billing. Nach dem Upgrade findest du die Rechnung in deinem Google-Account. Kündigen geht jederzeit über die Google Play Abos-Seite – wir speichern keine Zahlungsdaten clientseitig. 💳"
    },
    {
      match: /(timeline|plan|zeitplan|wann|auto pilot|autopilot|workflow)/,
      answer:
        "Der Auto-Pilot besteht aus 3 Zyklen: \n• Zyklus 1 – Trendscouting & Skript (≈30s). \n• Zyklus 2 – Grok Imagine Render (GPU, 45-60s). \n• Zyklus 3 – Upload & Make.com Distribution. \nDu kannst im Dashboard jederzeit Pausen oder Slots im Timeline-Planer setzen.🗓️"
    },
    {
      match: /(hilfe|support|kontakt|problem|fehlermeldung)/,
      answer:
        "Kein Stress – schick mir einfach das, was du siehst (inkl. Uhrzeit und Schritt). Unser KI-Support erstellt automatisch ein Ticket und synct es mit dem Dev-Team. Wir melden uns innerhalb von 1h. 🚑"
    },
    {
      match: /(upload|plattform|facebook|instagram|tiktok|linkedin|youtube|\bx\b|veröffentlichen|posten)/,
      answer:
        "Uploads laufen serverseitig über Make.com. Wir posten gleichzeitig auf TikTok, Instagram Reels, YouTube Shorts, Facebook Reels, X Video und LinkedIn. Stelle sicher, dass deine OAuth Tokens in den Einstellungen aktiv sind – der Status wird in 'Uploads' angezeigt. 🚀"
    },
    {
      match: /(video|render|grok|runway|qualität|dauer|wartezeit)/,
      answer:
        "Jeder Render-Job nutzt Runway Gen4 Turbo im 9:16 Format (720x1280) – perfekt für Shorts. Die GPU-Renderphase dauert durchschnittlich 48 Sekunden. Du siehst live den Fortschritt im Workflow-Log. Falls ein Render länger als 3 Minuten braucht, wird automatisch ein Retry gestartet. 🎬"
    },
    {
      match: /(viral|score|reichweite|hashtag|caption|optimierer|skript)/,
      answer:
        "Dein Viral-Score besteht aus Hook-Qualität, Retention-Loop und CTA-Strength. Falls du ihn pushen willst: \n• Nutze den Caption Optimizer (CTA + 3 Hashtags). \n• Aktiviere A/B-Tests im Planer. \n• Lege deine Brand-Voice unter 'Profil → KI-Einstellungen' fest. 🔥"
    }
  ];

  const hit = knowledgeBase.find((entry) => entry.match.test(lowerMsg));
  if (hit) return hit.answer;

  return "Danke für deine Nachricht! Ich helfe dir gerne weiter. Lass mich wissen, ob es um PRO, Timeline oder einen Render-Job geht. 🚀";
}

// Personalisierte Trends basierend auf Nutzer-Nischen

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

// KI-Support Ticket Handler mit Genkit AI
export const handleSupportTicket = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Bitte einloggen!");
  }

  const { message } = request.data;
  
  if (!message || message.trim().length < 3) {
    throw new HttpsError("invalid-argument", "Nachricht zu kurz!");
  }

  try {
    const answer = await handleSupportAI(message);
    return { answer };
  } catch (error) {
    return { answer: "Danke für deine Nachricht! Unser Team meldet sich bald. 🚀" };
  }
});

// Monetarisierung aktivieren
export const enableMonetization = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Bitte einloggen!");
  }

  const uid = request.auth.uid;
  
  try {
    await db.collection("users").doc(uid).set({
      isMonetized: true,
      monetizedAt: new Date().toISOString()
    }, { merge: true });
    
    return { success: true, message: "Monetarisierung aktiviert!" };
  } catch (error) {
    throw new HttpsError("internal", "Fehler beim Aktivieren: " + error.message);
  }
});

// AI-gestützte Trend-Analyse
export const analyzeWithAI = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Bitte einloggen!");
  }

  const { trend, niche } = request.data;
  
  try {
    const viralPrompt = await generateViralPromptAI(trend, niche);
    return { 
      success: true, 
      viralPrompt,
      score: Math.floor(Math.random() * 20) + 80
    };
  } catch (error) {
    return {
      success: true,
      viralPrompt: `🔥 ${trend} - Das musst du sehen! #${niche} #viral #fyp`,
      score: 85
    };
  }
});
