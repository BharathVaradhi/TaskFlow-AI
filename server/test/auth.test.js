import { test, describe } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const TEST_SECRET = "test-secret-key-1234567890";

describe("Authentication & Security Primitives", () => {
  test("hashes password securely with bcrypt and verifies match", async () => {
    const rawPassword = "SecurePassword123!";
    const hash = await bcrypt.hash(rawPassword, 10);

    assert.notEqual(rawPassword, hash);
    const isMatch = await bcrypt.compare(rawPassword, hash);
    assert.equal(isMatch, true);

    const isWrongMatch = await bcrypt.compare("WrongPassword", hash);
    assert.equal(isWrongMatch, false);
  });

  test("generates and verifies JWT token successfully", () => {
    const userId = "60c72b2f9b1d8b001c8e4d1a";
    const token = jwt.sign({ id: userId }, TEST_SECRET, { expiresIn: "1h" });

    assert.ok(token);
    assert.equal(typeof token, "string");

    const decoded = jwt.verify(token, TEST_SECRET);
    assert.equal(decoded.id, userId);
  });

  test("rejects tampered JWT tokens", () => {
    const token = jwt.sign({ id: "user-123" }, TEST_SECRET, { expiresIn: "1h" });
    const tampered = token.slice(0, -5) + "abcde";

    assert.throws(() => {
      jwt.verify(tampered, TEST_SECRET);
    }, /invalid signature/i);
  });

  test("rejects tokens signed with different secret", () => {
    const token = jwt.sign({ id: "user-123" }, "wrong-secret-key", { expiresIn: "1h" });

    assert.throws(() => {
      jwt.verify(token, TEST_SECRET);
    }, /invalid signature/i);
  });

  test("rejects expired tokens", () => {
    const token = jwt.sign({ id: "user-123" }, TEST_SECRET, { expiresIn: "0s" });

    assert.throws(() => {
      jwt.verify(token, TEST_SECRET);
    }, /jwt expired/i);
  });
});

describe("Authorization and Permission Model Logic", () => {
  const currentUserId = "user-100";
  const projectOwnerId = "user-100";
  const projectMemberId = "user-200";
  const outsiderId = "user-999";

  function hasProjectAccess(project, userId) {
    if (!project || !userId) return false;
    return (
      project.owner === userId ||
      (Array.isArray(project.members) && project.members.includes(userId))
    );
  }

  function canDeleteProject(project, userId) {
    if (!project || !userId) return false;
    return project.owner === userId;
  }

  function canModifyTask(task, project, userId) {
    if (!task || !userId) return false;
    const isCreator = task.createdBy === userId;
    const isAssignee = task.assignee === userId;
    const hasProj = hasProjectAccess(project, userId);
    return isCreator || isAssignee || hasProj;
  }

  test("project owner has access to project", () => {
    const project = { owner: projectOwnerId, members: [projectMemberId] };
    assert.equal(hasProjectAccess(project, currentUserId), true);
  });

  test("project member has access to project", () => {
    const project = { owner: "user-admin", members: [projectMemberId] };
    assert.equal(hasProjectAccess(project, projectMemberId), true);
  });

  test("unrelated user does not have access to project", () => {
    const project = { owner: projectOwnerId, members: [projectMemberId] };
    assert.equal(hasProjectAccess(project, outsiderId), false);
  });

  test("only project owner can delete project", () => {
    const project = { owner: projectOwnerId, members: [projectMemberId] };
    assert.equal(canDeleteProject(project, projectOwnerId), true);
    assert.equal(canDeleteProject(project, projectMemberId), false);
    assert.equal(canDeleteProject(project, outsiderId), false);
  });

  test("task modification allowed for assignee, creator, or project member", () => {
    const project = { owner: projectOwnerId, members: [projectMemberId] };
    const task = { createdBy: "user-admin", assignee: currentUserId };

    assert.equal(canModifyTask(task, project, currentUserId), true);
    assert.equal(canModifyTask(task, project, outsiderId), false);
  });
});
