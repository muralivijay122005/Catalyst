// src/BACKEND/utils/presence.cjs
// Presence model: the browser sends a heartbeat every ~45s while the tab is visible and the person
// has interacted recently. Someone is online when their last heartbeat is within ONLINE_WINDOW and
// they haven't explicitly gone offline (signed out / closed the tab). lastSeenAt doubles as "last active".
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

const isUserOnline = (u, now = Date.now()) =>
  Boolean(u) && u.presence === "online" && Boolean(u.lastSeenAt) && now - new Date(u.lastSeenAt).getTime() < ONLINE_WINDOW_MS;

const presenceOf = (u, now = Date.now()) => ({
  _id: u._id,
  online: isUserOnline(u, now),
  lastSeenAt: u.lastSeenAt || null,
});

module.exports = { ONLINE_WINDOW_MS, isUserOnline, presenceOf };
