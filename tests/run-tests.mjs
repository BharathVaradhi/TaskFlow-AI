import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const resultsDir = resolve(root, "test-results");
await mkdir(resultsDir, { recursive: true });

const commands = [
  {
    name: "Backend unit tests",
    args: ["--test", "--test-reporter=tap", "--test-reporter-destination=../test-results/unit.tap", "test/**/*.test.js"],
    cwd: resolve(root, "server"),
  },
  {
    name: "Production smoke, isolated API, and browser tests",
    args: [resolve(root, "node_modules/@playwright/test/cli.js"), "test"],
    cwd: root,
  },
];

const outcomes = [];
for (const command of commands) {
  console.log("\n=== " + command.name + " ===");
  const run = spawnSync(process.execPath, command.args, {
    cwd: command.cwd,
    env: process.env,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  outcomes.push({
    name: command.name,
    status: run.error ? "FAIL" : run.status === 0 ? "PASS" : "FAIL",
    exitCode: run.status,
    failure: run.error?.message || null,
    output: run.stdout || "",
  });
}

let unit = null;
let playwright = null;
let unitCases = [];
try {
  const tap = await readFile(resolve(resultsDir, "unit.tap"), "utf8");
  unitCases = tap.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*(ok|not ok)\s+\d+\s+-\s+(.+)$/);
    return match ? [{ feature: "Backend unit", name: match[2], status: match[1] === "ok" ? "PASS" : "FAIL" }] : [];
  });
  unit = {
    passed: Number(tap.match(/^# pass (\d+)/m)?.[1] || 0),
    failed: Number(tap.match(/^# fail (\d+)/m)?.[1] || 0),
    output: tap,
  };
} catch {}
try { playwright = JSON.parse(await readFile(resolve(resultsDir, "playwright.json"), "utf8")); } catch {}
const browserCases = [];
const visitSuites = (suites, parents = []) => {
  for (const suite of suites || []) {
    const path = [...parents, suite.title].filter(Boolean);
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const result = test.results?.at(-1);
        const state = result?.status || test.status;
        browserCases.push({
          feature: path.join(" / "),
          name: spec.title,
          status: state === "passed" ? "PASS" : state === "skipped" ? "SKIPPED" : "FAIL",
          reason: result?.errors?.map((error) => error.message).filter(Boolean).join("\n")
            || test.annotations?.map((annotation) => annotation.description).filter(Boolean).join("\n")
            || "",
        });
      }
    }
    visitSuites(suite.suites, path);
  }
};
visitSuites(playwright?.suites);
const summary = {
  generatedAt: new Date().toISOString(),
  outcomes,
  testCases: [...unitCases, ...browserCases],
  reports: { html: "report.html", playwrightHtml: "../playwright-report/index.html", playwrightJson: "playwright.json", unitTap: "unit.tap" },
  unit,
  playwright,
};
await writeFile(resolve(resultsDir, "results.json"), JSON.stringify(summary, null, 2));
const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const rows = outcomes.map((item) => "<tr><td>" + escape(item.name) + "</td><td class='" + item.status.toLowerCase() + "'>" + item.status + "</td><td>" + escape(item.failure || ("exit " + item.exitCode)) + "</td></tr>").join("");
const caseRows = summary.testCases.map((item) => "<tr><td>" + escape(item.feature) + "</td><td>" + escape(item.name) + "</td><td class='" + item.status.toLowerCase() + "'>" + item.status + "</td><td><pre>" + escape(item.reason || "") + "</pre></td></tr>").join("");
const html = "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><title>TaskFlow test summary</title><style>body{font:16px system-ui;max-width:1100px;margin:3rem auto;padding:0 1rem;color:#20242c}table{border-collapse:collapse;width:100%;margin-bottom:2rem}td,th{padding:.7rem;border:1px solid #ccd0d8;text-align:left;vertical-align:top}.pass{color:#087443}.fail{color:#b42318}.skipped{color:#946200}pre{white-space:pre-wrap;max-width:500px}a{margin-right:1rem}</style><h1>TaskFlow automated test summary</h1><p>Generated " + escape(summary.generatedAt) + "</p><table><thead><tr><th>Suite</th><th>Result</th><th>Details</th></tr></thead><tbody>" + rows + "</tbody></table><h2>Test cases</h2><table><thead><tr><th>Feature</th><th>Test</th><th>Status</th><th>Failure reason</th></tr></thead><tbody>" + caseRows + "</tbody></table><h2>Detailed reports</h2><p><a href=\"../playwright-report/index.html\">Playwright HTML report</a><a href=\"results.json\">Machine-readable combined results</a><a href=\"unit.tap\">Node unit-test TAP</a><a href=\"playwright.json\">Playwright JSON</a></p><p>Skipped API/browser suites are expected when the disposable test database is not configured. Production smoke tests are read-only.</p></html>";
await writeFile(resolve(resultsDir, "report.html"), html);
if (outcomes.some((item) => item.status !== "PASS")) process.exitCode = 1;
