import { defineConfig } from "@playwright/test";
import { testDataEnabled } from "./tests/safety.mjs";

const webPort = Number(process.env.TASKFLOW_TEST_WEB_PORT || 5173);
const apiPort = Number(process.env.TASKFLOW_TEST_API_PORT || 5000);

export default defineConfig({
  testDir: "./tests",
  testMatch: ["*.spec.js"],
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  retries: 0,
  outputDir: "test-results/artifacts",
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/playwright.json" }],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:" + webPort,
    browserName: "chromium",
    // Traces can capture bearer tokens and passwords entered in auth forms.
    // Keep them disabled unless a sanitized trace strategy is added.
    trace: "off",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "production-smoke", testMatch: "production-smoke.spec.js" },
    { name: "api", testMatch: "api.spec.js", use: { baseURL: "http://127.0.0.1:" + apiPort } },
    { name: "browser", testMatch: "app.e2e.spec.js" },
  ],
  webServer: testDataEnabled
    ? [
        {
          command: "node tests/start-test-api.mjs",
          url: "http://127.0.0.1:" + apiPort + "/api/health",
          reuseExistingServer: false,
          timeout: 60000,
        },
        {
          command: "npm run dev --prefix client -- --host 127.0.0.1 --port " + webPort,
          url: "http://127.0.0.1:" + webPort,
          reuseExistingServer: false,
          timeout: 60000,
          env: { VITE_API_URL: "" },
        },
      ]
    : undefined,
});
