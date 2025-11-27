import { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';

// =============================================================================
// FIREBASE CONFIG - Replace with your own Firebase config
// =============================================================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Initialize Firebase only if properly configured
let app;
let db;
const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('Firebase initialized successfully');
  } catch (e) {
    console.warn('Firebase initialization failed. Running in demo mode.', e);
    db = null;
  }
} else {
  console.log('Firebase not configured. Running in demo mode.');
}

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================
const JOB_STATUS = {
  PENDING: 'pending',
  DRAFTING: 'drafting',
  OPTIMIZING: 'optimizing',
  GENERATING_IMAGE: 'generating_image',
  WEBHOOK: 'webhook',
  PUBLISHING: 'publishing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes lock timeout
const POLL_INTERVAL_MS = 10000; // 10 seconds polling interval
const DEMO_JOB_LIMIT = 1;
const WORKER_ID = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// RSS Fallback Topics for Trend Scan
const FALLBACK_TRENDS = [
  { title: 'AI Revolution in 2024', source: 'Tech News', category: 'Technology' },
  { title: 'Sustainable Living Tips', source: 'Eco Daily', category: 'Lifestyle' },
  { title: 'Remote Work Best Practices', source: 'Work Life', category: 'Business' },
  { title: 'Fitness Trends This Season', source: 'Health Hub', category: 'Health' },
  { title: 'Crypto Market Analysis', source: 'Finance Today', category: 'Finance' },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Sanitize text to prevent XSS attacks
 */
function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validate URL for safe usage
 */
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Delay function for async operations
 */
// eslint-disable-next-line no-unused-vars
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// =============================================================================
// API INTEGRATION FUNCTIONS
// =============================================================================

/**
 * Fetch trending topics from RSS feeds with fallback
 */
async function fetchTrends(rssUrl) {
  if (!rssUrl || !isValidUrl(rssUrl)) {
    return { trends: FALLBACK_TRENDS, source: 'fallback' };
  }

  try {
    // Using a CORS proxy for RSS fetching
    const corsProxy = 'https://api.rss2json.com/v1/api.json?rss_url=';
    const encodedUrl = encodeURIComponent(rssUrl);
    const response = await fetch(`${corsProxy}${encodedUrl}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) throw new Error('RSS fetch failed');

    const data = await response.json();
    if (data.status !== 'ok' || !data.items?.length) {
      throw new Error('No RSS items');
    }

    return {
      trends: data.items.slice(0, 5).map((item) => ({
        title: sanitizeText(item.title),
        source: sanitizeText(data.feed?.title || 'RSS Feed'),
        category: 'Trending',
        link: isValidUrl(item.link) ? item.link : null,
      })),
      source: 'rss',
    };
  } catch {
    return { trends: FALLBACK_TRENDS, source: 'fallback' };
  }
}

/**
 * Generate content draft using Gemini API
 */
async function generateDraft(topic, brandVoice, geminiApiKey) {
  if (!geminiApiKey) {
    // Demo mode: generate mock draft
    return {
      title: `Draft: ${sanitizeText(topic)}`,
      content: `This is a demo draft about "${sanitizeText(topic)}" in the style of "${sanitizeText(brandVoice)}". To generate real content, please add your Gemini API key.`,
      hashtags: ['#demo', '#brutusai', '#content'],
    };
  }

  const prompt = `Create a viral social media post about: "${topic}"
Brand Voice: ${brandVoice}
Include:
1. An attention-grabbing title
2. Engaging content (150-200 words)
3. 5 relevant hashtags

Format as JSON: {"title": "", "content": "", "hashtags": []}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) throw new Error('Gemini API failed');

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: sanitizeText(parsed.title || topic),
        content: sanitizeText(parsed.content || text),
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(sanitizeText) : [],
      };
    }

    return {
      title: sanitizeText(topic),
      content: sanitizeText(text),
      hashtags: ['#content'],
    };
  } catch (error) {
    throw new Error(`Draft generation failed: ${error.message}`);
  }
}

/**
 * Optimize content using Gemini API
 */
async function optimizeContent(draft, brandVoice, geminiApiKey) {
  if (!geminiApiKey) {
    return {
      ...draft,
      content: `${draft.content}\n\n[Optimized for ${sanitizeText(brandVoice)} brand voice]`,
      optimized: true,
    };
  }

  const prompt = `Optimize this social media content for viral engagement:
Title: ${draft.title}
Content: ${draft.content}
Brand Voice: ${brandVoice}

Improve clarity, emotional impact, and call-to-action. Keep the same structure.
Format as JSON: {"title": "", "content": "", "hashtags": []}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) throw new Error('Optimization failed');

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: sanitizeText(parsed.title || draft.title),
        content: sanitizeText(parsed.content || draft.content),
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(sanitizeText) : draft.hashtags,
        optimized: true,
      };
    }

    return { ...draft, optimized: true };
  } catch (error) {
    throw new Error(`Optimization failed: ${error.message}`);
  }
}

/**
 * Generate image using Pollinations API
 */
async function generateImage(prompt) {
  const sanitizedPrompt = encodeURIComponent(prompt.slice(0, 200));
  const seed = Math.floor(Math.random() * 1000000);
  const imageUrl = `https://image.pollinations.ai/prompt/${sanitizedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`;

  // Verify image loads
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(imageUrl);
    img.onerror = () => reject(new Error('Image generation failed'));
    img.src = imageUrl;

    // Timeout after 30 seconds
    setTimeout(() => reject(new Error('Image generation timeout')), 30000);
  });
}

/**
 * Send data to Make.com webhook
 */
async function sendToWebhook(webhookUrl, data) {
  if (!webhookUrl || !isValidUrl(webhookUrl)) {
    console.log('No webhook URL configured, skipping webhook step');
    return { success: true, skipped: true };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) throw new Error(`Webhook failed: ${response.status}`);

    return { success: true };
  } catch (error) {
    throw new Error(`Webhook failed: ${error.message}`);
  }
}

// =============================================================================
// FIRESTORE JOB LOCKING FUNCTIONS
// =============================================================================

/**
 * Acquire a lock on a job using Firestore transactions
 * Implements optimistic locking to prevent race conditions
 */
async function acquireJobLock(jobId) {
  if (!db) return null;

  const jobRef = doc(db, 'jobs', jobId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const jobDoc = await transaction.get(jobRef);

      if (!jobDoc.exists()) {
        throw new Error('Job not found');
      }

      const jobData = jobDoc.data();

      // Check if job is already locked by another worker
      if (jobData.lockedBy && jobData.lockedBy !== WORKER_ID) {
        const lockExpiry = jobData.lockExpiry?.toMillis?.() || 0;
        if (Date.now() < lockExpiry) {
          return null; // Job is locked by another worker
        }
      }

      // Check if job is already completed or failed
      if (jobData.status === JOB_STATUS.COMPLETED || jobData.status === JOB_STATUS.FAILED) {
        return null;
      }

      // Acquire lock
      const lockExpiry = Timestamp.fromMillis(Date.now() + LOCK_TIMEOUT_MS);
      transaction.update(jobRef, {
        lockedBy: WORKER_ID,
        lockExpiry: lockExpiry,
        lastUpdated: serverTimestamp(),
      });

      return { id: jobId, ...jobData };
    });

    return result;
  } catch (error) {
    console.error('Lock acquisition failed:', error);
    return null;
  }
}

/**
 * Release job lock
 */
async function releaseJobLock(jobId) {
  if (!db) return;

  const jobRef = doc(db, 'jobs', jobId);

  try {
    await updateDoc(jobRef, {
      lockedBy: null,
      lockExpiry: null,
      lastUpdated: serverTimestamp(),
    });
  } catch (error) {
    console.error('Lock release failed:', error);
  }
}

/**
 * Update job status in Firestore
 */
async function updateJobStatus(jobId, status, data = {}) {
  if (!db) return;

  const jobRef = doc(db, 'jobs', jobId);

  try {
    await updateDoc(jobRef, {
      status,
      ...data,
      lastUpdated: serverTimestamp(),
    });
  } catch (error) {
    console.error('Status update failed:', error);
    throw error;
  }
}

/**
 * Fetch next pending job
 */
async function fetchNextPendingJob() {
  if (!db) return null;

  const jobsRef = collection(db, 'jobs');
  const q = query(
    jobsRef,
    where('status', '==', JOB_STATUS.PENDING),
    orderBy('createdAt', 'asc'),
    limit(1)
  );

  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const jobDoc = snapshot.docs[0];
    return { id: jobDoc.id, ...jobDoc.data() };
  } catch (error) {
    console.error('Fetch pending job failed:', error);
    return null;
  }
}

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================
function App() {
  // State management
  const [isAutoPilotActive, setIsAutoPilotActive] = useState(false);
  const [currentJob, setCurrentJob] = useState(null);
  const [jobQueue, setJobQueue] = useState([]);
  const [logs, setLogs] = useState([]);
  const [trends, setTrends] = useState([]);
  const [trendSource, setTrendSource] = useState('');

  // Configuration state
  const [rssUrl, setRssUrl] = useState('');
  const [brandVoice, setBrandVoice] = useState('Professional, engaging, and authentic');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  // Freemium state
  const [isProUser, setIsProUser] = useState(false);
  const [demoJobsUsed, setDemoJobsUsed] = useState(0);

  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);

  // Refs for cleanup
  const autoPilotIntervalRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Add log entry
  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-99), { message, type, timestamp }]);
  }, []);

  // ==========================================================================
  // TREND SCANNING
  // ==========================================================================
  const scanTrends = useCallback(async () => {
    setIsLoading(true);
    addLog('Scanning for trending topics...');

    try {
      const result = await fetchTrends(rssUrl);
      setTrends(result.trends);
      setTrendSource(result.source);
      addLog(`Found ${result.trends.length} trends (${result.source})`, 'success');
    } catch (error) {
      addLog(`Trend scan failed: ${error.message}`, 'error');
      setTrends(FALLBACK_TRENDS);
      setTrendSource('fallback');
    } finally {
      setIsLoading(false);
    }
  }, [rssUrl, addLog]);

  // ==========================================================================
  // JOB CREATION
  // ==========================================================================
  const createJob = useCallback(
    async (topic) => {
      // Freemium check
      if (!isProUser && demoJobsUsed >= DEMO_JOB_LIMIT) {
        addLog('Demo limit reached. Upgrade to Pro for unlimited jobs!', 'warning');
        return null;
      }

      const jobData = {
        topic: sanitizeText(topic),
        brandVoice: sanitizeText(brandVoice),
        status: JOB_STATUS.PENDING,
        createdAt: serverTimestamp(),
        lockedBy: null,
        lockExpiry: null,
        draft: null,
        optimizedContent: null,
        imageUrl: null,
        webhookResponse: null,
        error: null,
      };

      if (db) {
        try {
          const docRef = await addDoc(collection(db, 'jobs'), jobData);
          addLog(`Job created: ${topic}`, 'success');

          if (!isProUser) {
            setDemoJobsUsed((prev) => prev + 1);
          }

          return { id: docRef.id, ...jobData };
        } catch (error) {
          addLog(`Job creation failed: ${error.message}`, 'error');
          return null;
        }
      } else {
        // Demo mode: create local job
        const demoJob = {
          id: `demo-${Date.now()}`,
          ...jobData,
          createdAt: new Date(),
        };

        setJobQueue((prev) => [...prev, demoJob]);
        addLog(`Demo job created: ${topic}`, 'success');

        if (!isProUser) {
          setDemoJobsUsed((prev) => prev + 1);
        }

        return demoJob;
      }
    },
    [brandVoice, isProUser, demoJobsUsed, addLog]
  );

  // ==========================================================================
  // JOB PROCESSING PIPELINE
  // ==========================================================================
  const processJob = useCallback(
    async (job) => {
      if (!job) return;

      addLog(`Processing job: ${job.topic}`);
      setCurrentJob(job);

      try {
        // Step 1: Draft
        addLog('Step 1/5: Generating draft...', 'info');
        if (db) await updateJobStatus(job.id, JOB_STATUS.DRAFTING);

        const draft = await generateDraft(job.topic, brandVoice, geminiApiKey);
        addLog('Draft generated successfully', 'success');

        // Step 2: Optimize
        addLog('Step 2/5: Optimizing content...', 'info');
        if (db) await updateJobStatus(job.id, JOB_STATUS.OPTIMIZING, { draft });

        const optimizedContent = await optimizeContent(draft, brandVoice, geminiApiKey);
        addLog('Content optimized', 'success');

        // Step 3: Generate Image
        addLog('Step 3/5: Generating image...', 'info');
        if (db) await updateJobStatus(job.id, JOB_STATUS.GENERATING_IMAGE, { optimizedContent });

        const imageUrl = await generateImage(optimizedContent.title);
        addLog('Image generated', 'success');

        // Step 4: Webhook
        addLog('Step 4/5: Sending to webhook...', 'info');
        if (db) await updateJobStatus(job.id, JOB_STATUS.WEBHOOK, { imageUrl });

        const webhookResponse = await sendToWebhook(webhookUrl, {
          title: optimizedContent.title,
          content: optimizedContent.content,
          hashtags: optimizedContent.hashtags,
          imageUrl,
          jobId: job.id,
          timestamp: new Date().toISOString(),
        });

        if (webhookResponse.skipped) {
          addLog('Webhook skipped (no URL configured)', 'info');
        } else {
          addLog('Webhook sent successfully', 'success');
        }

        // Step 5: Complete
        addLog('Step 5/5: Completing job...', 'info');
        if (db) {
          await updateJobStatus(job.id, JOB_STATUS.COMPLETED, {
            webhookResponse,
            completedAt: serverTimestamp(),
          });
          await releaseJobLock(job.id);
        }

        addLog(`Job completed: ${job.topic}`, 'success');

        // Update local state
        setJobQueue((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  status: JOB_STATUS.COMPLETED,
                  draft,
                  optimizedContent,
                  imageUrl,
                }
              : j
          )
        );

        return { success: true, draft, optimizedContent, imageUrl };
      } catch (error) {
        addLog(`Job failed: ${error.message}`, 'error');

        if (db) {
          await updateJobStatus(job.id, JOB_STATUS.FAILED, { error: error.message });
          await releaseJobLock(job.id);
        }

        setJobQueue((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, status: JOB_STATUS.FAILED, error: error.message } : j))
        );

        return { success: false, error: error.message };
      } finally {
        setCurrentJob(null);
      }
    },
    [brandVoice, geminiApiKey, webhookUrl, addLog]
  );

  // ==========================================================================
  // AUTO-PILOT LOOP
  // ==========================================================================
  const runAutoPilot = useCallback(async () => {
    if (isProcessingRef.current) {
      addLog('Processing in progress, skipping cycle', 'info');
      return;
    }

    isProcessingRef.current = true;

    try {
      // Try to get a job from Firestore
      if (db) {
        const pendingJob = await fetchNextPendingJob();
        if (pendingJob) {
          const lockedJob = await acquireJobLock(pendingJob.id);
          if (lockedJob) {
            await processJob(lockedJob);
          } else {
            addLog('Could not acquire job lock, will retry', 'info');
          }
        } else {
          addLog('No pending jobs in queue', 'info');
        }
      } else {
        // Demo mode: process local queue
        const pendingJob = jobQueue.find((j) => j.status === JOB_STATUS.PENDING);
        if (pendingJob) {
          await processJob(pendingJob);
        } else {
          addLog('No pending jobs in demo queue', 'info');
        }
      }
    } catch (error) {
      addLog(`Auto-pilot error: ${error.message}`, 'error');
    } finally {
      isProcessingRef.current = false;
    }
  }, [jobQueue, processJob, addLog]);

  // ==========================================================================
  // AUTO-PILOT EFFECT
  // ==========================================================================
  useEffect(() => {
    if (isAutoPilotActive) {
      addLog('Auto-Pilot activated', 'success');

      // Run immediately
      runAutoPilot();

      // Set up interval
      autoPilotIntervalRef.current = setInterval(runAutoPilot, POLL_INTERVAL_MS);

      return () => {
        if (autoPilotIntervalRef.current) {
          clearInterval(autoPilotIntervalRef.current);
        }
        addLog('Auto-Pilot deactivated', 'info');
      };
    }
  }, [isAutoPilotActive, runAutoPilot, addLog]);

  // Load trends on mount
  useEffect(() => {
    scanTrends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================================================
  // UI COMPONENTS
  // ==========================================================================

  const StatusBadge = ({ status }) => {
    const colors = {
      [JOB_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800',
      [JOB_STATUS.DRAFTING]: 'bg-blue-100 text-blue-800',
      [JOB_STATUS.OPTIMIZING]: 'bg-purple-100 text-purple-800',
      [JOB_STATUS.GENERATING_IMAGE]: 'bg-indigo-100 text-indigo-800',
      [JOB_STATUS.WEBHOOK]: 'bg-cyan-100 text-cyan-800',
      [JOB_STATUS.PUBLISHING]: 'bg-teal-100 text-teal-800',
      [JOB_STATUS.COMPLETED]: 'bg-green-100 text-green-800',
      [JOB_STATUS.FAILED]: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const LogEntry = ({ log }) => {
    const colors = {
      info: 'text-gray-600',
      success: 'text-green-600',
      warning: 'text-yellow-600',
      error: 'text-red-600',
    };

    return (
      <div className={`text-sm ${colors[log.type]} font-mono`}>
        <span className="text-gray-400">[{log.timestamp}]</span> {log.message}
      </div>
    );
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">B</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">BrutusAI Pilot</h1>
                <p className="text-sm text-gray-500">Viral Content Automation</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {!isProUser && (
                <div className="text-sm text-gray-500">
                  Demo: {demoJobsUsed}/{DEMO_JOB_LIMIT} jobs
                </div>
              )}
              <button
                onClick={() => setIsProUser(!isProUser)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isProUser ? 'bg-green-100 text-green-800' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isProUser ? '✓ Pro User' : 'Upgrade to Pro'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['dashboard', 'trends', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Auto-Pilot Control */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Auto-Pilot Mode</h2>
                  <p className="text-sm text-gray-500">
                    Automatically process jobs: Draft → Optimize → Image → Webhook → Publish
                  </p>
                </div>
                <button
                  onClick={() => setIsAutoPilotActive(!isAutoPilotActive)}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    isAutoPilotActive
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isAutoPilotActive ? '⏹ Stop Auto-Pilot' : '▶ Start Auto-Pilot'}
                </button>
              </div>

              {isAutoPilotActive && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                    <span className="text-blue-800 font-medium">Auto-Pilot Active</span>
                    <span className="text-blue-600 text-sm">• Checking every {POLL_INTERVAL_MS / 1000}s</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Create Job */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Job</h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const topic = e.target.topic.value.trim();
                    if (topic) {
                      await createJob(topic);
                      e.target.reset();
                    }
                  }}
                  className="space-y-4"
                >
                  <input
                    type="text"
                    name="topic"
                    placeholder="Enter content topic..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={200}
                    required
                  />
                  <button
                    type="submit"
                    disabled={!isProUser && demoJobsUsed >= DEMO_JOB_LIMIT}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Create Job
                  </button>
                </form>
              </div>

              {/* Current Job */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Job</h3>
                {currentJob ? (
                  <div className="space-y-2">
                    <p className="font-medium text-gray-800">{currentJob.topic}</p>
                    <StatusBadge status={currentJob.status} />
                    <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{
                          width:
                            currentJob.status === JOB_STATUS.DRAFTING
                              ? '20%'
                              : currentJob.status === JOB_STATUS.OPTIMIZING
                                ? '40%'
                                : currentJob.status === JOB_STATUS.GENERATING_IMAGE
                                  ? '60%'
                                  : currentJob.status === JOB_STATUS.WEBHOOK
                                    ? '80%'
                                    : currentJob.status === JOB_STATUS.COMPLETED
                                      ? '100%'
                                      : '0%',
                        }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No job currently processing</p>
                )}
              </div>
            </div>

            {/* Job Queue */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Queue</h3>
              {jobQueue.length > 0 ? (
                <div className="space-y-3">
                  {jobQueue.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{job.topic}</p>
                        <p className="text-sm text-gray-500">ID: {job.id}</p>
                      </div>
                      <StatusBadge status={job.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No jobs in queue. Create a new job or scan trends.</p>
              )}
            </div>

            {/* Activity Log */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h3>
              <div className="h-64 overflow-y-auto bg-gray-50 rounded-lg p-4 space-y-1">
                {logs.length > 0 ? (
                  logs.map((log, index) => <LogEntry key={index} log={log} />)
                ) : (
                  <p className="text-gray-500 text-sm">No activity yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            {/* RSS Input */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Trend Scanner</h3>
              <div className="flex space-x-4">
                <input
                  type="url"
                  value={rssUrl}
                  onChange={(e) => setRssUrl(e.target.value)}
                  placeholder="Enter RSS feed URL (optional)..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={scanTrends}
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300"
                >
                  {isLoading ? 'Scanning...' : 'Scan Trends'}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Source: <span className="font-medium">{trendSource || 'None'}</span>
              </p>
            </div>

            {/* Trend Results */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Trending Topics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trends.map((trend, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-100 hover:shadow-md transition-shadow"
                  >
                    <h4 className="font-medium text-gray-800 mb-2">{trend.title}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{trend.source}</span>
                      <button
                        onClick={() => createJob(trend.title)}
                        disabled={!isProUser && demoJobsUsed >= DEMO_JOB_LIMIT}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300"
                      >
                        Create Job
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Configuration</h3>

              <div className="space-y-6">
                {/* Brand Voice */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brand Voice</label>
                  <textarea
                    value={brandVoice}
                    onChange={(e) => setBrandVoice(e.target.value)}
                    placeholder="Describe your brand voice..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                    maxLength={500}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    This defines the tone and style of generated content.
                  </p>
                </div>

                {/* Gemini API Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gemini API Key</label>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Enter your Gemini API key..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Required for AI content generation. Get your key from{' '}
                    <a
                      href="https://makersuite.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Google AI Studio
                    </a>
                  </p>
                </div>

                {/* Webhook URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Make.com Webhook URL</label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hook.make.com/your-webhook..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Webhook URL for sending completed content to Make.com scenarios.
                  </p>
                </div>

                {/* Firebase Status */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">Firebase Connection</h4>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${db ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <span className="text-sm text-gray-600">
                      {db ? 'Connected to Firestore' : 'Demo Mode (No Firebase)'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Configure Firebase via environment variables for persistent job storage and multi-worker support.
                  </p>
                </div>
              </div>
            </div>

            {/* API Documentation */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                  { step: '1', name: 'Draft', desc: 'Generate initial content', icon: '📝' },
                  { step: '2', name: 'Optimize', desc: 'Enhance with AI', icon: '✨' },
                  { step: '3', name: 'Image', desc: 'Create visuals', icon: '🎨' },
                  { step: '4', name: 'Webhook', desc: 'Send to Make.com', icon: '🔗' },
                  { step: '5', name: 'Publish', desc: 'Complete job', icon: '🚀' },
                ].map((item) => (
                  <div key={item.step} className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <p className="font-medium text-gray-800">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-blue-100 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">© 2024 BrutusAI Pilot. All rights reserved.</p>
            <p className="text-sm text-gray-500">
              Worker ID: <span className="font-mono text-xs">{WORKER_ID}</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
