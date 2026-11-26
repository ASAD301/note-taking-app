import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/lib/db/client";

export const auth = betterAuth({
  database: getDb(), // bun:sqlite — better-auth's Kysely adapter detects it natively
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8, // AUTH-02
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days (AUTH-07)
    updateAge: 60 * 60 * 24, // refresh once a day on activity
  },
  rateLimit: {
    enabled: process.env.DISABLE_RATE_LIMIT !== "1", // SEC-10 (can be disabled for e2e)
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
    },
  },
  advanced: {
    database: { joins: true },
    // SEC-08: better-auth cookies are HttpOnly + SameSite=Lax; Secure when BETTER_AUTH_URL is https.
  },
  plugins: [nextCookies()], // must stay last
});

export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];
