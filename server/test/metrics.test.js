import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Dashboard & Task Tracking Metrics Calculations", () => {
  const now = new Date("2026-10-22T12:00:00Z");

  const sampleTasks = [
    { _id: "1", status: "Todo", dueDate: new Date("2026-10-25T12:00:00Z") },
    { _id: "2", status: "In Progress", dueDate: new Date("2026-10-20T12:00:00Z") }, // overdue!
    { _id: "3", status: "Review", dueDate: null },
    { _id: "4", status: "Completed", dueDate: new Date("2026-10-18T12:00:00Z"), updatedAt: new Date("2026-10-21T10:00:00Z") },
    { _id: "5", status: "Completed", dueDate: new Date("2026-10-15T12:00:00Z"), updatedAt: new Date("2026-10-22T09:00:00Z") },
  ];

  test("calculates mutually consistent lifecycle metrics", () => {
    const totalTasks = sampleTasks.length;
    const completedTasks = sampleTasks.filter((t) => t.status === "Completed").length;
    const pendingTasks = totalTasks - completedTasks;
    const inProgressTasks = sampleTasks.filter((t) => t.status === "In Progress").length;

    assert.equal(totalTasks, 5);
    assert.equal(completedTasks, 2);
    assert.equal(pendingTasks, 3);
    assert.equal(inProgressTasks, 1);
    assert.equal(pendingTasks + completedTasks, totalTasks);
  });

  test("correctly identifies overdue tasks and ignores completed overdue tasks", () => {
    const overdueTasks = sampleTasks.filter(
      (t) => t.status !== "Completed" && t.dueDate && new Date(t.dueDate) < now
    );

    assert.equal(overdueTasks.length, 1);
    assert.equal(overdueTasks[0]._id, "2");
  });

  test("calculates accurate health score based on completed tasks", () => {
    const total = sampleTasks.length;
    const completed = sampleTasks.filter((t) => t.status === "Completed").length;
    const healthScore = Math.round((completed / total) * 100);

    assert.equal(healthScore, 40); // 2 / 5 = 40%
  });

  test("handles empty tasks list gracefully without NaN", () => {
    const emptyTasks = [];
    const total = emptyTasks.length;
    const completed = 0;
    const healthScore = total > 0 ? Math.round((completed / total) * 100) : 0;

    assert.equal(healthScore, 0);
    assert.ok(!Number.isNaN(healthScore));
  });

  test("groups productivity by day of week over the last 7 days", () => {
    const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const productivity = weekdayNames.map((day) => ({ name: day, value: 0 }));

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentCompleted = sampleTasks.filter(
      (t) => t.status === "Completed" && t.updatedAt && new Date(t.updatedAt) >= sevenDaysAgo
    );

    recentCompleted.forEach((t) => {
      const dayIndex = new Date(t.updatedAt).getDay();
      const dayName = weekdayNames[dayIndex];
      const dayObj = productivity.find((d) => d.name === dayName);
      if (dayObj) dayObj.value += 1;
    });

    const totalRecorded = productivity.reduce((acc, curr) => acc + curr.value, 0);
    assert.equal(totalRecorded, 2);
  });
});
