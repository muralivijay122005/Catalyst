// src/pages/project/Project.jsx
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  LuLayoutDashboard,
  LuKanban,
  LuList,
  LuCalendar,
  LuChartGantt,
  LuSettings,
  LuPlus,
  LuSearch,
  LuX,
  LuStar,
  LuShieldCheck,
  LuEye,
  LuFilter,
  LuUserPlus,
} from "react-icons/lu";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useApi } from "../../lib/hooks";
import { isTypingTarget } from "../../lib/hooks";
import { overlayOpen } from "../../lib/escape";
import { AvatarStack, Avatar } from "../../components/ui/Avatar";
import { ProjectMark, Tooltip, ProgressRing } from "../../components/ui/primitives";
import Popover, { OptionList } from "../../components/ui/Popover";
import { PriorityIcon } from "../../components/ui/icons";
import { contributors } from "../../lib/people";
import { PRIORITY, PRIORITIES, PROJECT_ROLE } from "../../lib/constants";
import { fullName } from "../../lib/format";
import Board from "./Board";
import ListView from "./ListView";
import CalendarView from "./CalendarView";
import Timeline from "./Timeline";
import Overview from "./Overview";
import ProjectSettings from "./ProjectSettings";
import Modal from "../../components/ui/Modal";
import ProjectMembers from "../../components/project/ProjectMembers";

const EMPTY_FILTERS = { q: "", assignee: null, priority: null, label: null };

const VIEWS = [
  { id: "overview", label: "Overview", icon: LuLayoutDashboard },
  { id: "board", label: "Board", icon: LuKanban },
  { id: "list", label: "List", icon: LuList },
  { id: "calendar", label: "Calendar", icon: LuCalendar },
  { id: "timeline", label: "Timeline", icon: LuChartGantt },
];

function FilterBar({ project, filters, setFilters, total, shown }) {
  const people = contributors(project);
  const active = filters.assignee || filters.priority || filters.label || filters.q;
  const pill = (label, onClear) => (
    <span className="chip chip-accent h-7 pl-2.5 pr-1 gap-1.5" style={{ animation: "var(--animate-pop)" }}>
      {label}
      <button onClick={onClear} className="grid place-items-center size-4 rounded hover:bg-accent/15" aria-label="Clear filter">
        <LuX size={11} />
      </button>
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-2 py-2.5">
      <label className="field h-8 w-56">
        <LuSearch size={14} className="text-faint" />
        <input value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} placeholder="Filter by title or label" />
      </label>
      <Popover
        width={220}
        content={({ close }) => (
          <div className="menu">
            <p className="menu-label">Assignee</p>
            {[{ _id: "me", label: "Me" }, { _id: "none", label: "Unassigned" }, ...people].map((u) => (
              <button key={u._id} className="menu-item" onClick={() => { setFilters((f) => ({ ...f, assignee: u._id })); close(); }}>
                {u.firstName ? <Avatar user={u} size={16} /> : <span className="w-4" />}
                {u.label || fullName(u)}
              </button>
            ))}
            <div className="menu-sep" />
            <p className="menu-label">Priority</p>
            {PRIORITIES.map((p) => (
              <button key={p} className="menu-item" onClick={() => { setFilters((f) => ({ ...f, priority: p })); close(); }}>
                <PriorityIcon priority={p} /> {PRIORITY[p].label}
              </button>
            ))}
            {project.labels?.length > 0 && (
              <>
                <div className="menu-sep" />
                <p className="menu-label">Label</p>
                {project.labels.map((l) => (
                  <button key={l._id} className="menu-item" onClick={() => { setFilters((f) => ({ ...f, label: l.name })); close(); }}>
                    <span className="dot" style={{ background: l.color }} /> {l.name}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      >
        {({ ref, toggle, open }) => (
          <button ref={ref} onClick={toggle} className={`btn btn-sm btn-ghost ${open ? "bg-subtle text-ink" : ""}`}>
            <LuFilter size={13} /> Filter
          </button>
        )}
      </Popover>
      {filters.assignee &&
        pill(
          filters.assignee === "me" ? "Assigned to me" : filters.assignee === "none" ? "Unassigned" : fullName(people.find((p) => p._id === filters.assignee)),
          () => setFilters((f) => ({ ...f, assignee: null }))
        )}
      {filters.priority && pill(PRIORITY[filters.priority].label, () => setFilters((f) => ({ ...f, priority: null })))}
      {filters.label && pill(filters.label, () => setFilters((f) => ({ ...f, label: null })))}
      {active && (
        <span className="text-xs text-faint tabular-nums">
          {shown} of {total}
        </span>
      )}
    </div>
  );
}

export default function Project() {
  const { key, view: viewParam } = useParams();
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const ws = useWorkspace();
  const project = ws.projectByKey(key?.toUpperCase());
  const view = viewParam || user.preferences?.defaultProjectView || "board";
  // Filters belong to one project; switching projects starts fresh
  const [filterState, setFilterState] = useState({ key, ...EMPTY_FILTERS });
  const [membersOpen, setMembersOpen] = useState(false);
  const filters = useMemo(() => (filterState.key === key ? filterState : { key, ...EMPTY_FILTERS }), [filterState, key]);
  const setFilters = (update) => setFilterState({ key, ...(typeof update === "function" ? update(filters) : update) });
  const { data: tasks, setData: setTasks, loading } = useApi(project ? `/tasks?project=${project.key}` : null, [ws.taskVersion]);


  // 1–5 switch views
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || overlayOpen()) return;
      const i = Number(e.key) - 1;
      if (VIEWS[i]) navigate(`/projects/${key}/${VIEWS[i].id}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key, navigate]);

  const filtered = useMemo(() => {
    if (!tasks) return null;
    const q = filters.q.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !`${t.ref} ${t.title} ${t.labels.join(" ")}`.toLowerCase().includes(q)) return false;
      if (filters.assignee === "me" && t.assignee?._id !== user._id) return false;
      if (filters.assignee === "none" && t.assignee) return false;
      if (filters.assignee && !["me", "none"].includes(filters.assignee) && t.assignee?._id !== filters.assignee) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.label && !t.labels.includes(filters.label)) return false;
      return true;
    });
  }, [tasks, filters, user._id]);

  if (!project) {
    if (ws.projectsLoaded) return <Navigate to="/projects" replace />;
    return (
      <div className="p-6 space-y-3">
        <span className="skeleton block h-6 w-56" />
        <span className="skeleton block h-4 w-80" />
      </div>
    );
  }

  const can = project.can;
  const members = [project.owner, ...project.members.map((m) => m.user)].filter((u, i, a) => u && a.findIndex((x) => x?._id === u._id) === i);
  const isFav = user.favorites?.includes(project._id);
  const showSettings = can.update || can.manageMembers;
  const tabs = showSettings ? [...VIEWS, { id: "settings", label: "Settings", icon: LuSettings }] : VIEWS;
  const showFilters = ["board", "list", "calendar", "timeline"].includes(view);

  const replaceTask = (t) => setTasks((list) => list.map((x) => (x._id === t._id ? { ...x, ...t } : x)));

  return (
    <>
      <header className="shrink-0 px-6 border-b border-line">
        <div className="flex items-center gap-3 min-h-14 pt-2">
          <ProjectMark project={project} size={28} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="h-page truncate">{project.name}</h1>
              <button
                onClick={() => updateProfile({ favorites: isFav ? user.favorites.filter((f) => f !== project._id) : [...(user.favorites || []), project._id] })}
                className={`icon-btn size-6 ${isFav ? "text-amber-500" : ""}`}
                aria-label="Toggle favorite"
              >
                <LuStar size={14} className={isFav ? "fill-current" : ""} />
              </button>
              {project.status !== "active" && <span className="chip capitalize">{project.status}</span>}
            </div>
            <p className="text-xs text-muted flex items-center gap-2 -mt-0.5">
              <span className="mono">{project.key}</span>
              <span className="text-faint">·</span>
              <span className="flex items-center gap-1">
                <ProgressRing value={project.stats.progress} size={11} stroke={2} color={project.color} />
                {project.stats.progress}% complete
              </span>
              {project.requireApproval && (
                <>
                  <span className="text-faint">·</span>
                  <Tooltip label="Members' finished work goes to review before it counts as done">
                    <span className="flex items-center gap-1">
                      <LuShieldCheck size={12} /> Approval required
                    </span>
                  </Tooltip>
                </>
              )}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Tooltip label={`Your role: ${PROJECT_ROLE[can.role]}${can.member ? "" : " (workspace oversight)"}`}>
              <span className="chip">
                {can.role === "viewer" && <LuEye size={11} />}
                {PROJECT_ROLE[can.role]}
              </span>
            </Tooltip>
            <Tooltip label={can.manageMembers ? "Manage members" : "View members"}>
              <button aria-label="Project members" onClick={() => setMembersOpen(true)} className="hidden md:flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-full hover:bg-subtle transition-colors">
                <AvatarStack users={members} size={24} max={4} />
                <span className="text-xs font-medium text-ink-2 tabular-nums">{members.length}</span>
                {can.manageMembers && <LuUserPlus size={13} className="text-muted" />}
              </button>
            </Tooltip>
            {can.createTask && (
              <button className="btn btn-primary btn-sm" onClick={() => ws.openCreateTask({ projectKey: project.key })}>
                <LuPlus size={14} /> New task
              </button>
            )}
          </div>
        </div>
        <nav className="flex items-center gap-5 -mb-px mt-1 overflow-x-auto no-scrollbar">
          {tabs.map((t, i) => (
            <Tooltip key={t.id} label={i < 5 ? t.label : null} keys={i < 5 ? [String(i + 1)] : undefined}>
              <button className="tab" data-active={view === t.id} onClick={() => navigate(`/projects/${key}/${t.id}`)}>
                <t.icon size={14} />
                {t.label}
              </button>
            </Tooltip>
          ))}
        </nav>
      </header>

      {showFilters && (
        <div className="shrink-0 px-6 border-b border-line">
          <FilterBar project={project} filters={filters} setFilters={setFilters} total={tasks?.length || 0} shown={filtered?.length || 0} />
        </div>
      )}

      <div key={view} className="flex-1 min-h-0 flex flex-col" style={{ animation: "var(--animate-enter)" }}>
        {view === "overview" && <Overview project={project} tasks={tasks} />}
        {view === "board" && <Board project={project} tasks={filtered} loading={loading} onTaskChange={replaceTask} setTasks={setTasks} />}
        {view === "list" && <ListView project={project} tasks={filtered} loading={loading} onTaskChange={replaceTask} />}
        {view === "calendar" && <CalendarView project={project} tasks={filtered} onTaskChange={replaceTask} />}
        {view === "timeline" && <Timeline project={project} tasks={filtered} />}
        {view === "settings" && (showSettings ? <ProjectSettings project={project} /> : <Navigate to={`/projects/${key}/overview`} replace />)}
      </div>
      {membersOpen && (
        <Modal
          size="lg"
          title={`${project.name} members`}
          description={can.manageMembers ? "Add people, change project roles or remove access." : "People on this project. Only the owner and managers can make changes."}
          onClose={() => setMembersOpen(false)}
        >
          <ProjectMembers project={project} compact onLeft={() => setMembersOpen(false)} />
        </Modal>
      )}
    </>
  );
}
