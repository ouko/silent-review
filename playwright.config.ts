import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  timeout: 90000,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    // The dev-lan stack serves HTTPS with a local-CA cert; tolerate it while
    // remaining compatible with plain HTTP servers.
    ignoreHTTPSErrors: true,
    trace: "on",
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "iPhone Safari",
      use: { ...devices["iPhone 14"] },
    },
  ],
});
