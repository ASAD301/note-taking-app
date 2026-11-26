"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { ui } from "@/lib/ui";

type Mode = "login" | "signup";

export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const router = useRouter();
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();

    if (isSignup && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setPending(true);
    try {
      const res = isSignup
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });
      if (res.error) {
        if (!isSignup)
          setError("Invalid email or password."); // AUTH-03: one generic message
        else if (res.error.status === 429) setError("Too many attempts. Please wait a minute and try again.");
        else setError(res.error.message ?? "Could not create the account.");
        setPending(false);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Something went wrong. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4" noValidate={false}>
      {isSignup && (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-name`} className="font-medium">
            Name
          </label>
          <input id={`${id}-name`} name="name" type="text" required autoComplete="name" className={ui.input} />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-email`} className="font-medium">
          Email
        </label>
        <input id={`${id}-email`} name="email" type="email" required autoComplete="email" className={ui.input} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-password`} className="font-medium">
          Password
        </label>
        <input
          id={`${id}-password`}
          name="password"
          type="password"
          required
          minLength={isSignup ? 8 : undefined}
          autoComplete={isSignup ? "new-password" : "current-password"}
          aria-describedby={isSignup ? `${id}-password-hint` : undefined}
          className={ui.input}
        />
        {isSignup && (
          <p id={`${id}-password-hint`} className="text-sm text-neutral-600 dark:text-neutral-400">
            At least 8 characters.
          </p>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className={ui.primaryButton}>
        {pending ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
      </button>

      <p className="text-sm">
        {isSignup ? "Already have an account? " : "No account yet? "}
        <Link
          href={`${isSignup ? "/login" : "/signup"}${next !== "/notes" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className={ui.link}
        >
          {isSignup ? "Sign in" : "Create one"}
        </Link>
      </p>
    </form>
  );
}
