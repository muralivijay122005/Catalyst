// src/pages/Projects.jsx
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LuFolderKanban, LuPlus, LuCheck, LuShieldCheck, LuTriangleAlert } from "react-icons/lu";
import PageHeader from "../components/layout/PageHeader";
import Modal from "../components/ui/Modal";
import Popover, { OptionList } from "../components/ui/Popover";
import { AvatarStack, Avatar } from "../components/ui/Avatar";
import { EmptyState, ProgressBar, ProjectMark, Segmented, Spinner, Switch } from "../components/ui/primitives";
import { toast } from "../components/ui/toast";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { api } from "../lib/api";
import { PROJECT_COLORS, PROJECT_ROLE } from "../lib/constants";
import { formatDate, fullName } from "../lib/format";
import DatePicker from "../components/ui/DatePicker";

function suggestKey(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.map((w) => w[0]).join("") : name.replace(/[^a-z]/gi, "").slice(0, 3)).toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
}

function CreateProject({ onClose }) {
  const ws = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [raw, setForm] = useState({ name: "", key: "", description: "", color: PROJECT_COLORS[0], requireApproval: true, targetDate: "", memberIds: [] });
  const [keyTouched, setKeyTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  // Until someone edits the key, suggest one from the name ("Customer Portal" → CP, "Billing" → BIL)
  const form = keyTouched ? raw : { ...raw, key: suggestKey(raw.name) };

  const taken = ws.projects.some((p) => p.key === form.key);
  const people = ws.people.filter((p) => p._id !== user._id && p.status === "active");

  const submit = async () => {
    setSaving(true);
    try {
      const project = await api.post("/projects", { ...form, targetDate: form.targetDate || undefined });
      await ws.refreshProjects();
      toast.success(`${project.name} created`, { description: `A private #${project.key.toLowerCase()} channel was created for the team.` });
      onClose();
      navigate(`/projects/${project.key}/board`);
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      title="New project"
      description="You'll be the owner. Add the team now or later."
      onClose={onClose}
      footer={(close) => (
        <>
          <button className="btn btn-secondary" onClick={close}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!form.name.trim() || form.key.length < 2 || taken || saving} onClick={submit}>
            {saving && <Spinner size={13} />} Create project
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <div>
            <label className="label">Name</label>
            <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Customer Portal" />
          </div>
          <div>
            <label className="label">Key</label>
            <input
              className="field mono uppercase"
              value={form.key}
              onChange={(e) => {
                setKeyTouched(true);
                setForm({ ...form, key: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) });
              }}
            />
          </div>
        </div>
        {taken && (
          <p className="flex items-center gap-1.5 text-xs text-danger -mt-2">
            <LuTriangleAlert size={12} /> {form.key} is already used
          </p>
        )}
        <div>
          <label className="label">Description</label>
          <textarea className="field" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What's the goal?" />
        </div>
        <div className="flex flex-wrap gap-6">
          <div>
            <label className="label">Color</label>
            <div className="flex gap-1.5">
              {PROJECT_COLORS.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, color: c })} className="grid place-items-center size-7 rounded-lg transition-transform hover:scale-110" style={{ background: c, boxShadow: form.color === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : undefined }}>
                  {form.color === c && <LuCheck size={13} className="text-white" />}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Target date</label>
            <DatePicker width={180} value={form.targetDate || null} onChange={(targetDate) => setForm({ ...form, targetDate: targetDate || "" })} placeholder="No target date" />
          </div>
        </div>
        <div>
          <label className="label">Team</label>
          <Popover
            width={300}
            content={() => (
              <OptionList
                multiple
                searchable
                placeholder="Add people…"
                options={people.map((p) => ({ value: p._id, label: fullName(p), hint: p.role === "guest" ? "guest · viewer" : p.title, icon: <Avatar user={p} size={18} /> }))}
                value={form.memberIds}
                onSelect={(id) => setForm((f) => ({ ...f, memberIds: f.memberIds.includes(id) ? f.memberIds.filter((x) => x !== id) : [...f.memberIds, id] }))}
              />
            )}
          >
            {({ ref, toggle }) => (
              <button ref={ref} onClick={toggle} className="field justify-start">
                {form.memberIds.length ? (
                  <>
                    <AvatarStack users={people.filter((p) => form.memberIds.includes(p._id))} size={20} max={6} />
                    <span className="text-muted">{form.memberIds.length} selected</span>
                  </>
                ) : (
                  <span className="text-faint">Add members (they join as members; guests as viewers)</span>
                )}
              </button>
            )}
          </Popover>
        </div>
        <label className="flex items-start gap-3 p-3 rounded-xl bg-canvas cursor-pointer">
          <Switch checked={form.requireApproval} onChange={(v) => setForm({ ...form, requireApproval: v })} label="Require approval" />
          <span>
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
              <LuShieldCheck size={13} /> Require approval
            </span>
            <span className="block text-xs text-muted mt-0.5">Members' completed tasks wait in review until a manager approves.</span>
          </span>
        </label>
      </div>
    </Modal>
  );
}

export default function Projects() {
  const ws = useWorkspace();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState("active");
  const creating = params.get("new") === "1" && can("project.create");

  const list = useMemo(() => ws.projects.filter((p) => (filter === "all" ? true : filter === "active" ? !["archived", "completed"].includes(p.status) : ["archived", "completed"].includes(p.status))), [ws.projects, filter]);

  return (
    <>
      <PageHeader
        icon={<LuFolderKanban size={15} />}
        title="Projects"
        subtitle={`${ws.projects.length} projects you can see`}
        actions={
          <>
            <Segmented
              size="sm"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "active", label: "Active" },
                { value: "closed", label: "Completed & archived" },
                { value: "all", label: "All" },
              ]}
            />
            {can("project.create") && (
              <button className="btn btn-primary btn-sm" onClick={() => setParams({ new: "1" })}>
                <LuPlus size={14} /> New project
              </button>
            )}
          </>
        }
      />
      <div className="flex-1 scroll">
        <div className="max-w-[1180px] mx-auto px-6 py-6">
          {ws.projectsLoaded && !list.length && (
            <EmptyState icon={LuFolderKanban} title="No projects here">
              {can("project.create") ? "Create a project to start planning work." : "Ask a manager to add you to a project."}
            </EmptyState>
          )}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 stagger">
            {list.map((p, i) => {
              const members = [p.owner, ...p.members.map((m) => m.user)].filter((u, j, a) => u && a.findIndex((x) => x?._id === u._id) === j);
              return (
                <button key={p._id} style={{ "--i": i }} onClick={() => navigate(`/projects/${p.key}`)} className="card card-hover p-5 text-left flex flex-col">
                  <div className="flex items-center gap-3">
                    <ProjectMark project={p} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-ink truncate">{p.name}</p>
                      <p className="text-xs text-muted">
                        <span className="mono">{p.key}</span> · {PROJECT_ROLE[p.can.role]}
                        {!p.can.member && " (oversight)"}
                      </p>
                    </div>
                    {p.status !== "active" && <span className="chip capitalize">{p.status}</span>}
                  </div>
                  <p className="mt-3 text-[13px] text-muted leading-5 line-clamp-2 min-h-10">{p.description || "No description"}</p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted">
                        {p.stats.done}/{p.stats.total} tasks
                        {p.stats.overdue > 0 && <span className="text-danger"> · {p.stats.overdue} overdue</span>}
                      </span>
                      <span className="font-semibold text-ink-2 tabular-nums">{p.stats.progress}%</span>
                    </div>
                    <ProgressBar value={p.stats.progress} color={p.color} height={5} />
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-line">
                    <AvatarStack users={members} size={22} max={5} />
                    <span className="text-xs text-faint">{p.targetDate ? `Target ${formatDate(p.targetDate)}` : ""}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {creating && <CreateProject onClose={() => setParams({})} />}
    </>
  );
}
