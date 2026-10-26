import { test, expect } from "@playwright/test";
import { testDataEnabled } from "./safety.mjs";
import { cleanupRun } from "./cleanup.js";

test.describe("browser E2E against disposable local data", () => {
  test.skip(!testDataEnabled, "BLOCKED: configure disposable test DB; see tests/README.md");
  const created = { emails: [], userIds: [], projectIds: [], taskIds: [] };
  test.afterAll(async () => {
    if (testDataEnabled) await cleanupRun(created);
  });

  test("registration, protected route, project/task persistence, and logout", async ({ page, request }) => {
    const run = Date.now() + "-" + crypto.randomUUID().slice(0, 8);
    const email = "qa-browser-" + run + "@taskflow.invalid";
    const password = "QA-" + run + "-Password!";
    created.emails.push(email);
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const failedRequests = [];
    page.on("requestfailed", (req) => failedRequests.push(req.method() + " " + req.url()));
    page.on("response", (response) => {
      if (response.status() >= 500) failedRequests.push("HTTP " + response.status() + " " + response.url());
    });

    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await page.getByLabel("Email Address").fill(email);
    await page.getByLabel("Password").fill("incorrect-test-password");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible();
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/register");
    await page.getByRole("button", { name: "Get Started" }).click();
    await expect(page).toHaveURL(/\/register$/);
    await page.getByLabel("Full Name").fill("Disposable QA Browser");
    await page.getByLabel("Email Address").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Get Started" }).click();
    await expect(page).toHaveURL("/");

    await page.getByRole("link", { name: "Projects" }).click();
    await page.getByRole("button", { name: /New Project/i }).click();
    await expect(page.getByRole("heading", { name: "Create project" })).toBeVisible();
    const projectName = "QA Project " + run;
    await page.getByPlaceholder("e.g. Website redesign").fill(projectName);
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByText(projectName)).toBeVisible();
    const projectsResponse = await request.get("/api/projects");
    const project = (await projectsResponse.json()).find((entry) => entry.name === projectName);
    expect(project).toBeTruthy();
    created.projectIds.push(project._id);

    await page.getByRole("link", { name: "Tasks" }).click();
    await page.getByRole("button", { name: /Add Task/i }).click();
    const taskTitle = "QA Task " + run;
    await page.getByPlaceholder("e.g. Design onboarding flow").fill(taskTitle);
    await page.locator('select[name="project"]').selectOption(project._id);
    await page.getByRole("button", { name: "Create task" }).click();
    await expect(page.getByText(taskTitle)).toBeVisible();
    const tasksResponse = await request.get("/api/tasks?search=" + encodeURIComponent(run));
    const task = (await tasksResponse.json()).find((entry) => entry.title === taskTitle);
    expect(task).toBeTruthy();
    created.taskIds.push(task._id);

    await page.reload();
    await expect(page.getByText(taskTitle)).toBeVisible();
    await page.getByText(taskTitle).click();
    await page.locator("#task-edit-form input[type=text]").fill(taskTitle + " edited");
    await page.locator("#task-edit-form select").first().selectOption("In Progress");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText(taskTitle + " edited")).toBeVisible();
    const persisted = await request.get("/api/tasks/" + task._id);
    expect(persisted.ok()).toBeTruthy();
    expect((await persisted.json()).status).toBe("In Progress");
    await page.getByRole("button", { name: /Comments/ }).click();
    await expect(page.getByText("No comments yet. Start the conversation below!")).toBeVisible();
    await page.locator(".task-detail-modal .modal-head button").last().click();
    await page.getByRole("button", { name: "View notifications" }).click();
    await expect(page.getByText("No notifications yet")).toBeVisible();
    await page.getByRole("button", { name: /Log Out/i }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(pageErrors, "browser runtime errors").toEqual([]);
    expect(failedRequests, "failed requests and server errors").toEqual([]);
  });

  test("team, reports, AI workspace, and settings routes render", async ({ page }) => {
    const run = Date.now() + "-" + crypto.randomUUID().slice(0, 8);
    const email = "qa-routes-" + run + "@taskflow.invalid";
    created.emails.push(email);
    await page.goto("/register");
    await page.getByLabel("Full Name").fill("QA Route User");
    await page.getByLabel("Email Address").fill(email);
    await page.getByLabel("Password").fill("QA-" + run + "-Password!");
    await page.getByRole("button", { name: "Get Started" }).click();
    await expect(page).toHaveURL("/");
    for (const route of ["/team", "/reports", "/ai", "/settings"]) {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator(".content")).not.toBeEmpty();
    }
  });
});
