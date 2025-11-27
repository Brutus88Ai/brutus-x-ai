// src/App.jsx – BRUTUS-X-AI Full Version with Firebase
import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "./utils/firebase";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import { CaptionOptimizer } from "./components/CaptionOptimizer";

export default function App() {
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [viralScore, setViralScore] = useState(null);
  const [showOptimizer, setShowOptimizer] = useState(false);

  const startWeltherrschaft = async () => {
    setUploading(true);
    const loadingToast = toast.loading("🚀 Generiere virales Video...");

    try {
      // 1. Trends holen
      const getTrends = httpsCallable(functions, "getPersonalizedTrends");
      const trendsRes = await getTrends();
      const trend = trendsRes.data[0] || "Virale KI Revolution 2026";
      
      toast.loading(`📹 Video zu: ${trend}`, { id: loadingToast });

      // 2. Video generieren
      const generateVideo = httpsCallable(functions, "generateWithGrok");
      const videoRes = await generateVideo({ prompt: trend });
      setVideoUrl(videoRes.data.videoUrl);

      // 3. Viral-Score berechnen
      const calcScore = httpsCallable(functions, "calculateViralScore");
      const scoreRes = await calcScore({ trend, hook: "Das passiert, wenn..." });
      setViralScore(scoreRes.data.score);

      toast.loading("☁️ Upload zu 6 Plattformen...", { id: loadingToast });

      // 4. Multi-Platform Upload
      const upload = httpsCallable(functions, "uploadToAllSix");
      await upload({ 
        videoUrl: videoRes.data.videoUrl, 
        caption: `${trend} #BrutusXAI #viral` 
      });

      toast.success("🎉 WELTHERRSCHAFT AKTIVIERT! Video überall live!", { id: loadingToast });
    } catch (error) {
      console.error(error);
      toast.error("⚠️ Fehler: " + error.message, { id: loadingToast });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-red-900 text-white">
        <div className="max-w-7xl mx-auto p-10">
          <div className="text-center mb-16">
            <h1 className="text-8xl md:text-9xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-red-600">
              BRUTUS-X-AI
            </h1>
            <p className="text-5xl md:text-7xl font-bold mb-4">
              Klagt nicht, promptet!
            </p>
            <p className="text-xl text-gray-300 mb-8">
              Ein Klick. Sechs Plattformen. Weltherrschaft.
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startWeltherrschaft}
              disabled={uploading}
              className="text-5xl md:text-7xl font-black px-20 py-12 rounded-full bg-gradient-to-r from-green-500 via-blue-600 to-red-600 shadow-2xl hover:shadow-purple-600/50 disabled:opacity-50 transition-all mb-8"
            >
              {uploading ? "⚡ WELTHERRSCHAFT LÄUFT..." : "🚀 WELTHERRSCHAFT STARTEN"}
            </motion.button>

            {viralScore && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mt-8"
              >
                <p className={`text-6xl font-black ${viralScore > 80 ? "text-green-400" : viralScore > 60 ? "text-yellow-400" : "text-orange-400"}`}>
                  🔥 {viralScore}% Viral-Potenzial
                </p>
              </motion.div>
            )}

            {videoUrl && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 max-w-2xl mx-auto"
              >
                <video
                  src={videoUrl}
                  controls
                  className="w-full rounded-3xl shadow-2xl border-4 border-purple-500"
                />
              </motion.div>
            )}
          </div>

          {/* Caption Optimizer Button */}
          <div className="text-center mb-12">
            <button
              onClick={() => setShowOptimizer(!showOptimizer)}
              className="text-2xl font-bold px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all"
            >
              {showOptimizer ? "❌ Caption Optimizer schließen" : "✨ Caption Optimizer öffnen"}
            </button>
          </div>

          {/* Caption Optimizer Component */}
          {showOptimizer && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto"
            >
              <CaptionOptimizer />
            </motion.div>
          )}

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="bg-gradient-to-br from-purple-800/50 to-black/50 backdrop-blur-lg p-6 rounded-2xl border border-purple-500/30">
              <div className="text-5xl mb-3">🎯</div>
              <h3 className="text-2xl font-bold mb-2">AI-Powered</h3>
              <p className="text-gray-300">Grok & Runway AI generieren deine Videos automatisch</p>
            </div>
            <div className="bg-gradient-to-br from-blue-800/50 to-black/50 backdrop-blur-lg p-6 rounded-2xl border border-blue-500/30">
              <div className="text-5xl mb-3">📱</div>
              <h3 className="text-2xl font-bold mb-2">6 Plattformen</h3>
              <p className="text-gray-300">TikTok, Instagram, YouTube, Facebook, X, LinkedIn</p>
            </div>
            <div className="bg-gradient-to-br from-green-800/50 to-black/50 backdrop-blur-lg p-6 rounded-2xl border border-green-500/30">
              <div className="text-5xl mb-3">🚀</div>
              <h3 className="text-2xl font-bold mb-2">Viral-Score</h3>
              <p className="text-gray-300">AI berechnet dein virales Potenzial vor dem Upload</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-16 text-gray-500">
            <p className="text-xl">#KlagtNichtPromptet</p>
            <p className="text-sm mt-2">Powered by Firebase × Vercel × Grok AI</p>
          </div>
        </div>
      </div>
    </>
  );
}
