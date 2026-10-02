// src/lib/format.js
const DAY = 86400000;

export const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);

export function timeAgo(date) {
  if (!date) return "";
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatDate(date);
}

export function formatDate(date, opts = {}) {
  if (!date) return "";
  const d = new Date(date);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }), ...opts });
}

export const formatTime = (date) => new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** "Today", "Tomorrow", "Yesterday", "Mon", "Oct 12" — plus a tone for due dates. */
export function dueLabel(date, status) {
  if (!date) return null;
  const diff = daysBetween(new Date(), date);
  const done = status === "done" || status === "canceled";
  let text;
  if (diff === 0) text = "Today";
  else if (diff === 1) text = "Tomorrow";
  else if (diff === -1) text = "Yesterday";
  else if (diff > 1 && diff < 7) text = new Date(date).toLocaleDateString("en-US", { weekday: "short" });
  else text = formatDate(date);
  const tone = done ? "muted" : diff < 0 ? "overdue" : diff === 0 ? "today" : diff <= 2 ? "soon" : "normal";
  return { text, tone, diff };
}

export const toInputDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Store dates at 5pm local so "due on the 12th" never slides across a timezone boundary. */
export const fromInputDate = (value) => (value ? new Date(`${value}T17:00:00`).toISOString() : null);

export const fullName = (u) => (u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "");
export const initials = (u) => (u ? `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase() : "?");

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

export const plural = (n, word, pluralWord) => `${n} ${n === 1 ? word : pluralWord || `${word}s`}`;

export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const modKey = isMac ? "⌘" : "Ctrl";
