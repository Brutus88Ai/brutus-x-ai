// src/types/index.ts
// Core TypeScript interfaces for the Viral Video Planner App

// Basic user profile stored in Firestore
export interface UserProfile {
  uid: string;
  name?: string;
  email?: string;
  photoURL?: string;
  niches?: string[];
  videosCreated?: number;
  totalViews?: number;
  isPro?: boolean;
  isMonetized?: boolean;
}

// A single Scene inside a Script. The "type" enforces Hook/Body/CTA structure.
export type SceneType = "hook" | "body" | "cta";

export interface Scene {
  id: string; // client generated UUID
  visualPrompt: string; // Text prompt for Pollinations / image preview
  audioScript: string; // Spoken/text content for the scene
  duration: number; // seconds (must sum <= 60)
  type: SceneType;
}

// Script produced by the LLM. Contains an ordered list of Scenes.
export interface Script {
  id: string;
  title: string;
  description?: string;
  scenes: Scene[];
  createdAt: string; // ISO
  updatedAt?: string; // ISO
  authorId?: string;
}

// Project groups multiple scripts and metadata
export interface Project {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
}

// Render job stored in `renders/{renderId}`
export type RenderStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface RenderJob {
  id: string;
  projectId: string;
  scriptId: string;
  status: RenderStatus;
  createdAt: string;
  updatedAt?: string;
  workerId?: string; // worker that locked and processed the job
  lockedAt?: string; // ISO timestamp
  runwayTaskId?: string; // external provider task id
  videoUrl?: string; // public Firebase Storage URL after completed
  errorMessage?: string | null;
}

// Runway payload contract (strict, per prompt)
export interface RunwayJobPayload {
  promptText?: string; // Max 1000 chars
  promptImage?: string; // public https URL or base64
  seed?: number; // 0 - 4294967295
  ratio: "720:1280"; // Strictly portrait for TikTok/Reels
  duration: 5 | 10;
  model: "gen4_turbo" | "gen3a_turbo";
}

// Distribution payload expected by Make.com webhook (stringified hashtags allowed)
export interface DistributionPayload {
  projectId: string;
  videoUrl: string; // public firebase storage URL
  caption: string;
  hashtags: string[];
  platformConfig: {
    tiktok?: boolean;
    instagram_reels?: boolean;
    youtube_shorts?: boolean;
  };
  scheduledTime?: string; // ISO-8601
}

// Example JSON schema snippet (for reference):
/*
{
  "projectId": "proj_abc123",
  "videoUrl": "https://storage.googleapis.com/bucket/path.mp4",
  "caption": "Quick growth hack for creators!",
  "hashtags": ["#Growth","#Brutus"] ,
  "platformConfig": {"tiktok": true, "instagram_reels": true},
  "scheduledTime": "2025-11-28T12:00:00Z"
}
*/
