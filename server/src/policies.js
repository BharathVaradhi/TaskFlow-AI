const ROLES = new Set(["Admin", "Project Manager", "Team Member"]);

export function canEditProject({ isOwner, isMember, role }) {
  return Boolean(isOwner || (isMember && ["Project Manager", "Admin"].includes(role)));
}

export function canChangeRole(actorRole, newRole) {
  return actorRole === "Admin" && ROLES.has(newRole);
}

export function registrationRole() {
  return "Team Member";
}
