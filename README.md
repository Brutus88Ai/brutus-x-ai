
# Brutus X AI — Viral Video Planner

This repository contains the frontend (React + Vite + Tailwind) and Firebase Cloud Functions for the Viral Video Planner app.

Important: This project uses Firebase Cloud Functions as a BFF — provider API keys (Runway/OpenAI) must be stored server-side (Secrets / Functions config). Do NOT put secrets in `VITE_` env vars.

## Files Added
- `src/types/index.ts` — Type definitions for Scripts, Scenes, Renders, etc.
- `src/lib/firebase.ts` — Firebase v9 modular initialization (client-side config via `VITE_` vars).
- `src/services/api.ts` — wrappers for Cloud Functions.
- `src/hooks/useJobPolling.ts` — polling hook for render job state.
- `src/components/CreateProject.jsx` — UI to create projects.
- `src/pages/Dashboard.jsx` — Dashboard UI to generate scripts and dispatch renders.
- `src/components/VisualEditor.jsx` — Scene editor with Pollinations previews.
- `functions/src/index.ts` — Cloud Functions: generateViralScript, dispatchRenderJob, processRenderJob (onCreate), getRenderStatus, listProjects, handleRunwayWebhook.

## Environment (frontend)
Create a `.env` (Vite) with your Firebase app metadata (these are *not* secrets; they are public config values):

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Secrets / Cloud Functions (server-side)
Set provider keys using Google Secret Manager or Firebase functions config. Example (CLI):

PowerShell example to set functions config (not secret manager):

```powershell
firebase functions:config:set openai.key="YOUR_OPENAI_KEY" runway.key="YOUR_RUNWAY_KEY"
```

Then in `functions` code you can access `process.env.OPENAI_API_KEY` or `functions.config().openai.key` depending on setup. Prefer Secret Manager for production.

## Deploy Cloud Functions (recommended steps)
1. Install dependencies in `functions/`:

```powershell
cd functions
npm install
```

2. Build/deploy functions:

```powershell
# from repo root
firebase deploy --only functions
```

Note: Make sure your `firebase` CLI is authenticated (`firebase login`) and you have selected the correct project (`firebase use <projectId>`).

## Local frontend dev
Install dependencies and run dev server:

```powershell
npm install
npm run dev
```

Build for production:

```powershell
npm run build
npm run preview
```

## How to test the flow (manual)
1. Create a project in the dashboard using "Neues Projekt".
2. Enter a prompt and click "Script generieren". The `generateViralScript` function will either call the configured LLM or return a safe mock script if no key is configured.
3. Review & edit scenes in the VisualEditor.
4. Click "Render starten" to create a `renders/{renderId}` document.
5. The `processRenderJob` worker will attempt to claim the job and call Runway. On completion, the `handleRunwayWebhook` will process provider webhooks and upload the final video to Firebase Storage.

## Notes & Operational Considerations
- Billing: Runway/OpenAI calls are billable — test with mock mode first.
- Use Google Secret Manager to store provider keys and bind them to Functions runtime.
- The `processRenderJob` worker demonstrates the transactional lock pattern to avoid duplicate external calls.
- If you want me to deploy the functions from this environment, confirm and ensure the Firebase CLI is authenticated here; I can run the deploy commands for you.

---
If you want, I can now:
- (A) attempt to run `npm install` in `functions/` and `firebase deploy --only functions` from this environment (requires CLI auth), or
- (B) continue adding tests or UI polish.
