// src/pages/MyTasks.jsx
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LuCircleCheck, LuSearch, LuPlus, LuX, LuChevronDown } from "react-icons/lu";
import PageHeader from "../components/layout/PageHeader";
import TaskRow from "../components/task/TaskRow";
import { EmptyState, Segmented, SkeletonRows, ProjectMark } from "../components/ui/primitives";
import { useApi, usePersistentState } from "../lib/hooks";
import { daysBetween } from "../lib/format";
import { PRIORITY } from "../lib/constants";
import { useWorkspace } from "../context/WorkspaceContext";

const BUCKETS = ["Overdue", "Today", "Tomorrow", "This week", "Later", "No due date"];

function bucketOf(t) {
  if (!t.dueDate) return "No due date";
  const d = daysBetween(new Date(), t.dueDate);
  if (d < 0) return "Overdue";
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d < 7) return "This week";
  return "Later";
}

export default function MyTasks() {
  const ws = useWorkspace();
  const [params] = useSearchParams();
  const [view, setView] = useState(params.get("status") === "done" ? "done" : params.get("due") === "overdue" ? "active" : "active");
  const [groupBy, setGroupBy] = usePersistentState("catalyst.mytasks.group", "due");
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const { data, loading, setData } = useApi("/tasks?assignee=me", [ws.taskVersion]);

  const filtered = useMemo(() => {
    let list = data || [];
    if (view === "active") list = list.filter((t) => !["done", "canceled", "in_review"].includes(t.status));
    if (view === "review") list = list.filter((t) => t.status === "in_review");
    if (view === "done") list = list.filter((t) => t.status === "done");
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((t) => `${t.ref} ${t.title} ${t.labels.join(" ")}`.toLowerCase().includes(s));
    }
    return [...list].sort(
      (a, b) =>
        (a.dueDate ? new Date(a.dueDate) : Infinity) - (b.dueDate ? new Date(b.dueDate) : Infinity) ||
        PRIORITY[b.priority].rank - PRIORITY[a.priority].rank
    );
  }, [data, view, q]);

  const groups = useMemo(() => {
    if (view === "done") return [["Completed", [...filtered].sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))]];
    if (groupBy === "project") {
      const map = new Map();
      filtered.forEach((t) => map.set(t.project.key, [...(map.get(t.project.key) || []), t]));
      return [...map.entries()];
    }
    const map = new Map(BUCKETS.map((b) => [b, []]));
    filtered.forEach((t) => map.get(bucketOf(t)).push(t));
    return [...map.entries()].filter(([, l]) => l.length);
  }, [filtered, groupBy, view]);

  const counts = useMemo(() => {
    const list = data || [];
    return {
      active: list.filter((t) => !["done", "canceled", "in_review"].includes(t.status)).length,
      review: list.filter((t) => t.status === "in_review").length,
      done: list.filter((t) => t.status === "done").length,
    };
  }, [data]);

  const replace = (t) => setData((list) => list.map((x) => (x._id === t._id ? { ...x, ...t } : x)));

  return (
    <>
      <PageHeader
        icon={<LuCircleCheck size={15} />}
        title="My tasks"
        subtitle="Everything assigned to you, across projects"
        actions={
          ws.creatableProjects.length > 0 && (
            <button className="btn btn-primary btn-sm" onClick={() => ws.openCreateTask({ assignee: undefined })}>
              <LuPlus size={14} /> New task
            </button>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-2 pb-3">
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: "active", label: "Active", count: counts.active },
              { value: "review", label: "In review", count: counts.review },
              { value: "done", label: "Done", count: counts.done },
              { value: "all", label: "All" },
            ]}
          />
          {view !== "done" && (
            <Segmented
              size="sm"
              value={groupBy}
              onChange={setGroupBy}
              options={[
                { value: "due", label: "By due date" },
                { value: "project", label: "By project" },
              ]}
            />
          )}
          <label className="field h-8 w-60 ml-auto">
            <LuSearch size={14} className="text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter tasks" />
            {q && (
              <button onClick={() => setQ("")} className="text-faint hover:text-ink">
                <LuX size={13} />
              </button>
            )}
          </label>
        </div>
      </PageHeader>

      <div className="flex-1 scroll">
        <div className="max-w-[1080px] mx-auto px-6 py-5">
          {loading && !data && <SkeletonRows rows={8} />}
          {data && !filtered.length && (
            <EmptyState icon={LuCircleCheck} title={q ? "No matching tasks" : view === "done" ? "Nothing completed yet" : "No tasks here"}>
              {q ? "Try a different search." : view === "active" ? "When someone assigns you work, it shows up here." : "Tasks you finish show up here."}
            </EmptyState>
          )}
          {groups.map(([name, list]) => {
            const project = groupBy === "project" && view !== "done" ? ws.projectByKey(name) : null;
            const isCollapsed = collapsed[name];
            return (
              <section key={name} className="mb-5">
                <button onClick={() => setCollapsed((c) => ({ ...c, [name]: !c[name] }))} className="flex items-center gap-2 h-8 px-2 -mx-1 mb-0.5 rounded-md hover:bg-subtle w-full text-left">
                  <LuChevronDown size={13} className={`text-faint transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                  {project && <ProjectMark project={project} size={16} />}
                  <span className={`text-[13px] font-semibold ${name === "Overdue" ? "text-danger" : "text-ink"}`}>{project?.name || name}</span>
                  <span className="text-xs text-faint tabular-nums">{list.length}</span>
                </button>
                {!isCollapsed && (
                  <div className="stagger">
                    {list.map((t, i) => (
                      <TaskRow key={t._id} task={t} index={i} showProject={groupBy !== "project" || view === "done"} showAssignee={false} onChange={replace} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
