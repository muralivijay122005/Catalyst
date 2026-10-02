// src/pages/project/Board.jsx
// Kanban board with drag & drop. Moves are optimistic; the server has the final say (e.g. routing to review).
import { useMemo, useRef, useState } from "react";
import { LuPlus, LuMessageSquare, LuListChecks, LuShieldCheck, LuLock } from "react-icons/lu";
import { useWorkspace } from "../../context/WorkspaceContext";
import { StatusIcon, PriorityIcon } from "../../components/ui/icons";
import { Avatar } from "../../components/ui/Avatar";
import { Tooltip } from "../../components/ui/primitives";
import { toast } from "../../components/ui/toast";
import { DueChip } from "../../components/task/TaskRow";
import { patchTask } from "../../components/task/taskApi";
import { api } from "../../lib/api";
import { BOARD_STATUSES, STATUS } from "../../lib/constants";

function Card({ task, project, dragging, onDragStart, onDragEnd }) {
  const ws = useWorkspace();
  const draggable = task.can?.fields?.includes("status");
  const color = (name) => project.labels?.find((l) => l.name === name)?.color || "#a1a1aa";
  return (
    <div
      data-card={task._id}
      draggable={draggable}
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={() => ws.openTask(task.ref)}
      onKeyDown={(e) => e.key === "Enter" && ws.openTask(task.ref)}
      tabIndex={0}
      role="button"
      className={`group bg-surface rounded-[10px] p-3 cursor-pointer outline-none select-none transition-[box-shadow,transform,opacity] duration-200 hover:-translate-y-px focus-visible:shadow-[var(--shadow-focus)] ${
        dragging ? "drag-ghost" : ""
      } ${draggable ? "active:cursor-grabbing" : ""}`}
      style={{ boxShadow: "var(--shadow-card)" }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-raised)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-card)")}
    >
      <div className="flex items-center gap-1.5 text-[11.5px] text-faint">
        <span className="mono">{task.ref}</span>
        {task.approval?.state === "pending" && (
          <Tooltip label="Waiting for a manager's approval">
            <span className="inline-flex items-center gap-0.5 text-accent">
              <LuShieldCheck size={11} />
            </span>
          </Tooltip>
        )}
        {!draggable && (
          <Tooltip label="You can't move this task">
            <LuLock size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </Tooltip>
        )}
        <span className="ml-auto">
          <PriorityIcon priority={task.priority} size={13} />
        </span>
      </div>
      <p className={`mt-1.5 text-[13px] leading-[18px] font-medium ${task.status === "done" ? "text-muted" : "text-ink"}`}>{task.title}</p>
      {task.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.labels.map((l) => (
            <span key={l} className="chip h-[20px] text-[10.5px] px-1.5">
              <span className="dot size-1.5" style={{ background: color(l) }} />
              {l}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2.5 mt-2.5">
        <DueChip date={task.dueDate} status={task.status} />
        {task.checklistTotal > 0 && (
          <span className={`flex items-center gap-1 text-[11.5px] tabular-nums ${task.checklistDone === task.checklistTotal ? "text-ok" : "text-faint"}`}>
            <LuListChecks size={12} />
            {task.checklistDone}/{task.checklistTotal}
          </span>
        )}
        {task.commentCount > 0 && (
          <span className="flex items-center gap-1 text-[11.5px] text-faint tabular-nums">
            <LuMessageSquare size={11} />
            {task.commentCount}
          </span>
        )}
        <span className="ml-auto">
          <Avatar user={task.assignee} size={20} />
        </span>
      </div>
    </div>
  );
}

function QuickAdd({ project, status, onCreated, onCancel }) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!title.trim()) return onCancel();
    setSaving(true);
    try {
      const task = await api.post("/tasks", { projectId: project._id, title, status });
      onCreated(task);
      setTitle("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="bg-surface rounded-[10px] p-2.5" style={{ boxShadow: "var(--shadow-focus)", animation: "var(--animate-pop)" }}>
      <textarea
        autoFocus
        rows={2}
        value={title}
        disabled={saving}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            e.stopPropagation();
            onCancel();
          }
        }}
        onBlur={() => !title.trim() && onCancel()}
        placeholder="Task title — Enter to add"
        className="w-full bg-transparent outline-none resize-none text-[13px] placeholder:text-faint"
      />
    </div>
  );
}

export default function Board({ project, tasks, loading, onTaskChange, setTasks }) {
  const ws = useWorkspace();
  const [dragId, setDragId] = useState(null);
  const [drop, setDrop] = useState(null); // { status, index }
  const [adding, setAdding] = useState(null);
  const columnsRef = useRef({});

  const columns = useMemo(() => {
    const map = Object.fromEntries(BOARD_STATUSES.map((s) => [s, []]));
    (tasks || []).forEach((t) => map[t.status]?.push(t));
    Object.values(map).forEach((list) => list.sort((a, b) => a.order - b.order || b.number - a.number));
    return map;
  }, [tasks]);

  const onDragStart = (e, task) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task._id);
    requestAnimationFrame(() => setDragId(task._id));
  };
  const onDragEnd = () => {
    setDragId(null);
    setDrop(null);
  };

  const indexFor = (status, clientY) => {
    const cards = [...(columnsRef.current[status]?.querySelectorAll("[data-card]") || [])].filter((el) => el.dataset.card !== dragId);
    const i = cards.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return clientY < r.top + r.height / 2;
    });
    return i === -1 ? cards.length : i;
  };

  const onDragOver = (e, status) => {
    if (!dragId) return;
    e.preventDefault();
    const index = indexFor(status, e.clientY);
    if (drop?.status !== status || drop?.index !== index) setDrop({ status, index });
  };

  const onDrop = async (e, status) => {
    e.preventDefault();
    const task = tasks.find((t) => t._id === dragId);
    const target = drop;
    onDragEnd();
    if (!task || !target) return;
    const list = columns[status].filter((t) => t._id !== task._id);
    const before = list[target.index - 1];
    const after = list[target.index];
    const order = before && after ? (before.order + after.order) / 2 : before ? before.order + 1000 : after ? after.order - 1000 : 1000;
    // Dropped back where it started
    if (task.status === status && columns[status].findIndex((t) => t._id === task._id) === target.index) return;

    const patch = { order };
    if (task.status !== status) patch.status = status;
    const optimisticStatus = patch.status === "done" && task.can?.needsApproval ? "in_review" : status;
    const prev = task;
    onTaskChange({ ...task, status: optimisticStatus, order });
    try {
      const updated = await patchTask(task, patch, { quiet: true });
      onTaskChange({ ...task, ...updated, assignee: updated.assignee, can: updated.can, project: task.project, commentCount: task.commentCount, checklistDone: task.checklistDone, checklistTotal: task.checklistTotal });
      if (patch.status) ws.taskChanged();
    } catch {
      onTaskChange(prev);
    }
  };

  return (
    <div className="flex-1 min-h-0 scroll-x">
      <div className="flex gap-3 h-full px-6 py-4 min-w-max">
        {BOARD_STATUSES.map((status) => {
          const list = columns[status];
          const isTarget = drop?.status === status;
          const canQuickAdd = project.can.createTask && !["in_review", "done"].includes(status);
          return (
            <section
              key={status}
              ref={(el) => (columnsRef.current[status] = el)}
              onDragOver={(e) => onDragOver(e, status)}
              onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setDrop((d) => (d?.status === status ? null : d))}
              onDrop={(e) => onDrop(e, status)}
              className={`w-[288px] shrink-0 flex flex-col rounded-xl transition-colors duration-150 ${isTarget ? "drop-target" : "bg-canvas"}`}
            >
              <header className="flex items-center gap-2 h-11 px-3 shrink-0">
                <StatusIcon status={status} />
                <span className="text-[13px] font-semibold text-ink">{STATUS[status].label}</span>
                <span className="text-xs text-faint tabular-nums">{list.length}</span>
                {canQuickAdd && (
                  <Tooltip label={`Add to ${STATUS[status].label}`}>
                    <button className="icon-btn size-6 ml-auto" onClick={() => setAdding(status)} aria-label={`Add task to ${STATUS[status].label}`}>
                      <LuPlus size={14} />
                    </button>
                  </Tooltip>
                )}
              </header>
              <div className="flex-1 min-h-0 scroll px-2 pb-2 space-y-2">
                {adding === status && (
                  <QuickAdd
                    project={project}
                    status={status}
                    onCancel={() => setAdding(null)}
                    onCreated={(t) => {
                      setTasks((all) => [...(all || []), { ...t, commentCount: 0, checklistDone: 0, checklistTotal: 0 }]);
                      ws.refreshProjects();
                    }}
                  />
                )}
                {loading && !tasks && [0, 1, 2].map((i) => <div key={i} className="skeleton h-[92px] rounded-[10px]" />)}
                {(() => {
                  // Drop index counts cards other than the one being dragged
                  let visible = -1;
                  return list.map((t, i) => {
                    if (t._id !== dragId) visible++;
                    const showLine = isTarget && t._id !== dragId && drop.index === visible;
                    return (
                      <div key={t._id}>
                        {showLine && <div className="h-1 rounded-full bg-accent mb-2" style={{ animation: "grow-x 160ms ease-out both" }} />}
                        <div style={{ animation: `enter 360ms var(--ease-out-expo) ${Math.min(i, 10) * 24}ms both` }}>
                          <Card task={t} project={project} dragging={dragId === t._id} onDragStart={onDragStart} onDragEnd={onDragEnd} />
                        </div>
                      </div>
                    );
                  });
                })()}
                {isTarget && drop.index >= list.filter((t) => t._id !== dragId).length && <div className="h-1 rounded-full bg-accent" style={{ animation: "grow-x 160ms ease-out both" }} />}
                {!loading && list.length === 0 && adding !== status && !isTarget && (
                  <div className="grid place-items-center h-20 rounded-[10px] border border-dashed border-line-strong/70 text-xs text-faint">
                    {status === "in_review" && project.requireApproval ? "Finished work waits here for approval" : "No tasks"}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
