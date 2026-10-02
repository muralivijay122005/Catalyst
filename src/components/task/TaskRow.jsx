// src/components/task/TaskRow.jsx
import { LuMessageSquare, LuListChecks } from "react-icons/lu";
import { useWorkspace } from "../../context/WorkspaceContext";
import { StatusIcon, PriorityIcon } from "../ui/icons";
import { Avatar } from "../ui/Avatar";
import { ProjectMark, Tooltip } from "../ui/primitives";
import { StatusPicker } from "./pickers";
import { patchTask } from "./taskApi";
import { dueLabel } from "../../lib/format";
import { STATUS } from "../../lib/constants";

const DUE_TONE = { overdue: "text-danger", today: "text-warn", soon: "text-ink-2", normal: "text-muted", muted: "text-faint" };

export function DueChip({ date, status, className = "" }) {
  const due = dueLabel(date, status);
  if (!due) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs tabular-nums whitespace-nowrap ${DUE_TONE[due.tone]} ${className}`}>
      {due.tone === "overdue" && <span className="dot size-1.5 bg-danger" />}
      {due.text}
    </span>
  );
}

export function LabelChips({ labels = [], project, max = 2 }) {
  if (!labels.length) return null;
  const color = (name) => project?.labels?.find((l) => l.name === name)?.color || "#a1a1aa";
  return (
    <span className="hidden md:flex items-center gap-1 shrink-0">
      {labels.slice(0, max).map((l) => (
        <span key={l} className="chip h-5 text-[11px]">
          <span className="dot size-1.5" style={{ background: color(l) }} />
          {l}
        </span>
      ))}
      {labels.length > max && <span className="text-[11px] text-faint">+{labels.length - max}</span>}
    </span>
  );
}

/**
 * A dense, clickable task row. Status can be changed inline when the user may edit it.
 */
export default function TaskRow({ task, onChange, showProject = false, project, index = 0, showAssignee = true }) {
  const ws = useWorkspace();
  const canStatus = task.can?.fields?.includes("status");
  const fullProject = project || ws.projectByKey(task.project?.key);

  const setStatus = async (status) => {
    const prev = task;
    onChange?.({ ...task, status: status === "done" && task.can?.needsApproval ? "in_review" : status });
    try {
      const updated = await patchTask(task, { status });
      onChange?.({ ...task, ...updated, project: task.project, can: { ...task.can, ...updated.can } });
      ws.taskChanged();
    } catch {
      onChange?.(prev);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => ws.openTask(task.ref)}
      onKeyDown={(e) => e.key === "Enter" && ws.openTask(task.ref)}
      className="group flex items-center gap-3 h-10 px-3 -mx-1 rounded-lg cursor-pointer outline-none transition-colors duration-100 hover:bg-subtle focus-visible:bg-subtle"
      style={{ "--i": index }}
    >
      <span onClick={(e) => e.stopPropagation()} className="flex">
        <StatusPicker value={task.status} onChange={setStatus} disabled={!canStatus}>
          {({ ref, toggle }) => (
            <Tooltip label={canStatus ? `${STATUS[task.status].label} — change status` : STATUS[task.status].label}>
              <button ref={ref} onClick={toggle} disabled={!canStatus} className="grid place-items-center size-6 -m-1 rounded-md hover:bg-black/[0.06] disabled:hover:bg-transparent disabled:cursor-default transition-transform active:scale-90">
                <StatusIcon status={task.status} size={15} />
              </button>
            </Tooltip>
          )}
        </StatusPicker>
      </span>
      <PriorityIcon priority={task.priority} />
      {showProject && task.project ? (
        <span className="hidden sm:flex items-center gap-1.5 shrink-0 w-[74px]">
          <ProjectMark project={task.project} size={14} />
          <span className="mono text-xs text-faint">{task.ref}</span>
        </span>
      ) : (
        <span className="hidden sm:block mono text-xs text-faint w-[52px] shrink-0">{task.ref}</span>
      )}
      <span className={`flex-1 min-w-0 truncate text-[13.5px] ${task.status === "done" || task.status === "canceled" ? "text-muted line-through decoration-faint" : "text-ink"}`}>
        {task.title}
      </span>
      {task.approval?.state === "pending" && <span className="chip chip-accent h-5 text-[11px]">In review</span>}
      <LabelChips labels={task.labels} project={fullProject} />
      {task.checklistTotal > 0 && (
        <span className="hidden lg:flex items-center gap-1 text-xs text-faint tabular-nums">
          <LuListChecks size={13} />
          {task.checklistDone}/{task.checklistTotal}
        </span>
      )}
      {task.commentCount > 0 && (
        <span className="hidden lg:flex items-center gap-1 text-xs text-faint tabular-nums">
          <LuMessageSquare size={12} />
          {task.commentCount}
        </span>
      )}
      <DueChip date={task.dueDate} status={task.status} className="w-[72px] justify-end" />
      {showAssignee && <Avatar user={task.assignee} size={22} />}
    </div>
  );
}
