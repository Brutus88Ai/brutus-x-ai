// src/App.jsx – BRUTUS-X-AI Minimal Working Version
import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";

export default function App() {
  const [uploading, setUploading] = useState(false);

  const startWeltherrschaft = () => {
    setUploading(true);
    toast.success("WELTHERRSCHAFT GESTARTET! 🚀");
    setTimeout(() => setUploading(false), 3000);
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-red-900 text-white flex items-center justify-center">
        <div className="text-center p-10">
          <h1 className="text-8xl md:text-9xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-red-600">
            BRUTUS-X-AI
          </h1>
          <p className="text-5xl md:text-7xl font-bold mb-16">
            Klagt nicht, promptet!
          </p>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={startWeltherrschaft}
            disabled={uploading}
            className="text-7xl md:text-9xl font-black px-32 py-24 rounded-full bg-gradient-to-r from-green-500 via-blue-600 via-purple-700 to-red-600 shadow-2xl hover:shadow-purple-600/50 disabled:opacity-50 transition-all"
          >
            {uploading ? "LÄUFT..." : "STARTEN"}
          </motion.button>
        </div>
      </div>
    </>
  );
}
