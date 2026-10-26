import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const report = resolve(import.meta.dirname, "../test-results/report.html");
if (!existsSync(report)) {
  console.error("No report found. Run npm test first.");
  process.exit(1);
}
if (process.platform === "win32") spawn("cmd.exe", ["/c", "start", "", report], { detached: true, stdio: "ignore" }).unref();
else if (process.platform === "darwin") spawn("open", [report], { detached: true, stdio: "ignore" }).unref();
else spawn("xdg-open", [report], { detached: true, stdio: "ignore" }).unref();
