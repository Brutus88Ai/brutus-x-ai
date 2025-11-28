// functions/src/index.ts
// Cloud Functions stubs for Viral Video Planner
// NOTE: This file is intended as a starting point. Do NOT check in real secrets.

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

admin.initializeApp();
const db = admin.firestore();

// generateViralScript: calls an LLM (OpenAI) on the server side to generate a JSON script
export const generateViralScript = functions.https.onCall(async (data, context) => {
  const { projectId, promptText } = data || {};
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Not authenticated");
  if (!projectId || !promptText) throw new functions.https.HttpsError("invalid-argument", "Missing parameters");

  // Example pseudo logic: call OpenAI/LLM using Secret from environment
  // const OPENAI_KEY = process.env.OPENAI_KEY; // set via Secret Manager in production
  // call LLM -> validate JSON -> store Script into projects/{projectId}/scripts

  return { /* mocked Script for dev */ };
});

// dispatchRenderJob: creates a render job doc and uses a transaction to lock
export const dispatchRenderJob = functions.https.onCall(async (data, context) => {
  const { projectId, scriptId } = data || {};
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Not authenticated");
  if (!projectId || !scriptId) throw new functions.https.HttpsError("invalid-argument", "Missing parameters");

  const rendersRef = db.collection("renders");
  const jobDocRef = rendersRef.doc();
  const jobId = jobDocRef.id;
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket();

// Utility: simple JSON validator for the script structure expected by the frontend
function validateScriptStructure(obj: any) {
  if (!obj || !obj.id || !Array.isArray(obj.scenes)) return false;
  // further validations can be added
  return true;
}

// generateViralScript: calls an LLM (OpenAI or other) on the server side to generate a JSON script.
// If no OPENAI_API_KEY is configured, this function returns a safe mocked script for development.
export const generateViralScript = functions.https.onCall(async (data, context) => {
  const { projectId, promptText } = data || {};
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Not authenticated");
  if (!projectId || !promptText) throw new functions.https.HttpsError("invalid-argument", "Missing parameters");

  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  // System prompt guiding the LLM to produce strict JSON following the Scene schema
  const systemPrompt = `You are a Viral Content Strategist. Produce a JSON object with the following shape: { id: string, title: string, scenes: [{ id, visualPrompt, audioScript, duration, type }] }. Scene types must be 'hook','body' or 'cta'. Total duration must be <= 60 seconds. Return ONLY valid JSON.`;

  try {
    if (OPENAI_KEY) {
      // Call OpenAI-compatible endpoint (developer must set OPENAI_API_KEY in Secret Manager)
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: promptText }
          ],
          max_tokens: 1200,
        }),
      });

      const json = await openaiRes.json();
      const raw = json?.choices?.[0]?.message?.content || json?.choices?.[0]?.text;
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        throw new functions.https.HttpsError("internal", "LLM did not return valid JSON");
      }

      if (!validateScriptStructure(parsed)) throw new functions.https.HttpsError("internal", "Invalid script format from LLM");

      // Persist script into Firestore under projects/{projectId}/scripts/{scriptId}
      const scriptRef = db.collection("projects").doc(projectId).collection("scripts").doc(parsed.id);
      await scriptRef.set({ ...parsed, createdAt: admin.firestore.FieldValue.serverTimestamp() });

      return parsed;
    }

    // Fallback mock script for local/dev usage
    const mock = {
      id: `script_${Date.now()}`,
      title: `Mock Script for: ${promptText.substring(0, 40)}`,
      scenes: [
        { id: "s1", visualPrompt: `${promptText} dramatic hook`, audioScript: "Hook: What if...", duration: 3, type: "hook" },
        { id: "s2", visualPrompt: `${promptText} body`, audioScript: "Body: Step 1, Step 2", duration: 40, type: "body" },
        { id: "s3", visualPrompt: `${promptText} cta`, audioScript: "CTA: Follow for more", duration: 5, type: "cta" }
      ],
    };

    const scriptRef = db.collection("projects").doc(projectId).collection("scripts").doc(mock.id);
    await scriptRef.set({ ...mock, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return mock;
  } catch (err: any) {
    console.error("generateViralScript error", err);
    throw new functions.https.HttpsError("internal", err.message || "Script generation failed");
  }
});

// dispatchRenderJob: creates a render job doc (pending). A background worker (onCreate) will
// attempt to acquire a lock and call the Runway API to start the render. This keeps the
// client call fast and avoids long-held function executions.
export const dispatchRenderJob = functions.https.onCall(async (data, context) => {
  const { projectId, scriptId } = data || {};
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Not authenticated");
  if (!projectId || !scriptId) throw new functions.https.HttpsError("invalid-argument", "Missing parameters");

  const rendersRef = db.collection("renders");
  const jobDocRef = rendersRef.doc();
  const jobId = jobDocRef.id;

  await jobDocRef.set({
    id: jobId,
    projectId,
    scriptId,
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Return quickly; the onCreate worker will process the pending job.
  return { id: jobId, status: "pending" };
});

// Worker: onCreate trigger for renders collection. Attempts to acquire a transactional lock
// and then calls Runway API to create an async render task. The Runway taskId is stored
// in the render doc. This pattern prevents duplicate provider calls.
export const processRenderJob = functions.firestore.document("renders/{renderId}").onCreate(async (snap, context) => {
  const ref = snap.ref;
  const job = snap.data();
  if (!job) return;
  const renderId = context.params.renderId;

  try {
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      const data = fresh.data();
      if (!data) throw new Error("Job missing");
      if (data.status !== "pending") {
        // already processed by another worker
        return;
      }
      // atomically set to processing and claim worker id
      tx.update(ref, { status: "processing", workerId: `worker_${process.pid}`, lockedAt: admin.firestore.FieldValue.serverTimestamp() });
    });

    // Load script to build Runway payload
    const scriptSnap = await db.collection("projects").doc(job.projectId).collection("scripts").doc(job.scriptId).get();
    if (!scriptSnap.exists) throw new Error("Script not found");
    const script = scriptSnap.data() as any;

    // Build a simple promptText for Runway from the concatenated scene descriptions
    const promptText = script.scenes.map((s: any) => s.visualPrompt).join(" \n").slice(0, 900);

    const RUNWAY_KEY = process.env.RUNWAY_API_KEY;
    if (!RUNWAY_KEY) {
      // mark as failed to notify developer to configure provider
      await ref.update({ status: "failed", errorMessage: "RUNWAY_API_KEY not configured" });
      return;
    }

    const payload = {
      promptText,
      ratio: "720:1280",
      duration: 10,
      model: "gen4_turbo"
    };

    // Start Runway render task (provider specifics may vary)
    const runwayRes = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RUNWAY_KEY}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06"
      },
      body: JSON.stringify(payload)
    });

    if (!runwayRes.ok) {
      const text = await runwayRes.text();
      await ref.update({ status: "failed", errorMessage: `Runway start failed: ${text}` });
      return;
    }

    const runwayJson = await runwayRes.json();
    const runwayTaskId = runwayJson?.id || runwayJson?.taskId || runwayJson?.runId || null;

    if (!runwayTaskId) {
      await ref.update({ status: "failed", errorMessage: "Runway did not return a task id" });
      return;
    }

    await ref.update({ runwayTaskId, status: "processing", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  } catch (err: any) {
    console.error("processRenderJob error", err);
    try { await ref.update({ status: "failed", errorMessage: err.message }); } catch (e) { /* ignore */ }
  }
});

// getRenderStatus: simple callable to fetch render doc by id
export const getRenderStatus = functions.https.onCall(async (data, context) => {
  const { renderId } = data || {};
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Not authenticated");
  if (!renderId) throw new functions.https.HttpsError("invalid-argument", "Missing renderId");

  const ref = db.collection("renders").doc(renderId);
  const snap = await ref.get();
  if (!snap.exists) throw new functions.https.HttpsError("not-found", "Render job not found");
  return snap.data();
});

// listProjects: returns projects belonging to the authenticated user or all projects if admin.
export const listProjects = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Not authenticated");
  const uid = context.auth.uid;
  const isAdmin = context.auth.token?.admin === true;

  try {
    let q;
    if (isAdmin) {
      q = db.collection("projects").limit(100);
    } else {
      // naive approach: projects have an ownerId field if created via the app
      q = db.collection("projects").where("ownerId", "==", uid).limit(100);
    }
    const snaps = await q.get();
    const items = snaps.docs.map((d) => ({ id: d.id, ...d.data() }));
    return items;
  } catch (err: any) {
    console.error("listProjects error", err);
    throw new functions.https.HttpsError("internal", "Could not list projects");
  }
});

// handleRunwayWebhook: webhook endpoint to be called by Runway when job completes
// Expected payload (provider dependent): { taskId, status: 'completed'|'failed', downloadUrl }
export const handleRunwayWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const body = req.body || {};
    const runwayTaskId = body?.taskId || body?.id;
    const status = body?.status;
    const downloadUrl = body?.downloadUrl || body?.resultUrl || body?.download_url;

    if (!runwayTaskId) return res.status(400).send("missing taskId");

    const q = await db.collection("renders").where("runwayTaskId", "==", runwayTaskId).limit(1).get();
    if (q.empty) return res.status(404).send("render not found");

    const doc = q.docs[0];
    const ref = doc.ref;

    if (status === "completed") {
      // download the file from the provider and upload to Firebase Storage
      if (!downloadUrl) {
        await ref.update({ status: "failed", errorMessage: "No download URL in webhook" });
        return res.status(400).send("no download url");
      }

      const resp = await fetch(downloadUrl);
      if (!resp.ok) {
        await ref.update({ status: "failed", errorMessage: `Failed to download from provider: ${resp.status}` });
        return res.status(500).send("download failed");
      }

      const buffer = await resp.buffer();
      const filename = `renders/${doc.id}/${Date.now()}.mp4`;
      const file = bucket.file(filename);
      await file.save(buffer, { contentType: 'video/mp4' });
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

      await ref.update({ status: "completed", videoUrl: publicUrl, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return res.status(200).send("ok");
    } else if (status === "failed") {
      await ref.update({ status: "failed", errorMessage: body?.error || "Runway failed", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return res.status(200).send("acknowledged");
    }

    return res.status(200).send("ignored");
  } catch (err) {
    console.error(err);
    return res.status(500).send("server error");
  }
});
