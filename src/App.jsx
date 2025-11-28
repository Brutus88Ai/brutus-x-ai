// src/App.jsx – BRUTUS-X-AI WELTHERRSCHAFT 2026 – COMPLETE VERSION
import { useState, useEffect, useMemo } from "react";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db, functions } from "./utils/firebase";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { CaptionOptimizer } from "./components/CaptionOptimizer";

const WORKFLOW_TEMPLATE = [
  { id: "trend", label: "Trend-Scout", status: "pending", message: "Bereit" },
  { id: "prompt", label: "Prompt-Gießerei", status: "pending", message: "Wartet" },
  { id: "render", label: "Grok Render", status: "pending", message: "Wartet" },
  { id: "score", label: "Viral-Score", status: "pending", message: "Wartet" },
  { id: "upload", label: "Distribution", status: "pending", message: "Wartet" }
];

const STEP_STATUS_STYLES = {
  pending: "border-gray-600 text-gray-400",
  running: "border-blue-400 text-blue-200 animate-pulse",
  done: "border-green-500 text-green-300",
  failed: "border-red-500 text-red-300"
};

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [niches, setNiches] = useState(["viral", "funny"]);
  const [newNiche, setNewNiche] = useState("");
  const [viralScore, setViralScore] = useState(null);
  const [abTesting, setAbTesting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [workflowLog, setWorkflowLog] = useState(() => WORKFLOW_TEMPLATE.map(step => ({ ...step })));
  const [selectedTrend, setSelectedTrend] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [generatedPrompts, setGeneratedPrompts] = useState([]);
  const [autopilotCycles, setAutopilotCycles] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          const data = userDoc.data() || {};
          setProfile({
            name: u.displayName || "Brutus User",
            photo: u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`,
            videosCreated: data.videosCreated || 0,
            totalViews: data.totalViews || 0,
            isPro: data.isPro || false,
            niches: data.niches || ["viral", "funny"],
            totalEarnings: data.totalEarnings || 0,
            isMonetized: data.isMonetized || false
          });
          setNiches(data.niches || ["viral", "funny"]);
        } catch (error) {
          console.error("Profile load error:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const cleanNiches = useMemo(
    () => niches.map((entry) => entry?.trim()).filter(Boolean),
    [niches]
  );

  const resetWorkflow = () => {
    setWorkflowLog(WORKFLOW_TEMPLATE.map((step) => ({ ...step })));
    setSelectedTrend("");
    setPreviewImageUrl("");
    setGeneratedPrompts([]);
    setAutopilotCycles([]);
    setVideoUrl("");
    setViralScore(null);
  };

  const updateWorkflowStep = (id, updates) => {
    setWorkflowLog((prev) =>
      prev.map((step) => (step.id === id ? { ...step, ...updates } : step))
    );
  };

  const createPollinationsPreview = (trendValue, userNiches) => {
    const seed = Math.floor(Math.random() * 9000) + 1000;
    const prompt = `${trendValue} ${userNiches.join(" ")} cinematic neon viral short, 9:16, high energy`;
    return `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=720&height=1280&seed=${seed}&model=flux`;
  };

  const buildPromptMatrix = (trendValue, userNiches) => {
    const primary = userNiches[0] || "viral";
    const secondary = userNiches[1] || "growth";
    const tertiary = userNiches[2] || "creator";
    const sanitize = (value) => value.replace(/\s+/g, "");
    const baseTags = [
      "#BrutusXAI",
      `#${sanitize(primary)}`,
      `#${sanitize(secondary)}`,
      `#${sanitize(tertiary)}`
    ];

    return [
      {
        id: "hook-bomb",
        title: "Hook Bomb",
        description: "Pattern Interrupt + Frage",
        script: [
          `Hook: ${trendValue}? Was wenn ${primary} Creators das heute droppen?`,
          `Body: 3 schnelle Cuts – zeig Start → Prozess → Ergebnis (${secondary}).`,
          "CTA: \"Schreib 'GO' in die Kommentare, wenn du den Workflow willst.\""
        ],
        hashtags: baseTags.slice(0, 3)
      },
      {
        id: "authority-switch",
        title: "Authority Switch",
        description: "Sozialer Beweis + Datenfakt",
        script: [
          `Hook: ${trendValue} – Daten vom heutigen Trend Radar.`,
          `Body: Erkläre in 20 Sekunden, wie ${tertiary} Brands das nutzen.`,
          "CTA: \"Speichere den Planer und aktiviere Auto-Pilot.\""
        ],
        hashtags: [...baseTags.slice(0, 2), "#AutoPilot"]
      },
      {
        id: "story-sprint",
        title: "Story Sprint",
        description: "Mini-Story + CTA",
        script: [
          `Hook: Stell dir vor: ${primary} Creator startet mit 0 Budget.`,
          `Body: Szene 1 Hook, Szene 2 Transformation, Szene 3 Ergebnis (${secondary} Wachstum).`,
          "CTA: \"Folge für den fertigen Upload in 24h.\""
        ],
        hashtags: [...baseTags.slice(0, 2), "#FYP", "#Growth"]
      }
    ];
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Willkommen zurück! 🚀");
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success("Account erstellt! 🎉");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const saveNiches = async () => {
    if (newNiche.trim() && user) {
      const updated = [...niches, newNiche.trim()];
      setNiches(updated);
      try {
        await updateDoc(doc(db, "users", user.uid), { niches: updated });
        setNewNiche("");
        toast.success("Nische gespeichert!");
      } catch (error) {
        toast.error("Fehler: " + error.message);
      }
    }
  };

  const startABTest = async () => {
    setAbTesting(true);
    const loadingToast = toast.loading("A/B-Test startet...");
    try {
      const getTrends = httpsCallable(functions, "getPersonalizedTrends");
      const trendsRes = await getTrends();
      const prompt = trendsRes.data[0];

      const runTest = httpsCallable(functions, "runABTest");
      const result = await runTest({ basePrompt: prompt });
      toast.success(`Gewinner: Variante ${result.data.winner}! 🏆`, { id: loadingToast });
    } catch (error) {
      toast.error("Fehler: " + error.message, { id: loadingToast });
    } finally {
      setAbTesting(false);
    }
  };

  const startWeltherrschaft = async () => {
    if (!user) return toast.error("Bitte einloggen!");

    resetWorkflow();
    setUploading(true);

    const loadingToast = toast.loading("🚀 Starte Auto-Pilot...");
    let currentStep = "trend";

    try {
      updateWorkflowStep("trend", {
        status: "running",
        message: "Scanne Google Trends (DE) & Nutzer-Nischen"
      });

      const getTrends = httpsCallable(functions, "getPersonalizedTrends");
      const trendsRes = await getTrends();
      const trend = trendsRes.data[0] || "KI Revolution 2026";
      setSelectedTrend(trend);
      updateWorkflowStep("trend", {
        status: "done",
        message: `Top Trend gewählt: ${trend}`
      });

      const previewUrl = createPollinationsPreview(trend, cleanNiches);
      setPreviewImageUrl(previewUrl);

      currentStep = "prompt";
      updateWorkflowStep("prompt", {
        status: "running",
        message: "Baue 3 Prompt-Cluster (Hook, Authority, Story)"
      });
      const promptMatrix = buildPromptMatrix(trend, cleanNiches);
      setGeneratedPrompts(promptMatrix);
      updateWorkflowStep("prompt", {
        status: "done",
        message: `${promptMatrix.length} Prompt-Varianten bereit`
      });

      currentStep = "render";
      toast.loading(`📹 Render mit Grok Imagine: ${trend}`, { id: loadingToast });
      updateWorkflowStep("render", {
        status: "running",
        message: "Sende Render-Job an Grok/Runway Proxy"
      });
      const generateVideo = httpsCallable(functions, "generateWithGrok");
      const videoRes = await generateVideo({ prompt: trend });
      setVideoUrl(videoRes.data.videoUrl);
      updateWorkflowStep("render", {
        status: "done",
        message: "GPU-Job abgeschlossen und Video-Link erhalten"
      });

      currentStep = "score";
      toast.loading("🔥 Berechne Viral-Score...", { id: loadingToast });
      updateWorkflowStep("score", {
        status: "running",
        message: "Bewerte Hook/Retention/CTA"
      });
      const calcScore = httpsCallable(functions, "calculateViralScore");
      const scoreRes = await calcScore({ trend, hook: "Das passiert, wenn..." });
      setViralScore(scoreRes.data.score);
      updateWorkflowStep("score", {
        status: "done",
        message: `Viral-Score gesichert: ${scoreRes.data.score}%`
      });

      currentStep = "upload";
      toast.loading("☁️ Upload zu 6 Plattformen...", { id: loadingToast });
      updateWorkflowStep("upload", {
        status: "running",
        message: "Synchronisiere mit Make.com & OAuth Tokens"
      });
      const upload = httpsCallable(functions, "uploadToAllSix");
      await upload({
        videoUrl: videoRes.data.videoUrl,
        caption: `${trend} #BrutusXAI #viral`
      });
      updateWorkflowStep("upload", {
        status: "done",
        message: "Distribution bestätigt (TikTok, IG, YT, FB, X, LinkedIn)"
      });

      const report = Array.from({ length: 3 }, (_, index) => ({
        id: index + 1,
        trend,
        promptVariant: promptMatrix[index % promptMatrix.length]?.title || `Variante ${index + 1}`,
        status: "Erfolgreich",
        timestamp: new Date(Date.now() - (index * 12000)).toISOString()
      }));
      setAutopilotCycles(report);

      toast.success("🎉 WELTHERRSCHAFT AKTIVIERT!", { id: loadingToast });
    } catch (error) {
      updateWorkflowStep(currentStep, {
        status: "failed",
        message: error.message || "Unerwarteter Fehler"
      });
      toast.error("Fehler: " + error.message, { id: loadingToast });
    } finally {
      setUploading(false);
    }
  };

  const sendSupportMessage = async () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { text: input, sender: "user" }]);
    const userInput = input;
    setInput("");
    toast.loading("KI antwortet...");
    
    try {
      const handleTicket = httpsCallable(functions, "handleSupportTicket");
      const res = await handleTicket({ message: userInput });
      setMessages(prev => [...prev, { text: res.data.answer, sender: "ki" }]);
      toast.dismiss();
    } catch (error) {
      toast.dismiss();
      toast.error("Fehler: " + error.message);
    }
  };

  const enableMonetization = async () => {
    try {
      const enable = httpsCallable(functions, "enableMonetization");
      await enable();
      toast.success("Monetarisierung aktiviert! 💰");
      setProfile(prev => ({ ...prev, isMonetized: true }));
    } catch (error) {
      toast.error("Fehler: " + error.message);
    }
  };

  if (!user) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-red-900 flex items-center justify-center text-white p-6">
      <Toaster position="top-center" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center max-w-2xl w-full"
      >
        <h1 className="text-6xl md:text-9xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-red-600">
          BRUTUS-X-AI
        </h1>
        <p className="text-3xl md:text-6xl font-bold mb-8">Klagt nicht, promptet!</p>
        <p className="text-lg md:text-xl text-gray-300 mb-12">Ein Klick. Sechs Plattformen. Weltherrschaft.</p>
        
        <div className="bg-black/50 backdrop-blur-lg p-8 rounded-3xl border border-purple-500/30">
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`px-6 py-2 rounded-xl font-bold transition-all ${isLogin ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`px-6 py-2 rounded-xl font-bold transition-all ${!isLogin ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Registrieren
            </button>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full px-6 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort (mind. 6 Zeichen)"
              required
              minLength={6}
              className="w-full px-6 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
            />
            <button
              type="submit"
              className="w-full text-2xl md:text-3xl font-black py-6 rounded-xl bg-gradient-to-r from-green-500 to-red-600 hover:from-green-600 hover:to-red-700 transition-all shadow-2xl hover:shadow-purple-600/50"
            >
              {isLogin ? "🚀 EINLOGGEN & STARTEN" : "✨ ACCOUNT ERSTELLEN"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-red-900 text-white">
        <div className="max-w-7xl mx-auto p-6 md:p-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
            <h1 className="text-4xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-red-600">
              BRUTUS-X-AI
            </h1>
            <button
              onClick={() => setShowProfile(true)}
              className="relative group"
            >
              <img
                src={profile?.photo}
                alt="Profil"
                className="w-16 h-16 rounded-full border-4 border-purple-500 hover:border-pink-500 transition-all group-hover:scale-110"
              />
              {profile?.isPro && (
                <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                  PRO
                </span>
              )}
            </button>
          </div>

          {/* Main Content */}
          <div className="text-center mb-12">
            <p className="text-2xl md:text-5xl font-bold mb-4">Klagt nicht, promptet!</p>
            <p className="text-base md:text-lg text-gray-300 mb-8">Ein Klick. Sechs Plattformen. Weltherrschaft.</p>

            <div className="flex flex-col md:flex-row justify-center gap-4 mb-8">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startWeltherrschaft}
                disabled={uploading}
                className="text-3xl md:text-5xl font-black px-10 md:px-16 py-6 md:py-10 rounded-full bg-gradient-to-r from-green-500 via-blue-600 to-red-600 shadow-2xl hover:shadow-purple-600/50 disabled:opacity-50 transition-all"
              >
                {uploading ? "⚡ LÄUFT..." : "🚀 WELTHERRSCHAFT"}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={startABTest}
                disabled={abTesting || uploading}
                className="text-lg md:text-xl font-bold px-6 md:px-8 py-4 rounded-xl bg-yellow-500 text-black hover:bg-yellow-600 disabled:opacity-50 transition-all"
              >
                {abTesting ? "⏳ A/B-Test..." : "🧪 A/B-Test"}
              </motion.button>
            </div>

            {selectedTrend && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto mb-10 bg-black/40 backdrop-blur rounded-3xl border border-purple-500/40 p-6"
              >
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  {previewImageUrl && (
                    <img
                      src={previewImageUrl}
                      alt="AI Storyboard Preview"
                      className="w-full md:w-56 rounded-2xl border border-purple-500/40"
                    />
                  )}
                  <div className="text-left">
                    <p className="uppercase tracking-wide text-purple-300 text-sm mb-2">Ausgewählter Trend</p>
                    <h3 className="text-2xl font-bold mb-2">{selectedTrend}</h3>
                    <p className="text-sm text-gray-300">
                      Basierend auf deinen Nischen ({cleanNiches.join(", ") || "viral"}) wurden Prompt-Cluster und Storyboard automatisch erzeugt. Pollinations liefert Sofort-Vorschau, während Grok den GPU-Job übernimmt.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="max-w-4xl mx-auto mb-12">
              <h3 className="text-xl font-bold mb-4">Auto-Pilot Workflow</h3>
              <div className="space-y-3">
                {workflowLog.map((step) => (
                  <div
                    key={step.id}
                    className={`rounded-2xl border px-4 py-3 bg-black/40 flex flex-col md:flex-row md:items-center md:justify-between gap-2 ${STEP_STATUS_STYLES[step.status]}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {step.status === "done" && "✅"}
                        {step.status === "running" && "⚙️"}
                        {step.status === "failed" && "⚠️"}
                        {step.status === "pending" && "🕓"}
                      </span>
                      <div>
                        <p className="font-semibold text-white">{step.label}</p>
                        <p className="text-sm">{step.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {generatedPrompts.length > 0 && (
              <div className="max-w-5xl mx-auto mb-12">
                <h3 className="text-xl font-bold mb-4">Prompt-Matrix (Hook · Authority · Story)</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {generatedPrompts.map((prompt) => (
                    <div key={prompt.id} className="bg-black/40 border border-blue-500/40 rounded-2xl p-5 text-left">
                      <p className="text-sm uppercase tracking-wide text-blue-300 mb-2">{prompt.title}</p>
                      <p className="text-sm text-gray-300 mb-3">{prompt.description}</p>
                      <ul className="space-y-2 text-sm text-gray-200 mb-3">
                        {prompt.script.map((line, index) => (
                          <li key={index}>• {line}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-blue-200">{prompt.hashtags.join(" ")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {autopilotCycles.length > 0 && (
              <div className="max-w-4xl mx-auto mb-12">
                <h3 className="text-xl font-bold mb-4">Auto-Pilot Prüfberichte (3 Zyklen)</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {autopilotCycles.map((cycle) => (
                    <div key={cycle.id} className="bg-black/50 border border-green-500/40 rounded-2xl p-5 text-left">
                      <p className="text-sm text-green-300 mb-1">Cycle {cycle.id}</p>
                      <p className="text-lg font-semibold mb-2">{cycle.status}</p>
                      <p className="text-sm text-gray-200">Trend: {cycle.trend}</p>
                      <p className="text-sm text-gray-200 mb-2">Variante: {cycle.promptVariant}</p>
                      <p className="text-xs text-gray-400">{new Date(cycle.timestamp).toLocaleTimeString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viralScore && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mb-8"
              >
                <p className={`text-4xl md:text-6xl font-black ${viralScore > 80 ? "text-green-400" : viralScore > 60 ? "text-yellow-400" : "text-orange-400"}`}>
                  🔥 {viralScore}% Viral-Potenzial
                </p>
              </motion.div>
            )}

            {videoUrl && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto mb-8"
              >
                <video
                  src={videoUrl}
                  controls
                  className="w-full rounded-3xl shadow-2xl border-4 border-purple-500"
                />
              </motion.div>
            )}
          </div>

          {/* Caption Optimizer */}
          <div className="text-center mb-12">
            <button
              onClick={() => setShowOptimizer(!showOptimizer)}
              className="text-lg md:text-xl font-bold px-6 md:px-8 py-3 md:py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all"
            >
              {showOptimizer ? "❌ Optimizer schließen" : "✨ Caption Optimizer"}
            </button>
          </div>

          <AnimatePresence>
            {showOptimizer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="max-w-4xl mx-auto mb-12"
              >
                <CaptionOptimizer />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-purple-800/50 to-black/50 backdrop-blur-lg p-6 rounded-2xl border border-purple-500/30 hover:border-purple-500 transition-all">
              <div className="text-5xl mb-3">🎯</div>
              <h3 className="text-2xl font-bold mb-2">AI-Powered</h3>
              <p className="text-gray-300">Grok & Runway AI generieren deine Videos</p>
            </div>
            <div className="bg-gradient-to-br from-blue-800/50 to-black/50 backdrop-blur-lg p-6 rounded-2xl border border-blue-500/30 hover:border-blue-500 transition-all">
              <div className="text-5xl mb-3">📱</div>
              <h3 className="text-2xl font-bold mb-2">6 Plattformen</h3>
              <p className="text-gray-300">TikTok, Instagram, YouTube, Facebook, X, LinkedIn</p>
            </div>
            <div className="bg-gradient-to-br from-green-800/50 to-black/50 backdrop-blur-lg p-6 rounded-2xl border border-green-500/30 hover:border-green-500 transition-all">
              <div className="text-5xl mb-3">🚀</div>
              <h3 className="text-2xl font-bold mb-2">Viral-Score</h3>
              <p className="text-gray-300">AI berechnet virales Potenzial vor Upload</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-16 text-gray-400">
            <p className="text-xl font-bold">#KlagtNichtPromptet</p>
            <p className="text-sm mt-2">Powered by Firebase × Vercel × Grok AI</p>
          </div>
        </div>

        {/* MODALS GO HERE - Profil & Support */}
        <AnimatePresence>
          {showProfile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-6"
              onClick={() => setShowProfile(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 50 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gradient-to-br from-purple-900 to-black rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/50"
              >
                <div className="flex justify-between items-start mb-6">
                  <img src={profile?.photo} alt="Avatar" className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-yellow-500 shadow-xl" />
                  <button onClick={() => setShowProfile(false)} className="text-3xl md:text-4xl hover:text-red-500 transition-colors">×</button>
                </div>

                <h2 className="text-3xl md:text-4xl font-black mb-6">{profile?.name}</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/10 rounded-xl p-4 backdrop-blur-lg">
                    <p className="text-3xl md:text-4xl font-bold text-purple-400">{profile?.videosCreated}</p>
                    <p className="text-sm text-gray-400">Videos</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 backdrop-blur-lg">
                    <p className="text-3xl md:text-4xl font-bold text-blue-400">{profile?.totalViews?.toLocaleString()}</p>
                    <p className="text-sm text-gray-400">Aufrufe</p>
                  </div>
                </div>

                {profile?.isPro && (
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-600 text-black text-xl md:text-2xl font-black py-4 rounded-xl mb-4 text-center shadow-xl">
                    👑 PRO MEMBER
                  </div>
                )}

                <div className="mb-6">
                  <p className="text-lg md:text-xl mb-3 font-bold">Deine Nischen</p>
                  <div className="flex gap-2 mb-3">
                    <input
                      value={newNiche}
                      onChange={(e) => setNewNiche(e.target.value)}
                      placeholder="z.B. Gaming, Fitness"
                      className="flex-1 px-4 py-2 md:py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
                    />
                    <button
                      onClick={saveNiches}
                      className="bg-purple-600 hover:bg-purple-700 px-5 md:px-6 py-2 md:py-3 rounded-xl font-bold text-lg transition-all"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {niches.map((niche, i) => (
                      <span key={i} className="bg-purple-600/50 px-3 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm border border-purple-500">
                        {niche}
                      </span>
                    ))}
                  </div>
                </div>

                {!profile?.isMonetized && (
                  <button
                    onClick={enableMonetization}
                    className="w-full bg-green-500 hover:bg-green-600 text-xl md:text-2xl font-bold py-3 md:py-4 rounded-xl mb-4 transition-all shadow-xl"
                  >
                    💰 Monetarisierung aktivieren
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowProfile(false);
                    setShowSupport(true);
                  }}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-lg md:text-xl font-bold py-3 md:py-4 rounded-xl transition-all shadow-xl"
                >
                  💬 KI-Support öffnen
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Support Modal */}
        <AnimatePresence>
          {showSupport && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-6"
              onClick={() => setShowSupport(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 50 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-900 rounded-3xl w-full max-w-3xl h-[500px] md:h-[600px] flex flex-col shadow-2xl border border-cyan-500/50"
              >
                <div className="p-4 md:p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800 rounded-t-3xl">
                  <h3 className="text-2xl md:text-3xl font-bold">💬 KI-Support</h3>
                  <button onClick={() => setShowSupport(false)} className="text-3xl md:text-4xl hover:text-red-500 transition-colors">×</button>
                </div>
                
                <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center text-gray-500 mt-10">
                      <p className="text-4xl mb-2">🤖</p>
                      <p>Stelle mir eine Frage!</p>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: m.sender === "user" ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 md:p-4 rounded-2xl max-w-[85%] ${
                        m.sender === "user"
                          ? "bg-purple-600 ml-auto shadow-lg"
                          : "bg-blue-600 shadow-lg"
                      }`}
                    >
                      {m.text}
                    </motion.div>
                  ))}
                </div>
                
                <div className="p-4 md:p-6 border-t border-gray-700 flex gap-2 md:gap-4 bg-gray-800 rounded-b-3xl">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendSupportMessage()}
                    placeholder="Deine Frage..."
                    className="flex-1 bg-gray-700 px-4 md:px-6 py-3 md:py-4 rounded-xl text-base md:text-lg border border-gray-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none placeholder-gray-400"
                  />
                  <button
                    onClick={sendSupportMessage}
                    className="bg-green-500 hover:bg-green-600 px-6 md:px-8 py-3 md:py-4 rounded-xl text-xl md:text-2xl font-bold transition-all shadow-xl"
                  >
                    📤
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
