// src/components/task/CreateTaskModal.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuChevronRight, LuSparkles } from "react-icons/lu";
import Modal from "../ui/Modal";
import Popover, { OptionList } from "../ui/Popover";
import { Kbd, ProjectMark, Spinner, Switch } from "../ui/primitives";
import { toast } from "../ui/toast";
import { api } from "../../lib/api";
import { useDebounced } from "../../lib/hooks";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { StatusPicker, PriorityPicker, AssigneePicker, LabelPicker, MilestonePicker, DateButton } from "./pickers";
import { contributors } from "../../lib/people";
import { TypeIcon } from "../kb/bits";

export default function CreateTaskModal({ defaults = {}, onClose }) {
  const { user } = useAuth();
  const ws = useWorkspace();
  const navigate = useNavigate();
  const initialProject =
    ws.creatableProjects.find((p) => p.key === defaults.projectKey) ||
    ws.creatableProjects.find((p) => user.favorites?.includes(p._id)) ||
    ws.creatableProjects[0];
  const [projectId, setProjectId] = useState(initialProject?._id);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(defaults.status && !["done", "in_review"].includes(defaults.status) ? defaults.status : "todo");
  const [priority, setPriority] = useState("none");
  const [chosenAssignee, setAssignee] = useState(defaults.assignee || null);
  const [labels, setLabels] = useState([]);
  const [milestone, setMilestone] = useState(null);
  const [dueDate, setDueDate] = useState(defaults.dueDate || null);
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hints, setHints] = useState([]);

  const project = ws.creatableProjects.find((p) => p._id === projectId);
  const people = useMemo(() => contributors(project), [project]);
  const canAssignOthers = project?.can?.assign;
  const debouncedTitle = useDebounced(`${title} ${description}`.trim(), 500);

  // A chosen assignee only applies while they're a contributor on the selected project
  const assignee = chosenAssignee && people.some((p) => p._id === chosenAssignee) ? chosenAssignee : null;

  // Surface existing knowledge while the task is being written
  useEffect(() => {
    if (debouncedTitle.length < 12) return undefined;
    const ctrl = new AbortController();
    api(`/memories/related?text=${encodeURIComponent(debouncedTitle)}`, { signal: ctrl.signal })
      .then((r) => setHints((r.suggested || []).filter((m) => m.score >= 0.12).slice(0, 3)))
      .catch(() => {});
    return () => ctrl.abort();
  }, [debouncedTitle]);

  const submit = async () => {
    if (!title.trim() || !project || saving) return;
    setSaving(true);
    try {
      const task = await api.post("/tasks", { projectId, title, description, status, priority, assignee, labels, milestone, dueDate });
      ws.taskChanged();
      toast.success(`${task.ref} created`, { description: task.title, action: { label: "Open", onClick: () => ws.openTask(task.ref) } });
      if (more) {
        setTitle("");
        setDescription("");
        setSaving(false);
      } else {
        onClose();
      }
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  };

  if (!ws.creatableProjects.length) {
    return (
      <Modal title="Create task" size="sm" onClose={onClose}>
        <p className="text-[13px] text-muted">You don't have permission to create tasks in any project. Ask a project manager to add you as a member.</p>
      </Modal>
    );
  }

  return (
    <Modal size="lg" bare onClose={onClose}>
      {(close) => (
        <div
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        >
          <div className="flex items-center gap-1.5 px-5 pt-4 text-[13px]">
            <Popover
              width={240}
              content={({ close: c }) => (
                <OptionList
                  options={ws.creatableProjects.map((p) => ({ value: p._id, label: p.name, hint: p.key, icon: <ProjectMark project={p} size={14} /> }))}
                  value={projectId}
                  onSelect={(v) => {
                    setProjectId(v);
                    setLabels([]);
                    setMilestone(null);
                    c();
                  }}
                />
              )}
            >
              {({ ref, toggle }) => (
                <button ref={ref} onClick={toggle} className="btn btn-sm btn-secondary">
                  <ProjectMark project={project} size={14} />
                  {project?.key}
                </button>
              )}
            </Popover>
            <LuChevronRight size={13} className="text-faint" />
            <span className="text-muted">New task</span>
          </div>

          <div className="px-5 pt-3">
            <input
              data-autofocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="w-full bg-transparent outline-none text-[18px] font-semibold tracking-tight text-ink placeholder:text-faint"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description…"
              rows={3}
              className="mt-2 w-full bg-transparent outline-none resize-none text-[13.5px] leading-relaxed text-ink-2 placeholder:text-faint"
            />
          </div>

          {debouncedTitle.length >= 12 && hints.length > 0 && (
            <div className="mx-5 mb-3 px-3 py-2.5 rounded-lg bg-accent-soft/70" style={{ animation: "var(--animate-enter)", boxShadow: "inset 0 0 0 1px rgb(37 99 235 / 0.12)" }}>
              <p className="flex items-center gap-1.5 text-[12px] font-medium text-accent">
                <LuSparkles size={12} /> The Knowledge Base may already have answers
              </p>
              <div className="mt-1.5 space-y-1">
                {hints.map((m) => (
                  <button
                    key={m._id}
                    onClick={() => {
                      close();
                      navigate(`/kb/${m._id}`);
                    }}
                    className="flex items-center gap-2 w-full text-left text-[12.5px] text-ink-2 hover:text-accent"
                  >
                    <TypeIcon type={m.type} size={12} />
                    <span className="truncate">{m.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 pb-4">
            <StatusPicker value={status} onChange={setStatus} exclude={["in_review", "done", "canceled"]} />
            <PriorityPicker value={priority} onChange={setPriority} />
            <AssigneePicker value={assignee} people={people} onChange={setAssignee} selfOnly={canAssignOthers ? null : user._id} />
            <LabelPicker value={labels} labels={project?.labels || []} onChange={setLabels} />
            <MilestonePicker value={milestone} milestones={project?.milestones || []} onChange={setMilestone} />
            <DateButton value={dueDate} onChange={setDueDate} placeholder="Due date" isDue />
          </div>

          <div className="flex items-center gap-3 px-5 py-3 border-t border-line bg-canvas/60">
            {!canAssignOthers && <span className="text-[11.5px] text-faint">You can assign tasks to yourself in this project.</span>}
            <label className="ml-auto flex items-center gap-2 text-[12.5px] text-muted cursor-pointer">
              <Switch checked={more} onChange={setMore} label="Create more" /> Create more
            </label>
            <button className="btn btn-primary" disabled={!title.trim() || saving} onClick={submit}>
              {saving && <Spinner size={13} />} Create task
              <Kbd keys={["mod", "Enter"]} className="ml-1 opacity-70 [&_.kbd]:bg-white/10 [&_.kbd]:text-white/80 [&_.kbd]:shadow-none" />
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
