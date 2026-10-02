// src/pages/project/ListView.jsx
import { useMemo, useState } from "react";
import { LuChevronDown, LuPlus, LuListTodo } from "react-icons/lu";
import TaskRow from "../../components/task/TaskRow";
import { StatusIcon } from "../../components/ui/icons";
import { EmptyState, Segmented, SkeletonRows, Tooltip } from "../../components/ui/primitives";
import { STATUSES, STATUS, PRIORITY } from "../../lib/constants";
import { usePersistentState } from "../../lib/hooks";
import { useWorkspace } from "../../context/WorkspaceContext";

const SORTS = {
  manual: (a, b) => a.order - b.order || b.number - a.number,
  priority: (a, b) => PRIORITY[b.priority].rank - PRIORITY[a.priority].rank || a.number - b.number,
  due: (a, b) => (a.dueDate ? new Date(a.dueDate) : Infinity) - (b.dueDate ? new Date(b.dueDate) : Infinity),
  updated: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
};

export default function ListView({ project, tasks, loading, onTaskChange }) {
  const ws = useWorkspace();
  const [sort, setSort] = usePersistentState("catalyst.list.sort", "priority");
  const [collapsed, setCollapsed] = useState({ canceled: true });

  const groups = useMemo(
    () =>
      STATUSES.map((s) => [s, (tasks || []).filter((t) => t.status === s).sort(SORTS[sort])]).filter(([s, list]) => list.length || ["todo", "in_progress"].includes(s)),
    [tasks, sort]
  );

  return (
    <div className="flex-1 scroll">
      <div className="px-6 py-4 max-w-[1200px]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-muted">Sort by</span>
          <Segmented
            size="sm"
            value={sort}
            onChange={setSort}
            options={[
              { value: "priority", label: "Priority" },
              { value: "due", label: "Due date" },
              { value: "updated", label: "Recently updated" },
              { value: "manual", label: "Board order" },
            ]}
          />
        </div>
        {loading && !tasks && <SkeletonRows rows={10} />}
        {tasks && !tasks.length && (
          <EmptyState icon={LuListTodo} title="No tasks match" action={project.can.createTask && <button className="btn btn-secondary" onClick={() => ws.openCreateTask({ projectKey: project.key })}><LuPlus size={14} /> New task</button>}>
            Try clearing filters, or create the first task.
          </EmptyState>
        )}
        {tasks?.length > 0 &&
          groups.map(([status, list]) => (
            <section key={status} className="mb-3">
              <div className="group flex items-center gap-2 h-9 px-2 -mx-1 rounded-lg bg-canvas sticky top-0 z-[1]">
                <button onClick={() => setCollapsed((c) => ({ ...c, [status]: !c[status] }))} className="flex items-center gap-2 flex-1 text-left">
                  <LuChevronDown size={13} className={`text-faint transition-transform duration-200 ${collapsed[status] ? "-rotate-90" : ""}`} />
                  <StatusIcon status={status} />
                  <span className="text-[13px] font-semibold text-ink">{STATUS[status].label}</span>
                  <span className="text-xs text-faint tabular-nums">{list.length}</span>
                </button>
                {project.can.createTask && !["in_review", "done", "canceled"].includes(status) && (
                  <Tooltip label={`New task in ${STATUS[status].label}`}>
                    <button className="icon-btn size-6 opacity-0 group-hover:opacity-100" onClick={() => ws.openCreateTask({ projectKey: project.key, status })}>
                      <LuPlus size={14} />
                    </button>
                  </Tooltip>
                )}
              </div>
              {!collapsed[status] && (
                <div className="stagger mt-0.5">
                  {list.map((t, i) => (
                    <TaskRow key={t._id} task={t} index={i} project={project} onChange={onTaskChange} />
                  ))}
                  {!list.length && <p className="px-10 py-2 text-xs text-faint">No tasks</p>}
                </div>
              )}
            </section>
          ))}
      </div>
    </div>
  );
}
