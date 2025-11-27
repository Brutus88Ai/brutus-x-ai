// src/App.jsx – BRUTUS-X-AI WELTHERRSCHAFT 2026 – DEMO VERSION
import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [viralScore, setViralScore] = useState(null);

  const handleLogin = (e) => {
    e.preventDefault();
    if (email && password) {
      setIsLoggedIn(true);
      toast.success("Willkommen zurück, Welteroberer! 🚀");
    } else {
      toast.error("Email & Passwort erforderlich!");
    }
  };

  const saveNiches = async () => {
    if (newNiche.trim()) {
      const updated = [...niches, newNiche.trim()];
      setNiches(updated);
      await doc(db, "users", user.uid).update({ niches: updated });
      setNewNiche("");
      toast.success("Nische gespeichert – Trends werden passender!");
    }
  };

  const startABTest = async () => {
    setAbTesting(true);
    const trends = await httpsCallable(functions, "getPersonalizedTrends")();
    const prompt = trends.data[0];

    const ab = httpsCallable(functions, "runABTest");
    await ab({ basePrompt: prompt });
    toast.success("A/B-Test läuft – die beste Variante gewinnt automatisch!");
    setAbTesting(false);
  };

  const startWeltherrschaft = async () => {
    if (!user) return toast.error("Bitte einloggen!");
    setUploading(true);
    toast.loading("Suche personalisierte Trends...");

    try {
      const trendRes = await httpsCallable(functions, "getPersonalizedTrends")();
      const trend = trendRes.data[0] || "KI Revolution";

      toast.loading(`Generiere Video zu: ${trend}...`);
      const videoRes = await httpsCallable(functions, "generateWithGrok")({ prompt: trend });
      setVideoUrl(videoRes.data.videoUrl);

      toast.loading("Berechne Viral-Score...");
      const scoreRes = await httpsCallable(functions, "calculateViralScore")({ trend, hook: "Das passiert, wenn du das machst!" });
      setViralScore(scoreRes.data.score);

      toast.loading("Lade auf 6 Plattformen hoch...");
      await httpsCallable(functions, "uploadToAllSix")({ videoUrl: videoRes.data.videoUrl, caption: `${trend} #BrutusXAI #KlagtNichtPromptet` });

      toast.success("WELTHERRSCHAFT AKTIVIERT – Video ist überall live!");
    } catch (err) {
      toast.error("Fehler – wir versuchen es nochmal!");
    } finally {
      setUploading(false);
    }
  };

  const sendSupportMessage = async () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { text: input, sender: "user" }]);
    const handle = httpsCallable(functions, "handleSupportTicket");
    const res = await handle({ message: input });
    setMessages(prev => [...prev, { text: res.data.answer, sender: "ki" }]);
    setInput("");
  };

  const enableMonetization = async () => {
    const enable = httpsCallable(functions, "enableMonetization");
    await enable();
    toast.success("Monetarisierung aktiviert – verdiene mit Views!");
    setProfile(prev => ({ ...prev, isMonetized: true }));
  };

  if (!user) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-black flex items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-9xl font-black mb-8">BRUTUS-X-AI</h1>
        <p className="text-5xl mb-12">Klagt nicht, promptet!</p>
        <button className="text-7xl bg-gradient-to-r from-green-500 to-red-600 px-32 py-24 rounded-full">
          Einloggen & starten
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-red-900 text-white">
        <div className="max-w-6xl mx-auto p-10 text-center">
          <h1 className="text-8xl md:text-9xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-red-600">
            BRUTUS-X-AI
          </h1>
          <p className="text-5xl md:text-7xl font-bold mb-16">
            Klagt nicht, promptet!
          </p>

          {/* WELTHERRSCHAFT-KNOPF */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={startWeltherrschaft}
            disabled={uploading}
            className="text-7xl md:text-9xl font-black px-32 py-24 rounded-full bg-gradient-to-r from-green-500 via-blue-600 via-purple-700 to-red-600 shadow-2xl hover:shadow-purple-600/50 disabled:opacity-50"
          >
            {uploading ? "WELTHERRSCHAFT LÄUFT..." : "WELTHERRSCHAFT STARTEN"}
          </motion.button>

          {/* A/B-TESTING BUTTON */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={startABTest}
            disabled={abTesting}
            className="text-4xl font-bold px-20 py-12 rounded-2xl bg-yellow-500 text-black mt-8"
          >
            {abTesting ? "A/B-Test läuft..." : "A/B-Test starten (beste Version gewinnt)"}
          </motion.button>

          {viralScore && (
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`text-9xl font-black mt-16 ${viralScore > 90 ? "text-green-400" : "text-yellow-400"}`}
            >
              {viralScore}% Viral-Chance
            </motion.p>
          )}

          {videoUrl && (
            <motion.video
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              src={videoUrl}
              controls
              className="mt-20 w-full max-w-2xl mx-auto rounded-3xl shadow-2xl"
            />
          )}
        </div>

        {/* PROFIL-BUTTON */}
        <button onClick={() => setShowProfile(true)} className="fixed top-8 right-8 bg-white/20 backdrop-blur-lg rounded-full p-4 shadow-2xl hover:scale-110">
          <img src={profile?.photo} alt="Profil" className="w-16 h-16 rounded-full" />
        </button>

        {/* PROFIL MODAL */}
        {showProfile && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-6">
            <div className="bg-gradient-to-br from-purple-800 to-black rounded-3xl p-10 max-w-2xl w-full">
              <div className="flex justify-between items-start mb-8">
                <img src={profile?.photo} alt="Avatar" className="w-32 h-32 rounded-full border-4 border-yellow-500" />
                <button onClick={() => setShowProfile(false)} className="text-5xl">×</button>
              </div>

              <h2 className="text-5xl font-black mb-4">{profile?.name}</h2>
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="bg-white/10 rounded-2xl p-6">
                  <p className="text-5xl font-bold">{profile?.videosCreated}</p>
                  <p>Videos</p>
                </div>
                <div className="bg-white/10 rounded-2xl p-6">
                  <p className="text-5xl font-bold">{profile?.totalViews.toLocaleString()}</p>
                  <p>Aufrufe</p>
                </div>
              </div>

              {profile?.isPro ? (
                <div className="bg-gradient-to-r from-yellow-500 to-orange-600 text-black text-4xl font-black py-6 rounded-2xl mb-6">
                  PRO MEMBER
                </div>
              ) : (
                <button className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-4xl py-8 rounded-2xl font-bold mb-6">
                  Jetzt Pro werden
                </button>
              )}

              {/* NISCHEN SPEICHERN */}
              <div className="mb-6">
                <p className="text-3xl mb-4">Deine Nischen</p>
                <div className="flex gap-2 mb-4">
                  <input
                    value={newNiche}
                    onChange={(e) => setNewNiche(e.target.value)}
                    placeholder="z.B. Gaming, Fitness"
                    className="flex-1 px-4 py-3 rounded-xl text-black"
                  />
                  <button onClick={saveNiches} className="bg-purple-600 px-6 py-3 rounded-xl">
                    Hinzufügen
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {niches.map((niche, i) => (
                    <span key={i} className="bg-purple-600 px-4 py-2 rounded-full text-sm">
                      {niche}
                    </span>
                  ))}
                </div>
              </div>

              {/* MONETARISIERUNG */}
              {!profile?.isMonetized ? (
                <button onClick={enableMonetization} className="w-full bg-green-500 text-4xl py-8 rounded-2xl font-bold mb-6">
                  Monetarisierung aktivieren (Geld verdienen!)
                </button>
              ) : (
                <div className="bg-gradient-to-r from-yellow-500 to-green-500 text-black text-4xl font-black py-6 rounded-2xl mb-6">
                  Du verdienst Geld mit Views!
                </div>
              )}

              {/* KI-SUPPORT */}
              <button
                onClick={() => {
                  setShowProfile(false);
                  setShowSupport(true);
                }}
                className="w-full bg-cyan-600 text-4xl py-6 rounded-2xl font-bold"
              >
                KI-Support öffnen
              </button>
            </div>
          </div>
        )}

        {/* KI-SUPPORT MODAL */}
        {showSupport && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-6">
            <div className="bg-gray-900 rounded-3xl w-full max-w-3xl h-96 flex flex-col">
              <div className="p-6 border-b border-gray-700 flex justify-between">
                <h3 className="text-4xl font-bold">KI-Support (sofort)</h3>
                <button onClick={() => setShowSupport(false)} className="text-5xl">×</button>
              </div>
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={`p-4 rounded-2xl max-w-xs ${m.sender === "user" ? "bg-purple-600 ml-auto" : "bg-blue-600"}`}>
                    {m.text}
                  </div>
                ))}
              </div>
              <div className="p-6 border-t border-gray-700 flex gap-4">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendSupportMessage()}
                  placeholder="Deine Frage..."
                  className="flex-1 bg-gray-800 px-6 py-4 rounded-xl text-xl"
                />
                <button onClick={sendSupportMessage} className="bg-green-500 px-10 py-4 rounded-xl text-2xl font-bold">
                  Senden
                </button>
              </div>
            </div>
          </div>
        )}

        <CookieBanner />
      </div>
    </>
  );
}