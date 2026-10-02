// src/lib/people.js
const ONLINE_WINDOW = 10 * 60 * 1000;

/** True when someone was active in the last few minutes. */
export const isOnline = (user) => Boolean(user?.lastSeenAt) && Date.now() - new Date(user.lastSeenAt).getTime() < ONLINE_WINDOW;

/** People who can be assigned work in a project: the owner plus non-viewer members, active only. */
export function contributors(project) {
  if (!project) return [];
  const seen = new Set();
  const list = [];
  const add = (u) => {
    if (!u || typeof u !== "object" || seen.has(u._id) || u.status === "deactivated" || u.role === "guest") return;
    seen.add(u._id);
    list.push(u);
  };
  add(project.owner);
  (project.members || []).filter((m) => m.role !== "viewer").forEach((m) => add(m.user));
  return list.sort((a, b) => a.firstName.localeCompare(b.firstName));
}
