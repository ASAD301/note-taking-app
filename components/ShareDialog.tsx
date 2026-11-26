"use client";

import { useId, useRef, useState } from "react";
import { shareNote, unshareNote } from "@/app/notes/actions";
import { ui } from "@/lib/ui";

export function ShareDialog({ noteId, initialSlug }: { noteId: string; initialSlug: string | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const linkId = useId();
  const [url, setUrl] = useState<string | null>(null);
  const [isShared, setIsShared] = useState(initialSlug !== null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shownUrl =
    url ?? (initialSlug && typeof window !== "undefined" ? `${window.location.origin}/share/${initialSlug}` : null);

  async function turnOn() {
    setPending(true);
    setError(null);
    try {
      const res = await shareNote(noteId);
      if (res.ok) {
        setUrl(res.url);
        setIsShared(true);
      } else setError(res.error);
    } catch {
      setError("Could not turn sharing on. Check your connection.");
    }
    setPending(false);
  }

  async function turnOff() {
    setPending(true);
    setError(null);
    try {
      const res = await unshareNote(noteId);
      if (res.ok) {
        setUrl(null);
        setIsShared(false);
      } else setError(res.error);
    } catch {
      setError("Could not stop sharing. Check your connection.");
    }
    setPending(false);
  }

  async function copy() {
    if (!shownUrl) return;
    try {
      await navigator.clipboard.writeText(shownUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed — select the link and copy it manually.");
    }
  }

  return (
    <>
      <button type="button" className={ui.secondaryButton} onClick={() => dialogRef.current?.showModal()}>
        {isShared ? "Shared" : "Share"}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg bg-background p-6 text-foreground shadow-xl backdrop:bg-black/50"
      >
        <h2 id={titleId} className="mb-2 text-lg font-bold">
          Share note
        </h2>
        {isShared ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Anyone with this link can read this note. Turning sharing off breaks the link immediately.
            </p>
            <label htmlFor={linkId} className="text-sm font-medium">
              Public link
            </label>
            <div className="flex gap-2">
              <input
                id={linkId}
                readOnly
                value={shownUrl ?? ""}
                className={ui.input}
                onFocus={(e) => e.target.select()}
              />
              <button type="button" onClick={copy} className={ui.secondaryButton}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button type="button" onClick={turnOff} disabled={pending} className={`${ui.dangerButton} self-start`}>
              Stop sharing
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Create a public, read-only link to this note. You can turn it off at any time.
            </p>
            <button type="button" onClick={turnOn} disabled={pending} className={`${ui.primaryButton} self-start`}>
              Create public link
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        <form method="dialog" className="mt-4 flex justify-end">
          <button className={ui.secondaryButton}>Close</button>
        </form>
      </dialog>
    </>
  );
}
