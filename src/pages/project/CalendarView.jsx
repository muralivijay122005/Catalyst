// src/pages/project/CalendarView.jsx
// Month calendar of due dates. Drag a task to another day to reschedule it (when you're allowed to).
import { useMemo, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuFlag } from "react-icons/lu";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { StatusIcon } from "../../components/ui/icons";
import { Avatar } from "../../components/ui/Avatar";
import { Tooltip } from "../../components/ui/primitives";
import { patchTask } from "../../components/task/taskApi";
import { startOfDay } from "../../lib/format";

const DAY = 86400000;
const key = (d) => startOfDay(d).toISOString().slice(0, 10);

export default function CalendarView({ project, tasks, onTaskChange }) {
  const { user } = useAuth();
  const ws = useWorkspace();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null);
  const weekStart = user.preferences?.weekStartsOn ?? 1;

  const days = useMemo(() => {
    const first = new Date(cursor);
    const offset = (first.getDay() - weekStart + 7) % 7;
    const start = new Date(first.getTime() - offset * DAY);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [cursor, weekStart]);

  const byDay = useMemo(() => {
    const map = {};
    (tasks || []).forEach((t) => {
      if (!t.dueDate) return;
      (map[key(t.dueDate)] ||= []).push(t);
    });
    return map;
  }, [tasks]);

  const milestones = useMemo(() => {
    const map = {};
    (project.milestones || []).forEach((m) => m.dueDate && (map[key(m.dueDate)] ||= []).push(m));
    return map;
  }, [project.milestones]);

  const todayKey = key(new Date());
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 7 + ((i + weekStart) % 7)).toLocaleDateString("en-US", { weekday: "short" }));
  const unscheduled = (tasks || []).filter((t) => !t.dueDate && !["done", "canceled"].includes(t.status)).length;

  const reschedule = async (task, day) => {
    const due = new Date(day);
    due.setHours(17, 0, 0, 0);
    const prev = task;
    onTaskChange({ ...task, dueDate: due.toISOString() });
    try {
      const updated = await patchTask(task, { dueDate: due.toISOString() }, { quiet: true });
      onTaskChange({ ...task, dueDate: updated.dueDate });
      ws.taskChanged();
    } catch {
      onTaskChange(prev);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col px-6 py-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[15px] font-semibold tracking-tight w-40">{cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
        <button className="icon-btn" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))} aria-label="Previous month">
          <LuChevronLeft size={16} />
        </button>
        <button className="btn btn-sm btn-secondary" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
          Today
        </button>
        <button className="icon-btn" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))} aria-label="Next month">
          <LuChevronRight size={16} />
        </button>
        {unscheduled > 0 && <span className="ml-auto text-xs text-muted">{unscheduled} open tasks have no due date</span>}
      </div>
      <div className="grid grid-cols-7 text-[11.5px] font-medium text-faint pb-1.5">
        {weekdays.map((d) => (
          <span key={d} className="px-2">
            {d}
          </span>
        ))}
      </div>
      <div className="flex-1 min-h-[520px] grid grid-cols-7 grid-rows-6 rounded-xl overflow-hidden" style={{ boxShadow: "inset 0 0 0 1px var(--color-line)", gap: 1, background: "var(--color-line)" }}>
        {days.map((d) => {
          const k = key(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const list = byDay[k] || [];
          const isToday = k === todayKey;
          const weekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div
              key={k}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOver(k);
              }}
              onDragLeave={() => setOver((o) => (o === k ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                const t = tasks.find((x) => x._id === dragId);
                setDragId(null);
                setOver(null);
                if (t && key(t.dueDate) !== k) reschedule(t, d);
              }}
              className={`relative min-h-0 flex flex-col p-1.5 transition-colors ${over === k ? "bg-accent-soft" : inMonth ? (weekend ? "bg-canvas/60" : "bg-surface") : "bg-canvas"}`}
            >
              <div className="flex items-center gap-1 mb-1 px-0.5">
                <span className={`grid place-items-center min-w-[22px] h-[22px] rounded-full text-[12px] tabular-nums ${isToday ? "bg-accent text-white font-semibold" : inMonth ? "text-ink-2" : "text-faint"}`}>
                  {d.getDate()}
                </span>
                {milestones[k]?.map((m) => (
                  <Tooltip key={m._id} label={`Milestone: ${m.name}`}>
                    <span className="flex items-center gap-1 min-w-0 text-[10.5px] font-medium text-accent truncate">
                      <LuFlag size={10} className="shrink-0" />
                      <span className="truncate">{m.name}</span>
                    </span>
                  </Tooltip>
                ))}
              </div>
              <div className="flex-1 min-h-0 overflow-hidden space-y-1">
                {list.slice(0, 3).map((t) => {
                  const movable = t.can?.fields?.includes("dueDate");
                  return (
                    <button
                      key={t._id}
                      draggable={movable}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        setDragId(t._id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOver(null);
                      }}
                      onClick={() => ws.openTask(t.ref)}
                      className={`flex items-center gap-1.5 w-full h-6 px-1.5 rounded-md text-left text-[11.5px] bg-surface hover:bg-subtle transition-all ${dragId === t._id ? "opacity-40" : ""} ${
                        t.status === "done" ? "text-faint line-through" : "text-ink-2"
                      }`}
                      style={{ boxShadow: "inset 0 0 0 1px var(--color-line)", animation: "var(--animate-pop)" }}
                    >
                      <StatusIcon status={t.status} size={11} />
                      <span className="flex-1 truncate">{t.title}</span>
                      {t.assignee && <Avatar user={t.assignee} size={14} />}
                    </button>
                  );
                })}
                {list.length > 3 && <p className="px-1.5 text-[11px] text-faint">+{list.length - 3} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
