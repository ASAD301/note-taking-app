import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Fresh database for every run (all migrations, including better-auth's tables).
  webServer: {
    command: `rm -rf .e2e && bun run migrate && bun --bun next build && bun --bun next start -p ${PORT}`,
    url: baseURL,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DATABASE_PATH: ".e2e/test.db",
      BETTER_AUTH_URL: baseURL,
      BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-0123456789",
      DISABLE_RATE_LIMIT: "1",
    },
  },
});
