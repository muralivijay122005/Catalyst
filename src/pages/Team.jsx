// src/pages/Team.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  LuUsers,
  LuUserPlus,
  LuSearch,
  LuEllipsis,
  LuMessageSquare,
  LuUserX,
  LuUserCheck,
  LuCopy,
  LuCheck,
  LuX,
  LuMapPin,
  LuMail,
  LuBriefcase,
  LuShieldCheck,
  LuInfo,
} from "react-icons/lu";
import PageHeader from "../components/layout/PageHeader";
import Modal from "../components/ui/Modal";
import Popover, { OptionList } from "../components/ui/Popover";
import { Avatar } from "../components/ui/Avatar";
import { EmptyState, ProjectMark, RoleBadge, Segmented, Spinner, Tooltip, SkeletonRows } from "../components/ui/primitives";
import { toast } from "../components/ui/toast";
import { confirm } from "../components/ui/confirm";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { api } from "../lib/api";
import { ROLE, PROJECT_ROLE } from "../lib/constants";
import { fullName } from "../lib/format";
import PresenceText from "../components/ui/PresenceText";

const MATRIX = [
  ["See all projects (read-only oversight)", { admin: true, manager: true }],
  ["Create projects", { admin: true, manager: true }],
  ["Invite people", { admin: "any role", manager: "members & guests" }],
  ["Change workspace roles, deactivate people", { admin: true }],
  ["Verify & curate workspace knowledge", { admin: true, manager: true }],
  ["Write knowledge, distill channels", { admin: true, manager: true, member: true }],
  ["Create channels", { admin: true, manager: true, member: true }],
  ["Post announcements", { admin: true, manager: true }],
  ["Work only in projects they're added to", { member: true, guest: "as viewer" }],
];

function Invite({ onClose, onInvited }) {
  const ws = useWorkspace();
  const [meta, setMeta] = useState(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", role: "member", title: "", department: "", projectIds: [] });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api("/users/meta").then(setMeta).catch(() => {});
  }, []);
  const manageable = ws.projects.filter((p) => ["owner", "manager"].includes(p.can.role));

  if (result) {
    return (
      <Modal title="Invitation ready" size="sm" onClose={onClose} footer={(close) => <button className="btn btn-primary" onClick={close}>Done</button>}>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-canvas">
          <Avatar user={result.user} size={36} />
          <div>
            <p className="text-[13.5px] font-medium">{fullName(result.user)}</p>
            <p className="text-xs text-muted">
              {result.user.email} · {ROLE[result.user.role].label}
            </p>
          </div>
        </div>
        <p className="text-[13px] text-muted mt-4">Share this temporary password with them. They can change it in Settings → Security after signing in.</p>
        <div className="field mt-2 justify-between mono">
          {result.tempPassword}
          <button
            className="icon-btn"
            onClick={() => navigator.clipboard?.writeText(result.tempPassword).then(() => setCopied(true))}
            aria-label="Copy password"
          >
            {copied ? <LuCheck size={14} className="text-ok" /> : <LuCopy size={14} />}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Invite someone"
      description="They'll get an account with a temporary password."
      onClose={onClose}
      footer={(close) => (
        <>
          <button className="btn btn-secondary" onClick={close}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={!form.firstName.trim() || !form.lastName.trim() || !form.email.includes("@") || saving}
            onClick={async () => {
              setSaving(true);
              try {
                const res = await api.post("/users", form);
                setResult(res);
                onInvited();
              } catch (err) {
                toast.error(err.message);
                setSaving(false);
              }
            }}
          >
            {saving && <Spinner size={13} />} Create invite
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">First name</label>
            <input className="field" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div>
            <label className="label">Last name</label>
            <input className="field" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Email</label>
          <input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Title</label>
            <input className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Backend Engineer" />
          </div>
          <div>
            <label className="label">Department</label>
            <input className="field" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Workspace role</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(meta?.roles || []).map((r) => {
              const allowed = meta.invitable.includes(r.value);
              return (
                <Tooltip key={r.value} label={allowed ? null : "Only admins can invite with this role"}>
                  <button
                    disabled={!allowed}
                    onClick={() => setForm({ ...form, role: r.value })}
                    className={`flex items-center gap-2 h-9 px-3 rounded-lg text-[13px] transition-all disabled:opacity-40 ${form.role === r.value ? "bg-surface shadow-[0_0_0_1.5px_var(--color-accent)]" : "bg-canvas hover:bg-subtle"}`}
                  >
                    <RoleBadge role={r.value} />
                    {form.role === r.value && <LuCheck size={13} className="ml-auto text-accent" />}
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>
        {manageable.length > 0 && (
          <div>
            <label className="label">Add to projects</label>
            <div className="flex flex-wrap gap-1.5">
              {manageable.map((p) => {
                const on = form.projectIds.includes(p._id);
                return (
                  <button
                    key={p._id}
                    onClick={() => setForm({ ...form, projectIds: on ? form.projectIds.filter((x) => x !== p._id) : [...form.projectIds, p._id] })}
                    className={`chip h-7 transition-colors ${on ? "chip-accent" : "hover:bg-line"}`}
                  >
                    <ProjectMark project={p} size={13} /> {p.name}
                    {on && <LuCheck size={11} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function PersonSheet({ person, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <Modal size="sm" bare onClose={onClose}>
      {(close) => (
        <div>
          <div className="relative h-24 overflow-hidden">
            {/* Calm blue light: one bright source top-left, a cooler sky wash top-right, depth along the bottom */}
            <div
              className="absolute inset-0"
              style={{
                background: [
                  "radial-gradient(70% 140% at 12% 0%, rgb(120 166 252 / 1) 0%, rgb(120 166 252 / 0) 72%)",
                  "radial-gradient(60% 120% at 88% 10%, rgb(165 214 253 / 1) 0%, rgb(165 214 253 / 0) 72%)",
                  "radial-gradient(80% 90% at 55% 115%, rgb(79 129 247 / 0.6) 0%, rgb(79 129 247 / 0) 70%)",
                  "linear-gradient(120deg, #d2e1fe 0%, #e4edff 55%, #d3e9fe 100%)",
                ].join(", "),
              }}
            />
            {/* Visible film grain */}
            <div
              className="absolute inset-0 opacity-[0.9] mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")",
                backgroundSize: "200px 200px",
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.22] mix-blend-multiply pointer-events-none"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")",
                backgroundSize: "200px 200px",
              }}
            />
            {/* Hairline to separate banner from card */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-accent/10" />
            <button className="icon-btn absolute top-2 right-2 text-ink-2/70 hover:text-ink hover:bg-white/60 backdrop-blur-sm" onClick={close} aria-label="Close">
              <LuX size={15} />
            </button>
          </div>
          <div className="px-5 pb-5">
            <div className="-mt-8">
              <span className="inline-block rounded-full ring-4 ring-surface">
                <Avatar user={person} size={60} presence />
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <h2 className="text-[17px] font-semibold tracking-tight">{fullName(person)}</h2>
              <RoleBadge role={person.role} />
              {person.status === "deactivated" && <span className="chip">Deactivated</span>}
            </div>
            <p className="text-[13px] text-muted">{person.title}</p>
            {person.bio && <p className="text-[13px] text-ink-2 mt-3 leading-relaxed">{person.bio}</p>}
            <div className="mt-4 space-y-1.5 text-[12.5px] text-muted">
              {person.email && (
                <p className="flex items-center gap-2">
                  <LuMail size={13} /> {person.email}
                </p>
              )}
              {person.location && (
                <p className="flex items-center gap-2">
                  <LuMapPin size={13} /> {person.location}
                </p>
              )}
              {person.department && (
                <p className="flex items-center gap-2">
                  <LuBriefcase size={13} /> {person.department}
                </p>
              )}
              <p className="flex items-center gap-2">
                <PresenceText user={person} />
              </p>
            </div>
            {person.projects?.length > 0 && (
              <div className="mt-4">
                <p className="eyebrow mb-1.5">Projects</p>
                <div className="space-y-1">
                  {person.projects.map((p) => (
                    <button key={p._id} onClick={() => { close(); navigate(`/projects/${p.key}`); }} className="flex items-center gap-2 w-full h-8 px-2 -mx-2 rounded-md hover:bg-subtle text-[13px]">
                      <ProjectMark project={p} size={15} />
                      <span className="flex-1 text-left">{p.name}</span>
                      <span className="text-xs text-faint">{PROJECT_ROLE[p.role]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                ["Open", person.workload.open],
                ["Overdue", person.workload.overdue],
                ["In review", person.workload.inReview],
              ].map(([l, v]) => (
                <div key={l} className="rounded-lg bg-canvas px-3 py-2">
                  <p className="text-[11px] text-muted">{l}</p>
                  <p className={`text-[17px] font-semibold ${l === "Overdue" && v ? "text-danger" : ""}`}>{v}</p>
                </div>
              ))}
            </div>
            {person._id !== user._id && user.role !== "guest" && (
              <button
                className="btn btn-secondary w-full mt-4"
                onClick={async () => {
                  const dm = await api.post("/channels", { kind: "dm", memberIds: [person._id] });
                  close();
                  navigate(`/channels/${dm._id}`);
                }}
              >
                <LuMessageSquare size={14} /> Send a message
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Team() {
  const { user, can } = useAuth();
  const ws = useWorkspace();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [inviting, setInviting] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);
  const isAdmin = user.role === "admin";

  useEffect(() => {
    ws.refreshPeople().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const people = useMemo(
    () =>
      ws.people.filter(
        (p) => (role === "all" || p.role === role) && (!q.trim() || `${fullName(p)} ${p.title} ${p.email} ${p.department}`.toLowerCase().includes(q.toLowerCase()))
      ),
    [ws.people, role, q]
  );
  const counts = useMemo(() => ws.people.reduce((acc, p) => ({ ...acc, [p.role]: (acc[p.role] || 0) + 1 }), {}), [ws.people]);
  const maxOpen = Math.max(1, ...ws.people.map((p) => p.workload?.open || 0));
  const selected = ws.people.find((p) => p._id === params.get("person"));

  const changeRole = async (p, next) => {
    if (next === p.role) return;
    const ok = await confirm({
      title: `Make ${p.firstName} ${ROLE[next].label === "Admin" ? "an" : "a"} ${ROLE[next].label}?`,
      body:
        next === "guest"
          ? "Guests become viewers in every project and only see knowledge from their projects."
          : next === "admin"
            ? "Admins have full control of the workspace, including roles and every project."
            : `They'll get ${ROLE[next].label.toLowerCase()} permissions across the workspace.`,
      confirmLabel: "Change role",
    });
    if (!ok) return;
    try {
      await api.patch(`/users/${p._id}/role`, { role: next });
      toast.success(`${p.firstName} is now ${ROLE[next].label === "Admin" ? "an" : "a"} ${ROLE[next].label}`);
      ws.refreshPeople();
      ws.refreshProjects();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const setStatus = async (p, status) => {
    const ok = await confirm({
      title: status === "deactivated" ? `Deactivate ${p.firstName}?` : `Reactivate ${p.firstName}?`,
      body: status === "deactivated" ? "They won't be able to sign in. Their open tasks go back to the pool so nothing stalls." : "They'll be able to sign in again.",
      confirmLabel: status === "deactivated" ? "Deactivate" : "Reactivate",
      danger: status === "deactivated",
    });
    if (!ok) return;
    try {
      const res = await api.patch(`/users/${p._id}/status`, { status });
      toast.success(status === "deactivated" ? `${p.firstName} deactivated` : `${p.firstName} reactivated`, res.unassigned ? { description: `${res.unassigned} open tasks were unassigned.` } : undefined);
      ws.refreshPeople();
      ws.taskChanged();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader
        icon={<LuUsers size={15} />}
        title="People"
        subtitle={`${ws.people.length} people in the workspace`}
        actions={
          <>
            <button className="btn btn-sm btn-ghost" onClick={() => setShowMatrix((s) => !s)}>
              <LuShieldCheck size={14} /> Roles & permissions
            </button>
            {can("user.invite") && (
              <button className="btn btn-sm btn-primary" onClick={() => setInviting(true)}>
                <LuUserPlus size={14} /> Invite
              </button>
            )}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2 pb-3">
          <Segmented
            size="sm"
            value={role}
            onChange={setRole}
            options={[{ value: "all", label: "Everyone", count: ws.people.length }, ...["admin", "manager", "member", "guest"].filter((r) => counts[r]).map((r) => ({ value: r, label: `${ROLE[r].label}s`, count: counts[r] }))]}
          />
          <label className="field h-8 w-60 ml-auto">
            <LuSearch size={14} className="text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" />
          </label>
        </div>
      </PageHeader>

      <div className="flex-1 scroll">
        <div className="max-w-[1180px] mx-auto px-6 py-5">
          {showMatrix && (
            <div className="card p-5 mb-5" style={{ animation: "var(--animate-rise)" }}>
              <div className="flex items-start gap-2 mb-4">
                <LuInfo size={15} className="text-accent mt-0.5" />
                <div>
                  <p className="text-[13.5px] font-semibold">How access works in Catalyst</p>
                  <p className="text-xs text-muted mt-0.5">
                    Workspace roles set what you can do everywhere. Project roles (owner, manager, member, viewer) add permissions inside a project. Nobody approves their own work, and the last admin can't be removed.
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="font-medium py-2 pr-4">Capability</th>
                      {["admin", "manager", "member", "guest"].map((r) => (
                        <th key={r} className="font-medium py-2 px-3 text-center">
                          <RoleBadge role={r} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {MATRIX.map(([label, grants]) => (
                      <tr key={label}>
                        <td className="py-2 pr-4 text-ink-2">{label}</td>
                        {["admin", "manager", "member", "guest"].map((r) => (
                          <td key={r} className="py-2 px-3 text-center">
                            {grants[r] === true ? <LuCheck size={14} className="inline text-ok" /> : grants[r] ? <span className="text-[11px] text-muted">{grants[r]}</span> : <span className="text-faint">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!ws.people.length && <SkeletonRows rows={8} />}
          {ws.people.length > 0 && !people.length && <EmptyState icon={LuUsers} title="No one matches" />}
          {people.length > 0 && (
            <div className="card overflow-hidden">
              <div className="hidden md:grid grid-cols-[minmax(0,2.2fr)_120px_minmax(0,1.6fr)_minmax(0,1.2fr)_110px_40px] gap-4 px-4 h-10 items-center border-b border-line text-[11.5px] font-medium text-muted">
                <span>Person</span>
                <span>Role</span>
                <span>Projects</span>
                <span>Workload</span>
                <span>Status</span>
                <span />
              </div>
              <div className="stagger">
                {people.map((p, i) => {
                  const self = p._id === user._id;
                  return (
                    <div
                      key={p._id}
                      style={{ "--i": i }}
                      className={`group grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,2.2fr)_120px_minmax(0,1.6fr)_minmax(0,1.2fr)_110px_40px] gap-4 px-4 py-3 items-center border-b border-line last:border-0 hover:bg-subtle/50 transition-colors ${p.status === "deactivated" ? "opacity-55" : ""}`}
                    >
                      <button className="flex items-center gap-3 min-w-0 text-left" onClick={() => setParams({ person: p._id })}>
                        <Avatar user={p} size={34} presence />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink truncate">
                            {fullName(p)}
                            {self && <span className="text-[11px] font-normal text-faint">you</span>}
                            {p.status === "deactivated" && <span className="chip h-5 text-[10.5px]">Deactivated</span>}
                          </span>
                          <span className="block text-xs text-muted truncate">{p.title || p.email}</span>
                        </span>
                      </button>
                      <div className="hidden md:block">
                        {isAdmin && !self ? (
                          <Popover
                            width={200}
                            content={({ close }) => (
                              <OptionList
                                options={["admin", "manager", "member", "guest"].map((r) => ({ value: r, label: ROLE[r].label }))}
                                value={p.role}
                                onSelect={(r) => {
                                  close();
                                  changeRole(p, r);
                                }}
                              />
                            )}
                          >
                            {({ ref, toggle }) => (
                              <button ref={ref} onClick={toggle} className="rounded-md outline-none transition-transform hover:scale-[1.03] focus-visible:shadow-[var(--shadow-focus)]">
                                <RoleBadge role={p.role} />
                              </button>
                            )}
                          </Popover>
                        ) : (
                          <Tooltip label={self ? "You can't change your own role" : "Only admins change roles"}>
                            <span>
                              <RoleBadge role={p.role} />
                            </span>
                          </Tooltip>
                        )}
                      </div>
                      <div className="hidden md:flex flex-wrap gap-1 min-w-0">
                        {p.projects.slice(0, 3).map((pr) => (
                          <Tooltip key={pr._id} label={`${pr.name} · ${PROJECT_ROLE[pr.role]}`}>
                            <button onClick={() => navigate(`/projects/${pr.key}`)} className="chip h-6 hover:bg-line">
                              <ProjectMark project={pr} size={12} /> {pr.key}
                            </button>
                          </Tooltip>
                        ))}
                        {p.projects.length > 3 && <span className="text-xs text-faint self-center">+{p.projects.length - 3}</span>}
                        {!p.projects.length && <span className="text-xs text-faint">—</span>}
                      </div>
                      <div className="hidden md:block">
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <span className="tabular-nums">{p.workload.open} open</span>
                          {p.workload.overdue > 0 && <span className="text-danger tabular-nums">{p.workload.overdue} overdue</span>}
                        </div>
                        <div className="h-1.5 mt-1.5 rounded-full bg-subtle overflow-hidden">
                          <div className="h-full rounded-full origin-left" style={{ width: `${(p.workload.open / maxOpen) * 100}%`, background: p.workload.overdue ? "var(--color-danger)" : "var(--color-ink-2)", animation: "grow-x 700ms var(--ease-out-expo) both" }} />
                        </div>
                      </div>
                      <PresenceText user={p} dot={false} className="hidden md:inline-flex text-xs" />
                      <Popover
                        placement="bottom-end"
                        width={210}
                        content={({ close }) => (
                          <div className="menu">
                            <button className="menu-item" onClick={() => { close(); setParams({ person: p._id }); }}>
                              <LuUsers size={14} className="text-muted" /> View profile
                            </button>
                            {!self && user.role !== "guest" && (
                              <button
                                className="menu-item"
                                onClick={async () => {
                                  close();
                                  const dm = await api.post("/channels", { kind: "dm", memberIds: [p._id] });
                                  navigate(`/channels/${dm._id}`);
                                }}
                              >
                                <LuMessageSquare size={14} className="text-muted" /> Send message
                              </button>
                            )}
                            {isAdmin && !self && (
                              <>
                                <div className="menu-sep" />
                                {p.status === "active" ? (
                                  <button className="menu-item text-danger" onClick={() => { close(); setStatus(p, "deactivated"); }}>
                                    <LuUserX size={14} /> Deactivate
                                  </button>
                                ) : (
                                  <button className="menu-item" onClick={() => { close(); setStatus(p, "active"); }}>
                                    <LuUserCheck size={14} className="text-muted" /> Reactivate
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      >
                        {({ ref, toggle }) => (
                          <button ref={ref} onClick={toggle} className="icon-btn opacity-60 group-hover:opacity-100" aria-label="Actions">
                            <LuEllipsis size={15} />
                          </button>
                        )}
                      </Popover>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {inviting && <Invite onClose={() => setInviting(false)} onInvited={() => ws.refreshPeople()} />}
      {selected && <PersonSheet person={selected} onClose={() => setParams({})} />}
    </>
  );
}
