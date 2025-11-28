// src/services/api.ts
// Typed wrappers for Cloud Functions calls. These wrappers centralize
// error handling and make the client code easier to reason about.

import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import type { Script, RenderJob, DistributionPayload, Project } from "../types";

export class AppError extends Error {
  public code?: string | number;
  constructor(message: string, code?: string | number) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

// Ask backend to generate a viral script for a project. Returns the Script object.
export async function generateViralScript(projectId: string, promptText: string): Promise<Script> {
  try {
    const fn = httpsCallable(functions, "generateViralScript");
    const res = await fn({ projectId, promptText });
    if (res?.data?.errorCode) {
      const code = res.data.errorCode;
      const msg = res.data.message || "Server error";
      throw new AppError(msg, code);
    }
    return res.data as Script;
  } catch (err: any) {
    // Map known Firebase/cloud-function errors to AppError with generic messaging
    if (err?.code === "resource-exhausted" || err?.message?.includes("429")) {
      throw new AppError("Rate limit reached. Bitte später erneut versuchen.", 429);
    }
    if (err?.message?.includes("500") || err?.code === "internal") {
      throw new AppError("Serverseitiger Fehler. Versuche es erneut.", 500);
    }
    throw new AppError(err.message || "Unbekannter Fehler");
  }
}

// Kick off a render job (dispatchRenderJob). Returns the created RenderJob doc.
export async function dispatchRenderJob(projectId: string, scriptId: string): Promise<RenderJob> {
  try {
    const fn = httpsCallable(functions, "dispatchRenderJob");
    const res = await fn({ projectId, scriptId });
    if (res?.data?.errorCode) {
      throw new AppError(res.data.message || "Render dispatch failed", res.data.errorCode);
    }
    return res.data as RenderJob;
  } catch (err: any) {
    if (err?.message?.includes("429")) throw new AppError("Rate limit erreicht", 429);
    throw new AppError(err.message || "Dispatch failed");
  }
}

// Send distribution request to Make.com via a Cloud Function proxy
export async function startDistribution(payload: DistributionPayload): Promise<{ ok: boolean }> {
  try {
    const fn = httpsCallable(functions, "startDistribution");
    const res = await fn(payload);
    if (res?.data?.error) {
      throw new AppError(res.data.message || "Distribution failed", res.data.code);
    }
    return res.data as { ok: boolean };
  } catch (err: any) {
    if (err?.message?.includes("429")) throw new AppError("Rate limit erreicht", 429);
    throw new AppError(err.message || "Distribution failed");
  }
}

// Convenience: get render status by id (reads a renders doc)
export async function getRenderStatus(renderId: string): Promise<RenderJob> {
  try {
    const fn = httpsCallable(functions, "getRenderStatus");
    const res = await fn({ renderId });
    // cloud functions may return structured payloads; guard access safely
    if (res?.data && (res.data as any).error) throw new AppError(((res.data as any).message) || "Fehler beim Abrufen des Render-Status");
    return res.data as RenderJob;
  } catch (err: any) {
    throw new AppError(err.message || "Status-Abfrage fehlgeschlagen");
  }
}

// Convenience: list projects for user
export async function listProjects(userId: string): Promise<Project[]> {
  try {
    const fn = httpsCallable(functions, "listProjects");
    const res = await fn({ userId });
    return res.data as Project[];
  } catch (err: any) {
    throw new AppError(err.message || "Projekte konnten nicht geladen werden");
  }
}
