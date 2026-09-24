import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "auth.spec.ts",
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:5207",
    browserName: "chromium",
    channel: "msedge",
    headless: true,
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 5207",
    url: "http://127.0.0.1:5207",
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: "https://workout-auth-test.invalid",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-public-key-not-a-credential",
    },
  },
});
