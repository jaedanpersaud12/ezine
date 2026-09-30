import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// The same env files `next dev` reads, so tests see the local DATABASE_URL and the Clerk keys.
loadEnvConfig(process.cwd(), true);

const PORT = Number(process.env.PORT ?? 3217);

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global.setup.ts",
  // Feel tests replay paced, hand-speed drags, so they run slower than typical e2e.
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `bun run dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
