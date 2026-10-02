// src/lib/constants.js
import {
  LuGitMerge,
  LuWorkflow,
  LuLightbulb,
  LuBookmark,
  LuLink,
  LuFileText,
} from "react-icons/lu";

export const STATUSES = ["backlog", "todo", "in_progress", "in_review", "done", "canceled"];
export const BOARD_STATUSES = ["backlog", "todo", "in_progress", "in_review", "done"];

export const STATUS = {
  backlog: { label: "Backlog", color: "#a1a1aa" },
  todo: { label: "Todo", color: "#71717a" },
  in_progress: { label: "In progress", color: "#d97706" },
  in_review: { label: "In review", color: "#2563eb" },
  done: { label: "Done", color: "#16a34a" },
  canceled: { label: "Canceled", color: "#a1a1aa" },
};

export const PRIORITIES = ["urgent", "high", "medium", "low", "none"];
export const PRIORITY = {
  urgent: { label: "Urgent", rank: 4 },
  high: { label: "High", rank: 3 },
  medium: { label: "Medium", rank: 2 },
  low: { label: "Low", rank: 1 },
  none: { label: "No priority", rank: 0 },
};

export const ROLE = {
  admin: { label: "Admin", tone: "bg-ink text-white" },
  manager: { label: "Manager", tone: "bg-accent-soft text-accent" },
  member: { label: "Member", tone: "bg-subtle text-ink-2" },
  guest: { label: "Guest", tone: "bg-amber-50 text-amber-700" },
};

export const PROJECT_ROLE = {
  owner: "Owner",
  manager: "Manager",
  member: "Member",
  viewer: "Viewer",
};

export const MEMORY_TYPES = ["decision", "process", "insight", "fact", "reference", "note"];
export const MEMORY_TYPE = {
  decision: { label: "Decision", plural: "Decisions", icon: LuGitMerge, color: "#2563eb", bg: "#eff4ff", hint: "A choice the team made and why" },
  process: { label: "Process", plural: "Processes", icon: LuWorkflow, color: "#0a0a0b", bg: "#f4f4f5", hint: "How something is done, step by step" },
  insight: { label: "Insight", plural: "Insights", icon: LuLightbulb, color: "#d97706", bg: "#fffbeb", hint: "A lesson learned or root cause" },
  fact: { label: "Fact", plural: "Facts", icon: LuBookmark, color: "#0891b2", bg: "#ecfeff", hint: "Stable information people look up" },
  reference: { label: "Reference", plural: "References", icon: LuLink, color: "#7c3aed", bg: "#f5f3ff", hint: "A link, spec or pointer" },
  note: { label: "Note", plural: "Notes", icon: LuFileText, color: "#71717a", bg: "#f4f4f5", hint: "Anything else worth keeping" },
};

export const VISIBILITY = {
  workspace: { label: "Workspace", hint: "Everyone in the workspace (not guests)" },
  project: { label: "Project", hint: "Only people who can see the project" },
  private: { label: "Private", hint: "Only you" },
};

export const PROJECT_COLORS = ["#2563eb", "#0f172a", "#0891b2", "#16a34a", "#7c3aed", "#db2777", "#ea580c", "#d97706", "#64748b"];
export const AVATAR_COLORS = ["#0f172a", "#2563eb", "#1d4ed8", "#0891b2", "#0d9488", "#16a34a", "#7c3aed", "#db2777", "#ea580c", "#64748b"];

export const LABEL_COLORS = ["#dc2626", "#ea580c", "#d97706", "#16a34a", "#0891b2", "#2563eb", "#7c3aed", "#db2777", "#64748b", "#0f172a"];

export const SHORTCUTS = [
  { group: "General", items: [
    { keys: ["mod", "K"], label: "Open command menu" },
    { keys: ["/"], label: "Search" },
    { keys: ["C"], label: "Create task" },
    { keys: ["?"], label: "Show keyboard shortcuts" },
    { keys: ["["], label: "Collapse or expand sidebar" },
    { keys: ["Esc"], label: "Close panel or dialog" },
  ] },
  { group: "Navigation", items: [
    { keys: ["G", "H"], label: "Go to Home" },
    { keys: ["G", "I"], label: "Go to Inbox" },
    { keys: ["G", "T"], label: "Go to My tasks" },
    { keys: ["G", "A"], label: "Go to Approvals" },
    { keys: ["G", "K"], label: "Go to Knowledge Base" },
    { keys: ["G", "C"], label: "Go to Channels" },
    { keys: ["G", "P"], label: "Go to People" },
    { keys: ["G", "S"], label: "Go to Settings" },
  ] },
  { group: "Projects", items: [
    { keys: ["1"], label: "Overview" },
    { keys: ["2"], label: "Board" },
    { keys: ["3"], label: "List" },
    { keys: ["4"], label: "Calendar" },
    { keys: ["5"], label: "Timeline" },
  ] },
  { group: "Knowledge Base", items: [
    { keys: ["N"], label: "New knowledge" },
    { keys: ["A"], label: "Ask the knowledge base" },
    { keys: ["J"], label: "Next item" },
    { keys: ["K"], label: "Previous item" },
  ] },
  { group: "Tasks", items: [
    { keys: ["mod", "Enter"], label: "Send comment" },
  ] },
];
