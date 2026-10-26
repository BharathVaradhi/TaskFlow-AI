import { test, expect } from "@playwright/test";

const frontend = (process.env.TASKFLOW_PRODUCTION_FRONTEND || "https://task-flow-ai-beta.vercel.app").replace(/\/$/, "");
const api = (process.env.TASKFLOW_PRODUCTION_API || "https://taskflow-ai-backend-1km2.onrender.com/api").replace(/\/$/, "");

test("production frontend and compiled assets respond", async ({ request }) => {
  const started = Date.now();
  const response = await request.get(frontend);
  expect(response.status(), "frontend HTTP " + response.status() + " in " + (Date.now() - started) + "ms").toBe(200);
  const html = await response.text();
  expect(html).toContain('<div id="root">');
  const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) => m[1]);
  expect(assets.length).toBeGreaterThan(0);
  for (const asset of assets) {
    const loaded = await request.get(new URL(asset, frontend + "/").toString());
    expect(loaded.status(), asset + " returned " + loaded.status()).toBe(200);
  }
});

test("production API health reports a service identity", async ({ request }) => {
  const started = Date.now();
  const response = await request.get(api + "/health");
  expect(response.status(), "health HTTP " + response.status() + " in " + (Date.now() - started) + "ms").toBe(200);
  const body = await response.json();
  expect(body.status).toBe("ok");
  expect(body.service).toBeTruthy();
});

for (const route of ["/auth/me", "/projects", "/tasks", "/dashboard", "/notifications"]) {
  test("production " + route + " rejects anonymous access", async ({ request }) => {
    const started = Date.now();
    const response = await request.get(api + route);
    expect(response.status(), route + " HTTP " + response.status() + " in " + (Date.now() - started) + "ms").toBe(401);
  });
}
