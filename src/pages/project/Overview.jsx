// src/pages/project/Overview.jsx
import { useNavigate } from "react-router-dom";
import { LuFlag, LuArrowRight, LuBrain, LuUsers, LuActivity, LuChartColumn, LuCalendarRange } from "react-icons/lu";
import { useApi } from "../../lib/hooks";
import { useWorkspace } from "../../context/WorkspaceContext";
import { Markdown } from "../../lib/markdown";
import { Avatar } from "../../components/ui/Avatar";
import { CountUp, ProgressBar, SkeletonRows, Tooltip } from "../../components/ui/primitives";
import { StatusIcon } from "../../components/ui/icons";
import { TypeIcon, VerifiedMark } from "../../components/kb/bits";
import { STATUS, STATUSES } from "../../lib/constants";
import { dueLabel, formatDate, fullName, timeAgo } from "../../lib/format";

function Card({ title, icon: Icon, action, children, className = "" }) {
  return (
    <section className={`card p-5 ${className}`} style={{ animation: "var(--animate-rise)" }}>
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={14} className="text-muted" />}
        <h2 className="h-section">{title}</h2>
        <span className="ml-auto">{action}</span>
      </div>
      {children}
    </section>
  );
}

function Throughput({ weeks }) {
  const max = Math.max(1, ...weeks.flatMap((w) => [w.completed, w.created]));
  return (
    <div>
      <div className="flex items-end gap-3 h-36">
        {weeks.map((w, i) => (
          <Tooltip key={w.week} label={`Week of ${formatDate(new Date(new Date(w.week).getTime() - 6 * 86400000))}: ${w.completed} completed, ${w.created} created`}>
            <div className="flex-1 h-full flex items-end justify-center gap-1">
              <span className="w-full max-w-[14px] rounded-t-[4px] bg-line-strong origin-bottom" style={{ height: `${(w.created / max) * 100}%`, minHeight: 2, animation: `grow-y 700ms var(--ease-out-expo) ${i * 40}ms both` }} />
              <span className="w-full max-w-[14px] rounded-t-[4px] bg-accent origin-bottom" style={{ height: `${(w.completed / max) * 100}%`, minHeight: 2, animation: `grow-y 700ms var(--ease-out-expo) ${i * 40 + 60}ms both` }} />
            </div>
          </Tooltip>
        ))}
      </div>
      <div className="flex gap-3 mt-1.5">
        {weeks.map((w) => (
          <span key={w.week} className="flex-1 text-center text-[10.5px] text-faint tabular-nums">
            {new Date(w.week).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-accent" /> Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-line-strong" /> Created
        </span>
      </div>
    </div>
  );
}

export default function Overview({ project }) {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const { data } = useApi(`/projects/${project.key}/overview`, [ws.taskVersion]);
  const s = project.stats;
  const byStatus = s.byStatus || {};
  const total = STATUSES.reduce((n, st) => n + (byStatus[st] || 0), 0) || 1;
  const target = project.targetDate ? dueLabel(project.targetDate) : null;

  return (
    <div className="flex-1 scroll">
      <div className="max-w-[1200px] mx-auto px-6 py-6 grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4">
        <div className="space-y-4 min-w-0">
          <Card title="About this project">
            {project.description ? <Markdown text={project.description} /> : <p className="text-[13px] text-faint">No description yet.</p>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {[
                ["Total", s.total],
                ["Completed", s.done],
                ["In progress", byStatus.in_progress || 0],
                ["Overdue", s.overdue],
              ].map(([label, value], i) => (
                <div key={label} className="rounded-lg bg-canvas px-3 py-2.5">
                  <p className="text-[11.5px] text-muted">{label}</p>
                  <p className={`text-[20px] font-semibold tracking-tight ${i === 3 && value ? "text-danger" : "text-ink"}`}>
                    <CountUp value={value} />
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-muted mb-1.5">
                <span>{s.progress}% complete</span>
                {target && (
                  <span className="flex items-center gap-1">
                    <LuCalendarRange size={12} /> Target {formatDate(project.targetDate)} · {target.diff >= 0 ? `${target.diff} days left` : `${-target.diff} days past`}
                  </span>
                )}
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-subtle">
                {STATUSES.filter((st) => byStatus[st]).map((st) => (
                  <Tooltip key={st} label={`${STATUS[st].label}: ${byStatus[st]}`}>
                    <span className="h-full origin-left" style={{ width: `${(byStatus[st] / total) * 100}%`, background: STATUS[st].color, animation: "grow-x 800ms var(--ease-out-expo) both" }} />
                  </Tooltip>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
                {STATUSES.filter((st) => byStatus[st]).map((st) => (
                  <span key={st} className="flex items-center gap-1.5 text-xs text-muted">
                    <StatusIcon status={st} size={12} /> {STATUS[st].label} <span className="tabular-nums text-faint">{byStatus[st]}</span>
                  </span>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Throughput" icon={LuChartColumn}>
            {data ? <Throughput weeks={data.weeks} /> : <div className="skeleton h-36" />}
          </Card>

          <Card title="Milestones" icon={LuFlag}>
            {!data && <SkeletonRows rows={2} />}
            {data && !data.milestones.length && <p className="text-[13px] text-faint">No milestones. {project.can.update && "Add them in project settings."}</p>}
            <div className="space-y-4">
              {data?.milestones.map((m) => {
                const due = m.dueDate ? dueLabel(m.dueDate) : null;
                return (
                  <div key={m._id}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <LuFlag size={13} className={m.done || m.progress === 100 ? "text-ok" : "text-muted"} />
                      <span className="text-[13px] font-medium text-ink">{m.name}</span>
                      <span className="text-xs text-faint tabular-nums">
                        {m.done}/{m.total}
                      </span>
                      {due && <span className={`ml-auto text-xs ${due.tone === "overdue" && m.progress < 100 ? "text-danger" : "text-muted"}`}>{formatDate(m.dueDate)}</span>}
                    </div>
                    <ProgressBar value={m.progress} color={m.progress === 100 ? "var(--color-ok)" : project.color} height={5} />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-4 min-w-0">
          <Card title="Workload" icon={LuUsers}>
            {!data && <SkeletonRows rows={3} />}
            {data && !data.workload.length && <p className="text-[13px] text-faint">No open assigned work.</p>}
            <div className="space-y-3">
              {data?.workload.map((w) => {
                const max = Math.max(...data.workload.map((x) => x.open));
                return (
                  <div key={w.user._id} className="flex items-center gap-2.5">
                    <Avatar user={w.user} size={24} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center text-[12.5px]">
                        <span className="text-ink-2 truncate">{fullName(w.user)}</span>
                        <span className="ml-auto text-xs text-muted tabular-nums">
                          {w.open} open{w.overdue ? <span className="text-danger"> · {w.overdue} overdue</span> : ""}
                        </span>
                      </div>
                      <ProgressBar value={(w.open / max) * 100} height={4} className="mt-1" color={w.overdue ? "var(--color-danger)" : "var(--color-ink-2)"} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card
            title="Project knowledge"
            icon={LuBrain}
            action={
              <button className="btn btn-sm btn-ghost" onClick={() => navigate(`/kb?project=${project.key}`)}>
                All <LuArrowRight size={13} />
              </button>
            }
          >
            {!data && <SkeletonRows rows={3} />}
            {data && !data.knowledge.length && <p className="text-[13px] text-faint">Nothing captured for this project yet. Save decisions from comments and channels.</p>}
            <div className="space-y-0.5 -mx-2">
              {data?.knowledge.map((m) => (
                <button key={m._id} onClick={() => navigate(`/kb/${m._id}`)} className="flex items-start gap-2.5 w-full p-2 rounded-lg text-left hover:bg-subtle transition-colors">
                  <TypeIcon type={m.type} size={13} boxed />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-ink truncate">{m.title}</span>
                      {m.verified?.at && <VerifiedMark verified={m.verified} size={12} />}
                    </span>
                    <span className="block text-[11.5px] text-muted line-clamp-2 leading-4 mt-0.5">{m.summary}</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Activity" icon={LuActivity}>
            {!data && <SkeletonRows rows={4} />}
            <div className="space-y-0.5 -mx-2">
              {data?.activity.slice(0, 12).map((a, i) => (
                <button key={i} onClick={() => ws.openTask(`${project.key}-${a.task.number}`)} className="flex items-start gap-2.5 w-full px-2 py-1.5 rounded-lg text-left hover:bg-subtle">
                  <Avatar user={a.actor} size={20} />
                  <span className="flex-1 min-w-0 text-[12.5px] leading-[18px] text-muted">
                    <span className="font-medium text-ink-2">{a.actor?.firstName}</span>{" "}
                    {a.action === "created" ? "created" : a.action === "commented" ? "commented on" : a.action === "approved" ? "approved" : a.field === "status" ? `moved to ${STATUS[a.to]?.label}` : "updated"}{" "}
                    <span className="text-ink-2">{a.task.title}</span>
                  </span>
                  <span className="text-[11px] text-faint whitespace-nowrap">{timeAgo(a.at)}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
