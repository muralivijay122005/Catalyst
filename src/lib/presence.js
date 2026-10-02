// src/lib/presence.js
// Live presence store. WorkspaceContext feeds it from GET /users/presence every ~30s;
// components read it with usePresence(user) so dots and "Active x ago" labels stay current everywhere.
import { useSyncExternalStore } from "react";

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
let byId = new Map();
let skew = 0; // server clock − client clock, so "x mins ago" isn't thrown off by a wrong local clock
let version = 0;
const listeners = new Set();

const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

export function setPresence(list, serverTime) {
  if (serverTime) skew = new Date(serverTime).getTime() - Date.now();
  byId = new Map(list.map((p) => [String(p._id), p]));
  emit();
}

/** Optimistically mark one person (usually yourself) online/offline without waiting for the next poll. */
export function patchPresence(id, patch) {
  const prev = byId.get(String(id)) || { _id: id };
  byId = new Map(byId);
  byId.set(String(id), { ...prev, ...patch });
  emit();
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const now = () => Date.now() + skew;

/** Presence for a user object or id. Falls back to fields on the user object until the first poll lands. */
export function getPresence(user) {
  if (!user) return { online: false, lastSeenAt: null };
  const id = String(user._id || user);
  const p = byId.get(id);
  if (p) return { online: Boolean(p.online), lastSeenAt: p.lastSeenAt };
  const last = user.lastSeenAt ? new Date(user.lastSeenAt).getTime() : 0;
  return { online: user.presence === "online" && now() - last < ONLINE_WINDOW_MS, lastSeenAt: user.lastSeenAt || null };
}

export function usePresence(user) {
  useSyncExternalStore(subscribe, () => version);
  return getPresence(user);
}

/** "Online", "Active just now", "Active 2 mins ago", "Active 3 hrs ago", "Active yesterday", "Active Oct 2". */
export function presenceLabel({ online, lastSeenAt }) {
  if (online) return "Online";
  if (!lastSeenAt) return "Not active yet";
  const diff = Math.max(0, now() - new Date(lastSeenAt).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Active just now";
  if (mins < 60) return `Active ${mins} ${mins === 1 ? "min" : "mins"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Active ${hrs} ${hrs === 1 ? "hr" : "hrs"} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Active yesterday";
  if (days < 7) return `Active ${days} days ago`;
  const d = new Date(lastSeenAt);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `Active ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) })}`;
}

export function usePresenceLabel(user) {
  return presenceLabel(usePresence(user));
}
