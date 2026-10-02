// src/BACKEND/utils/permissions.cjs
// Two-layer RBAC.
//   Workspace role (admin | manager | member | guest) decides what you can do across the workspace.
//   Project role   (owner | manager | member | viewer) decides what you can do inside one project.
// On top of the role tables sit a few contextual rules:
//   - admins act as owners everywhere
//   - workspace managers get read-only oversight (viewer) of projects they are not a member of
//   - guests are capped at viewer in every project and only see knowledge scoped to their projects
//   - assignees and authors may work their own tasks; nobody may approve work they submitted (except admins)
//   - only admins change workspace roles; the last active admin can never be demoted or deactivated

const ROLES = ["admin", "manager", "member", "guest"];
const PROJECT_ROLES = ["owner", "manager", "member", "viewer"];
const PROJECT_ROLE_RANK = { viewer: 1, member: 2, manager: 3, owner: 4 };

const ROLE_LABEL = { admin: "Admin", manager: "Manager", member: "Member", guest: "Guest" };

const ALL_GLOBAL = [
  "project.create",
  "channel.create",
  "channel.announce",
  "kb.write",
  "kb.verify",
  "kb.distill",
  "user.invite",
  "user.manage",
  "workspace.oversight",
];

// Workspace-wide capabilities
const GLOBAL = {
  admin: ALL_GLOBAL,
  manager: [
    "project.create",
    "channel.create",
    "channel.announce",
    "kb.write",
    "kb.verify",
    "kb.distill",
    "user.invite",
    "workspace.oversight",
  ],
  member: ["channel.create", "kb.write", "kb.distill"],
  guest: [],
};

// Capabilities granted by a role inside a specific project
const PROJECT = {
  owner: [
    "project.view",
    "project.update",
    "project.delete",
    "project.members",
    "project.grantManager",
    "task.create",
    "task.edit",
    "task.editOwn",
    "task.delete",
    "task.assign",
    "task.approve",
    "task.comment",
    "kb.write",
    "kb.verify",
  ],
  manager: [
    "project.view",
    "project.update",
    "project.members",
    "task.create",
    "task.edit",
    "task.editOwn",
    "task.delete",
    "task.assign",
    "task.approve",
    "task.comment",
    "kb.write",
    "kb.verify",
  ],
  member: ["project.view", "task.create", "task.editOwn", "task.comment", "kb.write"],
  viewer: ["project.view", "task.comment"],
};

const TASK_FIELDS = [
  "title",
  "description",
  "status",
  "priority",
  "assignee",
  "labels",
  "milestone",
  "startDate",
  "dueDate",
  "estimate",
  "checklist",
  "order",
];
// What a member may change on a task they are working (assigned to)
const OWN_TASK_FIELDS = ["description", "status", "checklist", "startDate", "dueDate", "estimate", "order", "labels"];

const idOf = (v) => (v && v._id ? v._id.toString() : v ? v.toString() : null);
const sameId = (a, b) => idOf(a) !== null && idOf(a) === idOf(b);

const isAdmin = (user) => user?.role === "admin";
const globalPermissions = (user) => (user ? GLOBAL[user.role] || [] : []);
const hasGlobal = (user, perm) => globalPermissions(user).includes(perm);

/** The user's effective role inside a project, or null when they cannot see it. */
function projectRole(user, project) {
  if (!user || !project) return null;
  if (isAdmin(user)) return "owner";
  if (sameId(project.owner, user._id)) return user.role === "guest" ? "viewer" : "owner";
  const entry = (project.members || []).find((m) => sameId(m.user, user._id));
  if (entry) return user.role === "guest" ? "viewer" : entry.role;
  // Workspace managers keep read-only oversight of every project
  if (hasGlobal(user, "workspace.oversight")) return "viewer";
  return null;
}

/** True when the user is actually on the project team (oversight access doesn't count). */
function isProjectMember(user, project) {
  if (!user || !project) return false;
  return sameId(project.owner, user._id) || (project.members || []).some((m) => sameId(m.user, user._id));
}

const projectPermissions = (user, project) => PROJECT[projectRole(user, project)] || [];

function canInProject(user, project, perm) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return projectPermissions(user, project).includes(perm);
}

/** Can the user edit at least one field of this task? */
function canEditTask(user, project, task) {
  return editableTaskFields(user, project, task).length > 0;
}

/**
 * Field-level task permissions.
 * Managers edit everything. Assignees work their task (status, checklist, dates, description, labels).
 * Creators additionally control title, priority and milestone of tasks they filed.
 * A member may also pick up an unassigned task (assign it to themselves) — see canPickUp.
 */
function editableTaskFields(user, project, task) {
  if (canInProject(user, project, "task.edit")) return TASK_FIELDS;
  if (!canInProject(user, project, "task.editOwn")) return [];
  const fields = new Set();
  if (sameId(task.assignee, user._id)) OWN_TASK_FIELDS.forEach((f) => fields.add(f));
  if (sameId(task.createdBy, user._id)) {
    OWN_TASK_FIELDS.forEach((f) => fields.add(f));
    ["title", "priority", "milestone"].forEach((f) => fields.add(f));
  }
  return [...fields];
}

const canPickUp = (user, project, task) =>
  !task.assignee && canInProject(user, project, "task.editOwn") && !["done", "canceled"].includes(task.status);

/** Approval needs the permission AND separation of duties: you can't approve work you submitted. */
function canApproveTask(user, project, task) {
  if (!canInProject(user, project, "task.approve")) return false;
  if (isAdmin(user)) return true;
  return !sameId(task.approval?.requestedBy, user._id) && !sameId(task.assignee, user._id);
}

/** Whether a status change to "done" by this user must go through review instead. */
function needsApproval(user, project) {
  return Boolean(project?.requireApproval) && !canInProject(user, project, "task.approve");
}

function canDeleteTask(user, project, task) {
  if (canInProject(user, project, "task.delete")) return true;
  // Creators may delete their own tasks while nobody has started them
  return (
    canInProject(user, project, "task.editOwn") &&
    sameId(task.createdBy, user._id) &&
    ["backlog", "todo"].includes(task.status) &&
    !task.comments?.length
  );
}

/* ── Knowledge ─────────────────────────────────────────────── */

/**
 * Knowledge visibility:
 *   workspace → everyone except guests
 *   project   → anyone who can see the project
 *   private   → the author only
 * Guests additionally only ever see knowledge tied to a project they belong to.
 */
function canReadMemory(user, memory, projectIndex) {
  if (!user || !memory) return false;
  if (isAdmin(user)) return true;
  if (sameId(memory.createdBy, user._id)) return true;
  if (memory.visibility === "private") return false;
  const project = memory.projectId ? projectIndex?.get(idOf(memory.projectId)) : null;
  if (user.role === "guest") return Boolean(project && isProjectMember(user, project));
  if (memory.visibility === "project") return Boolean(project && projectRole(user, project));
  return true;
}

function canEditMemory(user, memory, project) {
  if (!user || !memory) return false;
  if (isAdmin(user)) return true;
  if (user.role === "guest") return false;
  if (sameId(memory.createdBy, user._id)) return true;
  if (memory.visibility === "private") return false;
  // Project managers curate their project's knowledge
  if (project && canInProject(user, project, "kb.verify")) return true;
  // Workspace managers curate shared workspace knowledge
  return user.role === "manager" && memory.visibility === "workspace";
}

const canDeleteMemory = canEditMemory;

function canVerifyMemory(user, memory, project) {
  if (!user || !memory || memory.visibility === "private") return false;
  if (hasGlobal(user, "kb.verify")) return true;
  return Boolean(project && canInProject(user, project, "kb.verify"));
}

function canWriteMemory(user, project) {
  if (!user || user.role === "guest") return false;
  if (!project) return hasGlobal(user, "kb.write");
  return canInProject(user, project, "kb.write");
}

/* ── People ─────────────────────────────────────────────────── */

/** Roles the actor may hand out when inviting someone. */
function invitableRoles(user) {
  if (isAdmin(user)) return ROLES;
  if (hasGlobal(user, "user.invite")) return ["member", "guest"];
  return [];
}

/* ── Serialisers for the UI ─────────────────────────────────── */

function projectCan(user, project) {
  const role = projectRole(user, project);
  const has = (p) => canInProject(user, project, p);
  return {
    role,
    member: isProjectMember(user, project),
    view: Boolean(role),
    update: has("project.update"),
    delete: has("project.delete"),
    manageMembers: has("project.members"),
    grantManager: has("project.grantManager"),
    createTask: has("task.create"),
    editAny: has("task.edit"),
    assign: has("task.assign"),
    approve: has("task.approve"),
    comment: has("task.comment"),
    writeKb: canWriteMemory(user, project),
    needsApproval: needsApproval(user, project),
  };
}

function taskCan(user, project, task) {
  return {
    fields: editableTaskFields(user, project, task),
    delete: canDeleteTask(user, project, task),
    approve: task.approval?.state === "pending" && canApproveTask(user, project, task),
    comment: canInProject(user, project, "task.comment"),
    pickUp: canPickUp(user, project, task),
    needsApproval: needsApproval(user, project),
  };
}

function memoryCan(user, memory, project) {
  return {
    edit: canEditMemory(user, memory, project),
    delete: canDeleteMemory(user, memory, project),
    verify: canVerifyMemory(user, memory, project),
  };
}

/** Everything the UI needs to know about the current user's workspace-level abilities. */
const describeUser = (user) => globalPermissions(user);

module.exports = {
  ROLES,
  PROJECT_ROLES,
  PROJECT_ROLE_RANK,
  ROLE_LABEL,
  TASK_FIELDS,
  idOf,
  sameId,
  isAdmin,
  hasGlobal,
  projectRole,
  isProjectMember,
  projectPermissions,
  canInProject,
  canEditTask,
  editableTaskFields,
  canPickUp,
  canApproveTask,
  needsApproval,
  canDeleteTask,
  canReadMemory,
  canEditMemory,
  canDeleteMemory,
  canVerifyMemory,
  canWriteMemory,
  invitableRoles,
  projectCan,
  taskCan,
  memoryCan,
  describeUser,
};
