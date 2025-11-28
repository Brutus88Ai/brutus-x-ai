// src/components/CaptionOptimizer.jsx - AI Caption Optimizer für Brutus-X-AI
import { useState, useRef, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../utils/firebase';
import toast, { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';

export function CaptionOptimizer() {
  const [caption, setCaption] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState(null);
  const [originalCaption, setOriginalCaption] = useState('');
  const formRef = useRef(null);
  const resultRef = useRef(null);

  const handleOptimize = async (e) => {
    e.preventDefault();
    
    if (!caption.trim() || caption.length < 10) {
      toast.error('Caption muss mindestens 10 Zeichen haben!');
      return;
    }

    setOptimizing(true);
    setOriginalCaption(caption);
    const loadingToast = toast.loading('AI optimiert deine Caption...');

    try {
      const optimizeCaptionFn = httpsCallable(functions, 'optimizeCaption');
      const response = await optimizeCaptionFn({ caption: caption.trim() });
      
      setResult({
        original: caption,
        optimized: response.data.optimizedCaption,
        improvements: response.data.improvements
      });

      toast.dismiss(loadingToast);
      toast.success('Caption optimiert! 🚀');
      
      formRef.current?.reset();
      setCaption('');
      
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Fehler bei Optimierung: ' + error.message);
      console.error('Caption optimization error:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const handleCopy = (text) => {
    if (navigator.clipboard && text) {
      navigator.clipboard.writeText(text);
      toast.success('In Zwischenablage kopiert! ✓');
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900 to-black border-2 border-purple-500/30 rounded-2xl p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">✨</span>
          <h2 className="text-2xl font-bold text-white">AI Caption Optimizer</h2>
        </div>
        <p className="text-gray-400 mb-6">
          Lass die KI deine Caption für maximale Reichweite optimieren!
        </p>

        <form onSubmit={handleOptimize} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Deine Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="z.B. Check out my new video! It's about my trip to the mountains. #travel #adventure"
              rows={4}
              maxLength={500}
              required
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all resize-none"
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {caption.length}/500 Zeichen
            </div>
          </div>

          <button
            type="submit"
            disabled={optimizing || caption.length < 10}
            className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {optimizing ? (
              <>
                <span className="animate-spin">🔄</span>
                Optimizing...
              </>
            ) : (
              <>
                <span>🪄</span>
                Caption optimieren
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Result Card */}
      {result && (
        <motion.div
          ref={resultRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-green-900/20 to-black border-2 border-green-500/30 rounded-2xl p-6 shadow-2xl"
        >
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span>🎯</span>
            Optimierungsergebnis
          </h3>

          <div className="space-y-6">
            {/* Original */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Original
              </label>
              <blockquote className="text-gray-500 italic border-l-4 border-gray-700 pl-4 text-sm">
                {result.original}
              </blockquote>
            </div>

            <div className="border-t border-gray-800"></div>

            {/* Optimized */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-green-400">
                  Optimiert ✨
                </label>
                <button
                  onClick={() => handleCopy(result.optimized)}
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs flex items-center gap-1 transition-all"
                >
                  <span>📋</span>
                  Kopieren
                </button>
              </div>
              <p className="text-white font-medium leading-relaxed">
                {result.optimized}
              </p>
            </div>

            {/* Improvements */}
            {result.improvements && result.improvements.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-blue-400 mb-2">
                  🔍 Was wurde verbessert:
                </label>
                <ul className="space-y-2">
                  {result.improvements.map((improvement, idx) => (
                    <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
