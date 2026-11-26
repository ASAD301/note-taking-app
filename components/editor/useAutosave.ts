"use client";

import type { JSONContent } from "@tiptap/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { updateNote } from "@/app/notes/actions";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error";
type Patch = { title?: string; content?: JSONContent };

const DEBOUNCE_MS = 1000; // NOTE-05
const RETRY_MS = 5000; // NFR-07: keep retrying in the background

/**
 * Debounced autosave. Unsaved changes live in `pending` until the server confirms them,
 * so a failed save never drops text: it is merged back and retried.
 */
export function useAutosave(noteId: string) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Patch>({});
  const inFlight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const flushRef = useRef<() => Promise<boolean>>(async () => true);

  const hasPending = () => pending.current.title !== undefined || pending.current.content !== undefined;

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    if (retryTimer.current) clearTimeout(retryTimer.current);
    timer.current = retryTimer.current = null;

    if (inFlight.current) await inFlight.current; // one save at a time
    if (!hasPending()) {
      setStatus((s) => (s === "error" ? s : "saved"));
      return true;
    }

    const snapshot = pending.current;
    pending.current = {};
    setStatus("saving");

    const run = (async () => {
      try {
        const res = await updateNote(noteId, snapshot);
        if (!res.ok) throw new Error(res.error);
        setError(null);
        return true;
      } catch (e) {
        // Put the unsaved data back; anything typed meanwhile is newer and wins.
        pending.current = { ...snapshot, ...pending.current };
        const msg = e instanceof Error && e.message && !/fetch|network|load failed/i.test(e.message) ? e.message : null;
        setError(msg);
        return false;
      }
    })();
    inFlight.current = run;
    const ok = await run;
    inFlight.current = null;

    if (!ok) {
      setStatus("error");
      if (alive.current) retryTimer.current = setTimeout(() => void flushRef.current(), RETRY_MS);
      return false;
    }
    if (hasPending()) return flushRef.current();
    setStatus("saved");
    return true;
  }, [noteId]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const queue = useCallback(
    (patch: Patch) => {
      pending.current = { ...pending.current, ...patch };
      setStatus((s) => (s === "error" ? s : "unsaved"));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
    },
    [flush],
  );

  const isDirty = useCallback(() => hasPending() || inFlight.current !== null, []);

  useEffect(() => {
    alive.current = true;
    const onOnline = () => {
      if (hasPending()) void flush();
    };
    const onHide = () => {
      if (document.visibilityState === "hidden" && hasPending()) void flush();
    };
    // NOTE-06: try to save, and warn if anything is still unsaved.
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty()) return;
      void flush();
      e.preventDefault();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      alive.current = false;
      if (hasPending()) void flush(); // save on in-app navigation
      if (timer.current) clearTimeout(timer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [flush, isDirty]);

  return { status, error, queue, flush, isDirty };
}
