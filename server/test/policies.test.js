import test from "node:test";
import assert from "node:assert/strict";
import { canChangeRole, canEditProject, registrationRole } from "../src/policies.js";

test("privilege boundaries", async (t) => {
  await t.test("public registration always assigns the least privileged role", () => {
    assert.equal(registrationRole(), "Team Member");
  });

  await t.test("only project owners or managers who belong to the project can edit it", () => {
    assert.equal(canEditProject({ isOwner: true, isMember: false, role: "Team Member" }), true);
    assert.equal(canEditProject({ isOwner: false, isMember: true, role: "Project Manager" }), true);
    assert.equal(canEditProject({ isOwner: false, isMember: false, role: "Admin" }), false);
    assert.equal(canEditProject({ isOwner: false, isMember: true, role: "Team Member" }), false);
  });

  await t.test("only an administrator can grant or change team roles", () => {
    assert.equal(canChangeRole("Admin", "Project Manager"), true);
    assert.equal(canChangeRole("Admin", "invalid-role"), false);
    assert.equal(canChangeRole("Project Manager", "Admin"), false);
    assert.equal(canChangeRole("Team Member", "Admin"), false);
  });
});
