// src/hooks/useJobPolling.ts
// Custom polling hook that uses useRef to avoid stale closures.

import { useEffect, useRef, useState, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { RenderJob } from "../types";

export function useJobPolling(renderId: string | null, interval = 3000) {
  const savedCallback = useRef<() => void | null | undefined>(null);
  const timerRef = useRef<number | null>(null);
  const [data, setData] = useState<RenderJob | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<any>(null);
  const stoppedRef = useRef(false);

  const stopPolling = useCallback(() => {
    stoppedRef.current = true;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Actual callback that polls the Firestore doc.
  const poll = useCallback(async () => {
    if (!renderId) return;
    try {
      const ref = doc(db, "renders", renderId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setError(new Error("Render job not found"));
        stopPolling();
        return;
      }
      const payload = snap.data() as any as RenderJob;
      setData(payload);
      setStatus(payload.status);
      if (payload.status === "completed" || payload.status === "failed" || payload.status === "cancelled") {
        stopPolling();
      }
    } catch (err) {
      setError(err);
      // For transient errors we could retry; for now we stop after error.
      stopPolling();
    }
  }, [renderId, stopPolling]);

  useEffect(() => {
    // keep latest callback in ref (avoid stale closure)
    savedCallback.current = () => { void poll(); };
  }, [poll]);

  useEffect(() => {
    stoppedRef.current = false;
    if (!renderId) return stopPolling();

    // run immediately once
    void poll();

    // then set interval
    timerRef.current = window.setInterval(() => {
      if (savedCallback.current && !stoppedRef.current) {
        try { savedCallback.current(); } catch (e) { /* ignore */ }
      }
    }, interval);

    return () => {
      stopPolling();
    };
  }, [renderId, interval, poll, stopPolling]);

  return { status, data, error, stopPolling };
}
