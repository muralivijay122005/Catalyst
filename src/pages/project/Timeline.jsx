// src/pages/project/Timeline.jsx
// Gantt-style timeline: bars run from start to due date, with milestones and a today marker.
import { useMemo, useRef, useEffect, useState } from "react";
import { LuFlag, LuChartGantt } from "react-icons/lu";
import { useWorkspace } from "../../context/WorkspaceContext";
import { StatusIcon } from "../../components/ui/icons";
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState, Segmented, Tooltip } from "../../components/ui/primitives";
import { STATUS } from "../../lib/constants";
import { formatDate, startOfDay, fullName } from "../../lib/format";

const DAY = 86400000;

export default function Timeline({ project, tasks }) {
  const ws = useWorkspace();
  const [zoom, setZoom] = useState("week");
  const scroller = useRef(null);
  const dayW = zoom === "day" ? 44 : zoom === "week" ? 22 : 9;

  const rows = useMemo(
    () =>
      (tasks || [])
        .filter((t) => t.dueDate && t.status !== "canceled")
        .map((t) => {
          const end = startOfDay(t.dueDate).getTime();
          const start = t.startDate ? Math.min(startOfDay(t.startDate).getTime(), end) : end - Math.max(1, (t.estimate || 2) - 1) * DAY;
          return { t, start, end };
        })
        .sort((a, b) => a.start - b.start),
    [tasks]
  );

  const range = useMemo(() => {
    const today = startOfDay().getTime();
    const times = [today, ...rows.flatMap((r) => [r.start, r.end]), ...(project.milestones || []).filter((m) => m.dueDate).map((m) => startOfDay(m.dueDate).getTime())];
    const min = Math.min(...times) - 7 * DAY;
    const max = Math.max(...times) + 14 * DAY;
    return { min, days: Math.round((max - min) / DAY) };
  }, [rows, project.milestones]);

  const x = (time) => ((time - range.min) / DAY) * dayW;
  const todayX = x(startOfDay().getTime());

  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = Math.max(0, todayX - 240);
  }, [todayX, zoom]);

  if (tasks && !rows.length) {
    return (
      <EmptyState icon={LuChartGantt} title="Nothing to plot yet">
        Give tasks a due date (and optionally a start date) to see them on the timeline.
      </EmptyState>
    );
  }

  const months = [];
  for (let i = 0; i < range.days; i++) {
    const d = new Date(range.min + i * DAY);
    if (d.getDate() === 1 || i === 0) months.push({ i, label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) });
  }
  const width = range.days * dayW;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center gap-2 px-6 py-2.5">
        <Segmented
          size="sm"
          value={zoom}
          onChange={setZoom}
          options={[
            { value: "day", label: "Days" },
            { value: "week", label: "Weeks" },
            { value: "month", label: "Months" },
          ]}
        />
        <button className="btn btn-sm btn-ghost" onClick={() => (scroller.current.scrollLeft = Math.max(0, todayX - 240))}>
          Today
        </button>
      </div>
      <div ref={scroller} className="flex-1 min-h-0 scroll border-t border-line">
        <div className="flex" style={{ width: width + 280, minHeight: "100%" }}>
        {/* Task names (sticky while scrolling sideways) */}
        <div className="w-[280px] shrink-0 border-r border-line bg-surface sticky left-0 z-[3]">
          <div className="sticky top-0 z-[2] h-12 border-b border-line bg-surface flex items-end px-4 pb-1.5 text-[11.5px] font-medium text-faint">Task</div>
          {rows.map(({ t }) => (
            <button key={t._id} onClick={() => ws.openTask(t.ref)} className="flex items-center gap-2 w-full h-10 px-4 text-left hover:bg-subtle transition-colors">
              <StatusIcon status={t.status} size={13} />
              <span className="mono text-[11px] text-faint w-12 shrink-0">{t.ref}</span>
              <span className="flex-1 truncate text-[12.5px] text-ink-2">{t.title}</span>
            </button>
          ))}
        </div>
        {/* Chart */}
        <div className="flex-1">
          <div className="relative" style={{ width, minHeight: "100%" }}>
            <div className="sticky top-0 z-[2] h-12 bg-surface border-b border-line">
              {months.map((m) => (
                <span key={m.i} className="absolute top-1.5 text-[11.5px] font-medium text-ink-2 pl-2 border-l border-line" style={{ left: m.i * dayW }}>
                  {m.label}
                </span>
              ))}
              {zoom !== "month" &&
                Array.from({ length: range.days }, (_, i) => {
                  const d = new Date(range.min + i * DAY);
                  if (zoom === "week" && d.getDay() !== 1) return null;
                  return (
                    <span key={i} className="absolute bottom-1.5 text-[10.5px] text-faint tabular-nums" style={{ left: i * dayW + 3 }}>
                      {d.getDate()}
                    </span>
                  );
                })}
            </div>
            {/* weekend shading */}
            {zoom !== "month" &&
              Array.from({ length: range.days }, (_, i) => {
                const d = new Date(range.min + i * DAY);
                return d.getDay() === 0 || d.getDay() === 6 ? <div key={i} className="absolute top-12 bottom-0 bg-canvas" style={{ left: i * dayW, width: dayW }} /> : null;
              })}
            {/* today */}
            <div className="absolute top-12 bottom-0 w-px bg-accent z-[1]" style={{ left: todayX }}>
              <span className="absolute -top-1 -left-[3px] size-[7px] rounded-full bg-accent" style={{ animation: "pulse-ring 2s ease-out infinite" }} />
            </div>
            {/* milestones */}
            {(project.milestones || [])
              .filter((m) => m.dueDate)
              .map((m) => (
                <Tooltip key={m._id} label={`${m.name} · ${formatDate(m.dueDate)}`}>
                  <div className="absolute top-12 bottom-0 z-[1] border-l border-dashed border-ink/25" style={{ left: x(startOfDay(m.dueDate).getTime()) + dayW / 2 }}>
                    <span className="absolute top-1 -translate-x-1/2 flex items-center gap-1 px-1.5 h-5 rounded-md bg-ink text-white text-[10.5px] font-medium whitespace-nowrap">
                      <LuFlag size={10} /> {m.name}
                    </span>
                  </div>
                </Tooltip>
              ))}
            {/* bars */}
            <div className="relative pt-0">
              {rows.map(({ t, start, end }, i) => {
                const left = x(start);
                const w = Math.max(dayW, x(end) - left + dayW);
                const overdue = end < startOfDay().getTime() && t.status !== "done";
                const color = t.status === "done" ? "#a1a1aa" : overdue ? "#dc2626" : project.color;
                return (
                  <div key={t._id} className="relative h-10">
                    <Tooltip label={`${t.title} · ${formatDate(start)} → ${formatDate(end)} · ${STATUS[t.status].label}${t.assignee ? ` · ${fullName(t.assignee)}` : ""}`}>
                      <button
                        onClick={() => ws.openTask(t.ref)}
                        className="absolute top-2 h-6 rounded-md flex items-center gap-1.5 px-1.5 text-[11px] font-medium text-white overflow-hidden origin-left transition-[filter] hover:brightness-110"
                        style={{ left, width: w, background: color, animation: `grow-x 600ms var(--ease-out-expo) ${Math.min(i, 20) * 20}ms both`, boxShadow: "0 1px 2px rgb(0 0 0 / 0.15)" }}
                      >
                        {t.assignee && <Avatar user={t.assignee} size={16} ring />}
                        {w > 80 && <span className="truncate">{t.title}</span>}
                      </button>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
