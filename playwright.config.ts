import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    // 앱의 PWA service worker(public/sw.js)가 activate 시 clients.claim()으로 페이지를
    // 즉시 장악해 fetch를 자체 처리한다 - page.route() 목킹이 SW 레이어를 우회해 무력화되므로 차단한다.
    serviceWorkers: "block",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
