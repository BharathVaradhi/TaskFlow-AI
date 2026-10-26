import test from "node:test";
import assert from "node:assert/strict";
import { getSafeTestDatabase } from "../../tests/safety.mjs";

const uri = "mongodb+srv://qa:private@cluster.example/taskflow_qa_test";
const base = {
  TASKFLOW_TEST_MONGODB_URI: uri,
  TASKFLOW_TEST_DATABASE_NAME: "taskflow_qa_test",
  TASKFLOW_ALLOW_TEST_DATA: "I_UNDERSTAND_TEST_DB_ONLY",
};

test("disposable test database safety gate", async (t) => {
  await t.test("does not enable data tests when no explicit configuration is present", () => {
    assert.equal(getSafeTestDatabase({}), null);
  });

  await t.test("accepts a matching, explicitly opted-in test database", () => {
    assert.equal(getSafeTestDatabase(base).name, "taskflow_qa_test");
  });

  await t.test("rejects partial configuration", () => {
    assert.throws(() => getSafeTestDatabase({ TASKFLOW_TEST_MONGODB_URI: uri }), /require/);
  });

  await t.test("rejects a production-looking database name", () => {
    assert.throws(() => getSafeTestDatabase({
      ...base,
      TASKFLOW_TEST_DATABASE_NAME: "taskflow",
      TASKFLOW_TEST_MONGODB_URI: "mongodb+srv://qa:private@cluster.example/taskflow",
    }), /distinct test segment/);
  });

  await t.test("rejects a name that differs from the URL database", () => {
    assert.throws(() => getSafeTestDatabase({
      ...base,
      TASKFLOW_TEST_DATABASE_NAME: "other_test",
    }), /must match/);
  });

  await t.test("never includes connection details in validation errors", () => {
    assert.throws(
      () => getSafeTestDatabase({ ...base, TASKFLOW_TEST_DATABASE_NAME: "taskflow" }),
      (error) => !error.message.includes("private") && !error.message.includes("cluster.example")
    );
  });
});
