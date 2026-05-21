// src/utils/colorMapper.js

const TASK_COLORS = [
  "indigo",
  "sky",
  "pink",
  "yellow",
  "green",
  "emerald",
  "amber",
  "indigo",
  "rose",
  "cyan",
  "teal",
  "lime",
];

/**
 * Generate a deterministic color from task name
 * @param {string} taskName
 * @param {number} fallbackIndex
 */
export const getTaskColor = (taskName, fallbackIndex = 0) => {
  if (!taskName || typeof taskName !== "string") {
    return TASK_COLORS[fallbackIndex % TASK_COLORS.length];
  }

  let hash = 0;
  for (let i = 0; i < taskName.length; i++) {
    const char = taskName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // convert to 32-bit integer
  }

  const index = Math.abs(hash) % TASK_COLORS.length;
  return TASK_COLORS[index];
};

/**
 * Get Tailwind color classes for task strips (only strips changed)
 * Now uses soft tinted background + bold left border + dark readable text
 */
export const getColorClasses = (color) => {
  const map = {
    indigo: "bg-indigo-500/20 border-l-4 border-indigo-600 text-indigo-900",
    sky: "bg-sky-500/20 border-l-4 border-sky-600 text-sky-900",
    pink: "bg-pink-500/20 border-l-4 border-pink-600 text-pink-900",
    yellow: "bg-yellow-500/20 border-l-4 border-yellow-600 text-yellow-900",
    green: "bg-green-500/20 border-l-4 border-green-600 text-green-900",
    emerald: "bg-emerald-500/20 border-l-4 border-emerald-600 text-emerald-900",
    amber: "bg-amber-500/20 border-l-4 border-amber-600 text-amber-900",
    indigo: "bg-indigo-500/20 border-l-4 border-indigo-600 text-indigo-900",
    rose: "bg-rose-500/20 border-l-4 border-rose-600 text-rose-900",
    cyan: "bg-cyan-500/20 border-l-4 border-cyan-600 text-cyan-900",
    teal: "bg-teal-500/20 border-l-4 border-teal-600 text-teal-900",
    lime: "bg-lime-500/20 border-l-4 border-lime-600 text-lime-900",
  };

  return map[color] || map.indigo;
};
