import test from "node:test";
import assert from "node:assert/strict";
import { formatTeamTaskMetrics } from "../src/teamMetrics.js";

test("team task metrics", async (t) => {
  await t.test("returns stable zeros for a person with no assigned tasks", () => {
    assert.deepEqual(formatTeamTaskMetrics(), {
      tasks: 0,
      done: 0,
      active: 0,
      overdue: 0,
      completionRate: 0,
    });
  });

  await t.test("computes completion rate from assigned and completed task counts", () => {
    assert.deepEqual(formatTeamTaskMetrics({ total: 5, done: 2, active: 3, overdue: 1 }), {
      tasks: 5,
      done: 2,
      active: 3,
      overdue: 1,
      completionRate: 40,
    });
  });
});
