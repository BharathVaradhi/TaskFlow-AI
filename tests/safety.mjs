import { URL } from "node:url";

export function getSafeTestDatabase(env = process.env) {
  const uri = env.TASKFLOW_TEST_MONGODB_URI;
  const name = env.TASKFLOW_TEST_DATABASE_NAME;
  const consent = env.TASKFLOW_ALLOW_TEST_DATA;
  if (!uri && !name && !consent) return null;
  if (!uri || !name || consent !== "I_UNDERSTAND_TEST_DB_ONLY") {
    throw new Error("Data tests require the test URI, test database name, and explicit disposable-data opt-in.");
  }
  let parsed;
  try { parsed = new URL(uri); } catch { throw new Error("Test Mongo URL is invalid."); }
  if (!["mongodb:", "mongodb+srv:"].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error("Test database URL must use MongoDB.");
  }
  const actual = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!actual || actual !== name || !/(^|[-_])test($|[-_])/i.test(name)) {
    throw new Error("Test database name must match the URL and contain a distinct test segment (for example taskflow_qa_test).");
  }
  return { uri, name };
}

export const testDb = getSafeTestDatabase();
export const testDataEnabled = Boolean(testDb);
