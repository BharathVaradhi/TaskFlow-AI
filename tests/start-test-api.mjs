import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { getSafeTestDatabase } from "./safety.mjs";

const database = getSafeTestDatabase();
if (!database) throw new Error("Refusing to start test API without an explicitly verified disposable database.");
const port = Number(process.env.TASKFLOW_TEST_API_PORT || 5000);
const env = {
  ...process.env,
  NODE_ENV: "test",
  PORT: String(port),
  MONGODB_URI: database.uri,
  JWT_SECRET: process.env.TASKFLOW_TEST_JWT_SECRET || ("local-test-" + crypto.randomUUID()),
  CLIENT_URL: "http://127.0.0.1:" + (process.env.TASKFLOW_TEST_WEB_PORT || 5173),
  DOTENV_CONFIG_PATH: fileURLToPath(new URL("./empty.env", import.meta.url)),
};
if (process.env.TASKFLOW_ENABLE_AI_TESTS !== "true") {
  delete env.GROQ_API_KEY;
  delete env.GEMINI_API_KEY;
}
delete env.TASKFLOW_TEST_MONGODB_URI;
const child = spawn(process.execPath, ["src/server.js"], {
  cwd: new URL("../server/", import.meta.url),
  env,
  stdio: ["ignore", "inherit", "inherit"],
});
let stopped = false;
const stop = () => { if (!stopped) { stopped = true; child.kill("SIGTERM"); } };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
const deadline = Date.now() + 45000;
while (Date.now() < deadline) {
  if (child.exitCode !== null) throw new Error("Test API exited before readiness.");
  try {
    const response = await fetch("http://127.0.0.1:" + port + "/api/health");
    const body = await response.json();
    if (response.ok && body.database === "connected") {
      console.log("Disposable test API ready; database connection verified.");
      await new Promise((resolve) => child.once("exit", resolve));
      break;
    }
    if (response.ok && body.database && body.database !== "connected") {
      stop();
      throw new Error("Test API database is not connected. Tests will not run.");
    }
  } catch (error) {
    if (error.message.includes("Tests will not run")) throw error;
  }
  await delay(400);
}
if (!stopped && Date.now() >= deadline) {
  stop();
  throw new Error("Timed out waiting for the test API to connect to the disposable database.");
}
