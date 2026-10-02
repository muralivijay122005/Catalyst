// src/pages/project/ProjectSettings.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuPlus, LuTrash2, LuCheck, LuFlag } from "react-icons/lu";
import { api } from "../../lib/api";
import { useWorkspace } from "../../context/WorkspaceContext";
import Popover from "../../components/ui/Popover";
import { Spinner, Switch } from "../../components/ui/primitives";
import { toast } from "../../components/ui/toast";
import { confirm } from "../../components/ui/confirm";
import { PROJECT_COLORS, LABEL_COLORS } from "../../lib/constants";
import { toInputDate } from "../../lib/format";
import ProjectMembers from "../../components/project/ProjectMembers";
import Select from "../../components/ui/Select";
import DatePicker from "../../components/ui/DatePicker";

const STATUS_DOT = { active: "#16a34a", paused: "#d97706", completed: "#2563eb", archived: "#a1a1aa" };
const STATUS_OPTIONS = [
  ["active", "Active", "Work is underway"],
  ["paused", "Paused", "On hold; still visible to the team"],
  ["completed", "Completed", "Finished; kept for reference"],
  ["archived", "Archived", "Hidden from the sidebar and Home"],
].map(([value, label, description]) => ({ value, label, description, icon: <span className="size-2 rounded-full" style={{ background: STATUS_DOT[value] }} /> }));

function Section({ title, description, children }) {
  return (
    <section className="grid md:grid-cols-[240px_1fr] gap-x-10 gap-y-3 py-8 border-b border-line last:border-0">
      <div>
        <h2 className="h-section">{title}</h2>
        {description && <p className="text-[12.5px] text-muted mt-1 leading-5">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default function ProjectSettings({ project }) {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const can = project.can;
  const [form, setForm] = useState({
    name: project.name,
    description: project.description,
    color: project.color,
    status: project.status,
    requireApproval: project.requireApproval,
    targetDate: project.targetDate,
  });
  const [labels, setLabels] = useState(project.labels || []);
  const [milestones, setMilestones] = useState(project.milestones || []);
  const [saving, setSaving] = useState(false);

  const save = async (patch, message = "Project updated") => {
    setSaving(true);
    try {
      await api.patch(`/projects/${project._id}`, patch);
      await ws.refreshProjects();
      toast.success(message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    form.name !== project.name ||
    form.description !== project.description ||
    form.color !== project.color ||
    form.status !== project.status ||
    form.requireApproval !== project.requireApproval ||
    toInputDate(form.targetDate) !== toInputDate(project.targetDate);

  return (
    <div className="flex-1 scroll">
      <div className="max-w-[920px] mx-auto px-6 py-2">
        <Section title="General" description={can.update ? "Name, color and how work gets approved." : "Only project managers can change these."}>
          <fieldset disabled={!can.update} className="space-y-4 disabled:opacity-70">
            <div className="grid sm:grid-cols-[1fr_auto] gap-3">
              <div>
                <label className="label">Name</label>
                <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Key</label>
                <input className="field w-24 mono" value={project.key} disabled />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="field" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this project about? Markdown supported." />
            </div>
            <div className="flex flex-wrap gap-6">
              <div>
                <label className="label">Color</label>
                <div className="flex gap-1.5">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className="grid place-items-center size-7 rounded-lg transition-transform hover:scale-110"
                      style={{ background: c, boxShadow: form.color === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : undefined }}
                      aria-label={`Color ${c}`}
                    >
                      {form.color === c && <LuCheck size={13} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Status</label>
                <Select
                  width={176}
                  disabled={!can.update}
                  value={form.status}
                  onChange={(status) => setForm({ ...form, status })}
                  options={STATUS_OPTIONS}
                  menuWidth={260}
                />
              </div>
              <div>
                <label className="label">Target date</label>
                <DatePicker width={180} disabled={!can.update} value={form.targetDate} onChange={(targetDate) => setForm({ ...form, targetDate })} placeholder="No target date" />
              </div>
            </div>
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-canvas">
              <Switch checked={form.requireApproval} onChange={(v) => setForm({ ...form, requireApproval: v })} disabled={!can.update} label="Require approval" />
              <div>
                <p className="text-[13px] font-medium text-ink">Require approval for completed work</p>
                <p className="text-xs text-muted mt-0.5">When members mark a task done it moves to In review until a manager approves it. Nobody can approve their own work.</p>
              </div>
            </div>
            {can.update && (
              <div className="flex justify-end">
                <button className="btn btn-primary" disabled={!dirty || saving} onClick={() => save(form)}>
                  {saving && <Spinner size={13} />} Save changes
                </button>
              </div>
            )}
          </fieldset>
        </Section>

        <Section title="Members" description="Project roles add to workspace roles. Admins act as owners everywhere; workspace managers can view every project.">
          <ProjectMembers project={project} />
        </Section>

        <Section title="Labels" description="Used to categorize tasks on the board and in filters.">
          <div className="space-y-2">
            {labels.map((l, i) => (
              <div key={l._id || i} className="flex items-center gap-2">
                <Popover
                  width={200}
                  disabled={!can.update}
                  content={({ close }) => (
                    <div className="menu grid grid-cols-5 gap-1 p-2 min-w-0">
                      {LABEL_COLORS.map((c) => (
                        <button key={c} className="size-7 rounded-md transition-transform hover:scale-110" style={{ background: c }} onClick={() => { setLabels(labels.map((x, j) => (j === i ? { ...x, color: c } : x))); close(); }} />
                      ))}
                    </div>
                  )}
                >
                  {({ ref, toggle }) => <button ref={ref} onClick={toggle} className="size-8 rounded-lg shrink-0" style={{ background: l.color }} aria-label="Label color" />}
                </Popover>
                <input className="field" disabled={!can.update} value={l.name} onChange={(e) => setLabels(labels.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                {can.update && (
                  <button className="icon-btn hover:text-danger" onClick={() => setLabels(labels.filter((_, j) => j !== i))} aria-label="Remove label">
                    <LuTrash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {can.update && (
              <div className="flex items-center gap-2 pt-1">
                <button className="btn btn-sm btn-ghost" onClick={() => setLabels([...labels, { name: "New label", color: LABEL_COLORS[labels.length % LABEL_COLORS.length] }])}>
                  <LuPlus size={13} /> Add label
                </button>
                <button className="btn btn-sm btn-primary ml-auto" disabled={saving || JSON.stringify(labels) === JSON.stringify(project.labels)} onClick={() => save({ labels }, "Labels saved")}>
                  Save labels
                </button>
              </div>
            )}
          </div>
        </Section>

        <Section title="Milestones" description="Group work toward a date. Progress is tracked on the overview.">
          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div key={m._id || i} className="flex items-center gap-2">
                <LuFlag size={14} className="text-muted shrink-0" />
                <input className="field" disabled={!can.update} value={m.name} onChange={(e) => setMilestones(milestones.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <DatePicker width={180} disabled={!can.update} value={m.dueDate} placement="bottom-end" onChange={(dueDate) => setMilestones(milestones.map((x, j) => (j === i ? { ...x, dueDate } : x)))} placeholder="Due date" />
                {can.update && (
                  <button className="icon-btn hover:text-danger" onClick={() => setMilestones(milestones.filter((_, j) => j !== i))} aria-label="Remove milestone">
                    <LuTrash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {can.update && (
              <div className="flex items-center gap-2 pt-1">
                <button className="btn btn-sm btn-ghost" onClick={() => setMilestones([...milestones, { name: "New milestone", dueDate: null }])}>
                  <LuPlus size={13} /> Add milestone
                </button>
                <button className="btn btn-sm btn-primary ml-auto" disabled={saving || JSON.stringify(milestones) === JSON.stringify(project.milestones)} onClick={() => save({ milestones }, "Milestones saved")}>
                  Save milestones
                </button>
              </div>
            )}
          </div>
        </Section>

        {can.delete && (
          <Section title="Danger zone" description="Deleting removes all tasks and the project channel. Knowledge is kept and becomes workspace-wide.">
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ boxShadow: "inset 0 0 0 1px rgb(220 38 38 / 0.2)" }}>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-ink">Delete this project</p>
                <p className="text-xs text-muted">This can't be undone.</p>
              </div>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  const ok = await confirm({ title: `Delete ${project.name}?`, body: `All ${project.stats.total} tasks will be permanently deleted.`, confirmLabel: "Delete project", danger: true, requireText: project.key });
                  if (!ok) return;
                  try {
                    await api.del(`/projects/${project._id}`, { confirm: project.key });
                    toast.success(`${project.name} deleted`);
                    await ws.refreshProjects();
                    navigate("/projects");
                  } catch (err) {
                    toast.error(err.message);
                  }
                }}
              >
                <LuTrash2 size={14} /> Delete project
              </button>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
