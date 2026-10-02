// src/pages/Home.jsx
import { useNavigate } from "react-router-dom";
import {
  LuPlus,
  LuSparkles,
  LuArrowRight,
  LuCircleCheck,
  LuCalendarClock,
  LuTriangleAlert,
  LuTrendingUp,
  LuShieldCheck,
  LuBrain,
  LuActivity,
  LuSun,
  LuCoffee,
} from "react-icons/lu";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useApi } from "../lib/hooks";
import { greeting, timeAgo, fullName, plural } from "../lib/format";
import { STATUS } from "../lib/constants";
import TaskRow from "../components/task/TaskRow";
import { Avatar } from "../components/ui/Avatar";
import { CountUp, EmptyState, ProgressBar, ProjectMark, SkeletonRows, Tooltip, Kbd } from "../components/ui/primitives";
import { TypeIcon, VerifiedMark } from "../components/kb/bits";

function Stat({ icon: Icon, label, value, tone = "default", footer, onClick, index }) {
  const tones = {
    default: "text-ink",
    danger: value > 0 ? "text-danger" : "text-ink",
    warn: value > 0 ? "text-warn" : "text-ink",
    ok: "text-ink",
  };
  return (
    <button onClick={onClick} className="card card-hover text-left p-4 flex flex-col gap-3 min-h-[112px]" style={{ animation: "var(--animate-rise)", animationDelay: `${index * 50}ms` }}>
      <span className="flex items-center gap-2 text-[12.5px] text-muted">
        <Icon size={14} className={tone === "danger" && value > 0 ? "text-danger" : tone === "warn" && value > 0 ? "text-warn" : "text-faint"} />
        {label}
      </span>
      <span className={`text-[28px] leading-none font-semibold tracking-tight ${tones[tone]}`}>
        <CountUp value={value} />
      </span>
      {footer}
    </button>
  );
}

function Sparkline({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <span className="flex items-end gap-[3px] h-6">
      {data.map((d, i) => (
        <Tooltip key={d.day} label={`${d.count} done · ${new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}>
          <span
            className={`w-[5px] rounded-sm origin-bottom ${d.count ? "bg-accent" : "bg-line"}`}
            style={{ height: `${Math.max(12, (d.count / max) * 100)}%`, animation: `grow-y 600ms var(--ease-out-expo) ${i * 25}ms both` }}
          />
        </Tooltip>
      ))}
    </span>
  );
}

function Section({ title, icon: Icon, count, action, children }) {
  return (
    <section className="card p-4 pb-3">
      <div className="flex items-center gap-2 mb-2 px-1">
        {Icon && <Icon size={14} className="text-muted" />}
        <h2 className="h-section">{title}</h2>
        {count != null && <span className="text-xs text-faint tabular-nums">{count}</span>}
        <span className="ml-auto">{action}</span>
      </div>
      {children}
    </section>
  );
}

const ACTION_TEXT = (a) => {
  if (a.action === "created") return "created";
  if (a.action === "commented") return "commented on";
  if (a.action === "approved") return "approved";
  if (a.action === "rejected") return "requested changes on";
  if (a.action === "picked_up") return "picked up";
  if (a.field === "status") return `moved to ${STATUS[a.to]?.label || a.to}`;
  if (a.field === "assignee") return "reassigned";
  return "updated";
};

export default function Home() {
  const { user } = useAuth();
  const ws = useWorkspace();
  const navigate = useNavigate();
  const { data, loading, setData } = useApi("/workspace/home", [ws.taskVersion]);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const c = data?.counts;
  const replaceTask = (list) => (t) => setData((d) => ({ ...d, [list]: d[list].map((x) => (x._id === t._id ? { ...x, ...t } : x)) }));

  const focusEmpty = data && !data.focus.length && !data.upcoming.length && !data.inProgress.length;

  return (
    <div className="flex-1 scroll">
      <div className="max-w-[1180px] mx-auto px-6 lg:px-10 py-8">
        {/* Greeting */}
        <div className="flex flex-wrap items-end gap-4" style={{ animation: "var(--animate-enter)" }}>
          <div className="flex-1 min-w-[260px]">
            <p className="text-[13px] text-muted flex items-center gap-1.5">
              <LuSun size={13} /> {today}
            </p>
            <h1 className="h-display text-[26px] mt-1">
              {greeting()}, {user.firstName}
            </h1>
            <p className="text-[14px] text-muted mt-1">
              {c
                ? c.overdue + c.dueToday > 0
                  ? `You have ${plural(c.overdue + c.dueToday, "task")} that need attention today${c.approvals ? ` and ${plural(c.approvals, "review")} waiting.` : "."}`
                  : c.approvals
                    ? `Nothing due today. ${plural(c.approvals, "review")} waiting for you.`
                    : "Nothing urgent. A good day to make progress."
                : " "}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary" onClick={() => navigate("/kb")}>
              <LuSparkles size={14} className="text-accent" /> Ask the Knowledge Base
            </button>
            {ws.creatableProjects.length > 0 && (
              <button className="btn btn-primary" onClick={() => ws.openCreateTask({})}>
                <LuPlus size={15} /> New task <Kbd keys={["C"]} className="ml-0.5 [&_.kbd]:bg-white/10 [&_.kbd]:text-white/70 [&_.kbd]:shadow-none" />
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-7">
          <Stat index={0} icon={LuCircleCheck} label="Open tasks" value={c?.open || 0} onClick={() => navigate("/my-tasks")} footer={<span className="text-xs text-faint">{c?.inReview ? `${c.inReview} in review` : "Assigned to you"}</span>} />
          <Stat index={1} icon={LuCalendarClock} label="Due today" value={c?.dueToday || 0} tone="warn" onClick={() => navigate("/my-tasks")} footer={<span className="text-xs text-faint">{c?.upcoming || 0} more this week</span>} />
          <Stat index={2} icon={LuTriangleAlert} label="Overdue" value={c?.overdue || 0} tone="danger" onClick={() => navigate("/my-tasks?due=overdue")} footer={<span className="text-xs text-faint">{c?.overdue ? "Reschedule or finish" : "You're on track"}</span>} />
          <Stat index={3} icon={LuTrendingUp} label="Done this week" value={c?.completedWeek || 0} tone="ok" onClick={() => navigate("/my-tasks?status=done")} footer={data ? <Sparkline data={data.streak} /> : <span className="h-6" />} />
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-4 mt-4">
          {/* My work */}
          <div className="space-y-4 min-w-0">
            {loading && !data && (
              <section className="card p-5">
                <SkeletonRows rows={6} />
              </section>
            )}
            {focusEmpty && (
              <section className="card">
                <EmptyState icon={LuCoffee} title="You're all caught up" action={ws.creatableProjects.length ? <button className="btn btn-secondary" onClick={() => ws.openCreateTask({})}><LuPlus size={14} /> Create a task</button> : null}>
                  Nothing assigned to you is due. Pick something up from a project board or plan what's next.
                </EmptyState>
              </section>
            )}
            {data?.focus.length > 0 && (
              <Section title="Focus" icon={LuTriangleAlert} count={data.focus.length}>
                <div className="stagger">
                  {data.focus.map((t, i) => (
                    <TaskRow key={t._id} task={t} index={i} showProject showAssignee={false} onChange={replaceTask("focus")} />
                  ))}
                </div>
              </Section>
            )}
            {data?.inProgress.length > 0 && (
              <Section title="In progress" icon={LuActivity} count={data.inProgress.length}>
                <div className="stagger">
                  {data.inProgress.map((t, i) => (
                    <TaskRow key={t._id} task={t} index={i} showProject showAssignee={false} onChange={replaceTask("inProgress")} />
                  ))}
                </div>
              </Section>
            )}
            {data?.upcoming.length > 0 && (
              <Section
                title="Coming up this week"
                icon={LuCalendarClock}
                count={data.upcoming.length}
                action={
                  <button className="btn btn-sm btn-ghost" onClick={() => navigate("/my-tasks")}>
                    All my tasks <LuArrowRight size={13} />
                  </button>
                }
              >
                <div className="stagger">
                  {data.upcoming.map((t, i) => (
                    <TaskRow key={t._id} task={t} index={i} showProject showAssignee={false} onChange={replaceTask("upcoming")} />
                  ))}
                </div>
              </Section>
            )}

            {/* Projects */}
            <section>
              <div className="flex items-center gap-2 mb-2.5 mt-2 px-1">
                <h2 className="h-section">Projects</h2>
                <button className="btn btn-sm btn-ghost ml-auto" onClick={() => navigate("/projects")}>
                  View all <LuArrowRight size={13} />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 stagger">
                {ws.projects
                  .filter((p) => p.status !== "archived")
                  .slice(0, 4)
                  .map((p, i) => (
                    <button key={p._id} onClick={() => navigate(`/projects/${p.key}`)} className="card card-hover p-4 text-left" style={{ "--i": i }}>
                      <div className="flex items-center gap-2.5">
                        <ProjectMark project={p} size={22} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13.5px] font-medium text-ink truncate">{p.name}</span>
                          <span className="block text-[11.5px] text-muted">
                            {p.stats.done}/{p.stats.total} done{p.stats.overdue ? ` · ${p.stats.overdue} overdue` : ""}
                          </span>
                        </span>
                        <span className="text-[13px] font-semibold tabular-nums text-ink-2">{p.stats.progress}%</span>
                      </div>
                      <ProgressBar value={p.stats.progress} color={p.color} className="mt-3" height={5} />
                    </button>
                  ))}
              </div>
            </section>
          </div>

          {/* Right rail */}
          <div className="space-y-4 min-w-0">
            {data?.approvals.length > 0 && (
              <Section
                title="Waiting for your review"
                icon={LuShieldCheck}
                count={c.approvals}
                action={
                  <button className="btn btn-sm btn-ghost" onClick={() => navigate("/approvals")}>
                    Review <LuArrowRight size={13} />
                  </button>
                }
              >
                <div className="space-y-0.5 stagger">
                  {data.approvals.map((t, i) => (
                    <button key={t._id} style={{ "--i": i }} onClick={() => ws.openTask(t.ref)} className="flex items-center gap-2.5 w-full p-2 rounded-lg text-left hover:bg-subtle transition-colors">
                      <Avatar user={t.approval?.requestedBy} size={24} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] text-ink truncate">{t.title}</span>
                        <span className="block text-[11.5px] text-muted">
                          <span className="mono">{t.ref}</span> · {fullName(t.approval?.requestedBy)} · {timeAgo(t.approval?.requestedAt)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </Section>
            )}

            <Section
              title="Knowledge for your work"
              icon={LuBrain}
              action={
                <button className="btn btn-sm btn-ghost" onClick={() => navigate("/kb")}>
                  Open <LuArrowRight size={13} />
                </button>
              }
            >
              {!data && <SkeletonRows rows={3} />}
              {data && (
                <div className="space-y-0.5 stagger">
                  {(data.forYou.length ? data.forYou : data.knowledge).slice(0, 5).map((m, i) => (
                    <button key={m._id} style={{ "--i": i }} onClick={() => navigate(`/kb/${m._id}`)} className="flex items-start gap-2.5 w-full p-2 rounded-lg text-left hover:bg-subtle transition-colors">
                      <TypeIcon type={m.type} size={13} boxed />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium text-ink truncate">{m.title}</span>
                          {m.verified && <VerifiedMark verified={{}} size={12} />}
                        </span>
                        <span className="block text-[11.5px] text-muted line-clamp-2 leading-4 mt-0.5">{m.summary}</span>
                      </span>
                    </button>
                  ))}
                  {data.forYou.length > 0 && <p className="px-2 pt-1 text-[11px] text-faint">Matched to your open tasks by the Knowledge Base</p>}
                </div>
              )}
            </Section>

            <Section title="Recent activity" icon={LuActivity}>
              {!data && <SkeletonRows rows={4} />}
              <div className="stagger">
                {data?.activity.map((a, i) => (
                  <button key={i} style={{ "--i": i }} onClick={() => ws.openTask(a.task.ref)} className="flex items-start gap-2.5 w-full px-2 py-1.5 rounded-lg text-left hover:bg-subtle transition-colors">
                    <Avatar user={a.actor} size={20} />
                    <span className="flex-1 min-w-0 text-[12.5px] leading-[18px] text-muted">
                      <span className="font-medium text-ink-2">{a.actor.firstName}</span> {ACTION_TEXT(a)} <span className="text-ink-2">{a.task.title}</span>
                    </span>
                    <span className="text-[11px] text-faint whitespace-nowrap">{timeAgo(a.at)}</span>
                  </button>
                ))}
                {data && !data.activity.length && <p className="px-2 text-xs text-faint">No recent activity.</p>}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
