import { test, expect } from "@playwright/test";
import { testDataEnabled } from "./safety.mjs";
import { cleanupRun } from "./cleanup.js";

test.describe("isolated API integration", () => {
  test.skip(!testDataEnabled, "BLOCKED: configure disposable test DB; see tests/README.md");
  test.describe.configure({ mode: "serial" });
  const created = { emails: [], userIds: [], projectIds: [], taskIds: [] };

  test.afterAll(async () => {
    if (testDataEnabled) await cleanupRun(created);
  });

  test("registration, permissions, project/task/comment CRUD, search, dashboard, persistence", async ({ request }) => {
    const run = Date.now() + "-" + crypto.randomUUID().slice(0, 8);
    const ownerEmail = "qa-owner-" + run + "@taskflow.invalid";
    const outsiderEmail = "qa-outsider-" + run + "@taskflow.invalid";
    created.emails.push(ownerEmail, outsiderEmail);
    const password = "QA-" + run + "-Password!";
    const register = async (name, email) => {
      const response = await request.post("/api/auth/register", { data: { name, email, password } });
      expect(response.status()).toBe(201);
      return response.json();
    };
    const owner = await register("QA Owner", ownerEmail);
    const outsider = await register("QA Outsider", outsiderEmail);
    created.userIds.push(owner.user._id, outsider.user._id);
    expect(owner.user.role).toBe("Team Member");
    expect(owner.user.password).toBeUndefined();
    expect((await request.post("/api/auth/register", { data: { email: "invalid" } })).status()).toBe(400);
    expect((await request.post("/api/auth/register", {
      data: { name: "Duplicate", email: ownerEmail, password },
    })).status()).toBe(409);
    expect((await request.post("/api/auth/login", {
      data: { email: ownerEmail, password: "incorrect-password" },
    })).status()).toBe(401);

    const anonymous = await request.get("/api/projects");
    expect(anonymous.status()).toBe(401);
    const invalidToken = await request.get("/api/projects", { headers: { Authorization: "Bearer invalid-token" } });
    expect(invalidToken.status()).toBe(401);
    const auth = (token) => ({ Authorization: "Bearer " + token });
    expect((await request.get("/api/auth/me", { headers: auth(owner.token) })).status()).toBe(200);
    expect((await request.patch("/api/auth/profile", {
      headers: auth(owner.token), data: { name: "QA Owner Updated" },
    })).status()).toBe(200);
    expect((await request.patch("/api/auth/preferences", {
      headers: auth(owner.token), data: { notificationsEnabled: false },
    })).status()).toBe(200);

    const projectName = "QA project " + run;
    const projectResponse = await request.post("/api/projects", {
      headers: auth(owner.token),
      data: { name: projectName, description: "Disposable automated test fixture", priority: "High" },
    });
    expect(projectResponse.status()).toBe(201);
    const project = await projectResponse.json();
    created.projectIds.push(project._id);
    expect((await request.get("/api/projects/" + project._id, { headers: auth(owner.token) })).status()).toBe(200);
    expect((await request.get("/api/projects/" + project._id, { headers: auth(outsider.token) })).status()).toBe(403);
    expect((await request.patch("/api/projects/" + project._id, {
      headers: auth(outsider.token), data: { name: "Unauthorized update" },
    })).status()).toBe(403);
    expect((await request.patch("/api/projects/not-an-object-id", {
      headers: auth(owner.token), data: { name: "Invalid id" },
    })).status()).toBe(400);
    const projectUpdate = await request.patch("/api/projects/" + project._id, {
      headers: auth(owner.token), data: { name: projectName + " updated", status: "Active" },
    });
    expect(projectUpdate.status()).toBe(200);
    expect((await projectUpdate.json()).status).toBe("Active");
    expect((await request.get("/api/projects/" + project._id, { headers: auth(owner.token) })).status()).toBe(200);
    expect((await request.get("/api/projects/" + project._id + "/activity", { headers: auth(owner.token) })).status()).toBe(200);

    expect((await request.post("/api/tasks", {
      headers: auth(owner.token), data: { title: "missing project" },
    })).status()).toBe(400);
    const taskTitle = "QA task " + run;
    const taskResponse = await request.post("/api/tasks", {
      headers: auth(owner.token), data: { title: taskTitle, description: "Test fixture", project: project._id },
    });
    expect(taskResponse.status()).toBe(201);
    const task = await taskResponse.json();
    created.taskIds.push(task._id);
    expect(task.status).toBe("Todo");

    const updated = await request.patch("/api/tasks/" + task._id, {
      headers: auth(owner.token), data: { title: taskTitle + " updated", status: "In Progress" },
    });
    expect(updated.status()).toBe(200);
    expect((await updated.json()).status).toBe("In Progress");
    expect((await request.get("/api/tasks/" + task._id, { headers: auth(owner.token) })).status()).toBe(200);
    expect((await request.get("/api/tasks/" + task._id + "/activity", { headers: auth(owner.token) })).status()).toBe(200);
    expect((await request.get("/api/tasks/not-an-object-id", { headers: auth(owner.token) })).status()).toBe(400);
    expect((await request.get("/api/tasks/" + task._id, { headers: auth(outsider.token) })).status()).toBe(403);
    const filtered = await request.get("/api/tasks?project=" + project._id + "&search=" + encodeURIComponent(run), {
      headers: auth(owner.token),
    });
    expect((await filtered.json()).some((item) => item._id === task._id)).toBe(true);

    const createdComment = await request.post("/api/tasks/" + task._id + "/comments", {
      headers: auth(owner.token), data: { content: "QA comment " + run },
    });
    expect(createdComment.status()).toBe(201);
    const comment = await createdComment.json();
    const comments = await request.get("/api/tasks/" + task._id + "/comments", { headers: auth(owner.token) });
    expect((await comments.json()).some((item) => item._id === comment._id)).toBe(true);
    expect((await request.delete("/api/comments/" + comment._id, { headers: auth(owner.token) })).status()).toBe(204);
    const bulk = await request.post("/api/tasks/bulk", {
      headers: auth(owner.token),
      data: { projectId: project._id, tasks: [{ title: "QA bulk task " + run, status: "Todo" }] },
    });
    expect(bulk.status()).toBe(201);
    const bulkTasks = await bulk.json();
    created.taskIds.push(...bulkTasks.map((item) => item._id));
    expect(bulkTasks).toHaveLength(1);
    const dashboard = await request.get("/api/dashboard", { headers: auth(owner.token) });
    expect(dashboard.status()).toBe(200);
    expect((await dashboard.json()).projects.some((item) => item._id === project._id)).toBe(true);
    const directory = await request.get("/api/users", { headers: auth(owner.token) });
    expect(directory.status()).toBe(200);
    expect((await request.get("/api/users/" + owner.user._id + "/tasks", { headers: auth(owner.token) })).status()).toBe(200);
    expect((await request.patch("/api/users/" + owner.user._id, {
      headers: auth(owner.token), data: { role: "Admin" },
    })).status()).toBe(403);
    expect((await request.get("/api/notifications", { headers: auth(owner.token) })).status()).toBe(200);
    expect((await request.post("/api/notifications/read-all", { headers: auth(owner.token) })).status()).toBe(200);
    const summary = await request.get("/api/ai/summary", { headers: auth(owner.token) });
    expect(summary.status()).toBe(200);
    expect(typeof (await summary.json()).summary).toBe("string");

    expect((await request.get("/api/projects", { headers: auth(owner.token) })).status()).toBe(200);
    expect((await request.get("/api/tasks?search=" + encodeURIComponent(run), { headers: auth(owner.token) })).status()).toBe(200);
    expect((await request.delete("/api/tasks/" + task._id, { headers: auth(owner.token) })).status()).toBe(204);
    created.taskIds = created.taskIds.filter((id) => id !== task._id);
    expect((await request.get("/api/tasks/" + task._id, { headers: auth(owner.token) })).status()).toBe(404);
    expect((await request.delete("/api/projects/" + project._id, { headers: auth(owner.token) })).status()).toBe(204);
    created.projectIds = created.projectIds.filter((id) => id !== project._id);
    expect((await request.get("/api/projects/" + project._id, { headers: auth(owner.token) })).status()).toBe(404);
  });

  test("AI validation rejects unsupported tools before calling a provider", async ({ request }) => {
    const run = Date.now() + "-" + crypto.randomUUID().slice(0, 8);
    const email = "qa-ai-" + run + "@taskflow.invalid";
    created.emails.push(email);
    const response = await request.post("/api/auth/register", {
      data: { name: "QA AI", email, password: "QA-" + run + "-Password!" },
    });
    expect(response.status()).toBe(201);
    const account = await response.json();
    created.userIds.push(account.user._id);
    const aiResponse = await request.post("/api/ai/generate", {
      headers: { Authorization: "Bearer " + account.token },
      data: { tool: "unsupported", prompt: "Synthetic test input" },
    });
    expect(aiResponse.status()).toBe(400);
  });

  test("live AI provider response structure (explicit opt-in only)", async ({ request }) => {
    test.skip(process.env.TASKFLOW_ENABLE_AI_TESTS !== "true", "SKIPPED: provider test may incur cost; opt in explicitly");
    const run = Date.now() + "-" + crypto.randomUUID().slice(0, 8);
    const email = "qa-ai-live-" + run + "@taskflow.invalid";
    created.emails.push(email);
    const response = await request.post("/api/auth/register", {
      data: { name: "QA AI Live", email, password: "QA-" + run + "-Password!" },
    });
    expect(response.status()).toBe(201);
    const account = await response.json();
    created.userIds.push(account.user._id);
    const generated = await request.post("/api/ai/generate", {
      headers: { Authorization: "Bearer " + account.token },
      data: { tool: "Task breakdown", prompt: "Synthetic test only: split a demo task into two steps." },
      timeout: 90000,
    });
    expect(generated.status()).toBe(200);
    const body = await generated.json();
    expect(body.tool).toBe("Task breakdown");
    expect(Array.isArray(body.phases)).toBe(true);
  });
});
