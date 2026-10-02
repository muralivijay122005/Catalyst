// src/components/ui/toast.js
// Tiny event-based toast API: toast("Saved"), toast.error("Nope"), toast.success("Done", { action: { label, onClick } })
const listeners = new Set();
let id = 0;

function emit(message, opts = {}) {
  const t = { id: ++id, message, tone: opts.tone || "default", description: opts.description, action: opts.action, duration: opts.duration ?? 3800 };
  listeners.forEach((l) => l(t));
  return t.id;
}

export const toast = (message, opts) => emit(message, opts);
toast.success = (message, opts) => emit(message, { ...opts, tone: "success" });
toast.error = (message, opts) => emit(message, { ...opts, tone: "error", duration: 5200 });
toast.info = (message, opts) => emit(message, { ...opts, tone: "info" });

export const subscribeToasts = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
