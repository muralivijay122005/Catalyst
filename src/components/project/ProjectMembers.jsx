// src/components/project/ProjectMembers.jsx
// Project team management. Every control follows project.can from the server:
//   owners & managers add people and change member/viewer roles; only the owner promotes managers
//   or transfers ownership; anyone (except the owner) can leave.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuUserPlus, LuCrown, LuX, LuInfo, LuSearch, LuLogOut, LuCheck } from "react-icons/lu";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { Avatar } from "../ui/Avatar";
import Popover, { OptionList } from "../ui/Popover";
import { RoleBadge, Spinner, Tooltip } from "../ui/primitives";
import Select from "../ui/Select";
import { toast } from "../ui/toast";
import { confirm } from "../ui/confirm";
import { PROJECT_ROLE } from "../../lib/constants";
import { fullName } from "../../lib/format";

const PROJECT_ROLE_HELP = {
  owner: "Full control, including deleting the project and promoting managers",
  manager: "Edit any task, assign work, approve reviews and manage members",
  member: "Create tasks and work on tasks assigned to them; finished work goes to review",
  viewer: "Read-only access with comments (guests are always viewers)",
};

const ORDER = ["owner", "manager", "member", "viewer"];

function AddPeople({ project, candidates, onDone }) {
  const [picked, setPicked] = useState([]);
  const [role, setRole] = useState("member");
  const [saving, setSaving] = useState(false);
  const can = project.can;

  const add = async (close) => {
    setSaving(true);
    let ok = 0;
    for (const id of picked) {
      try {
        await api.post(`/projects/${project._id}/members`, { userId: id, role });
        ok++;
      } catch (err) {
        toast.error(err.message);
      }
    }
    setSaving(false);
    if (ok) {
      toast.success(`${ok === 1 ? fullName(candidates.find((c) => c._id === picked[0])) : `${ok} people`} added to ${project.name}`);
      onDone();
    }
    close();
  };

  return (
    <Popover
      width={320}
      onOpenChange={(o) => !o && setPicked([])}
      content={({ close }) => (
        <div className="menu p-0 overflow-hidden">
          <OptionList
            multiple
            searchable
            placeholder="Search people to add…"
            empty="Everyone is already on this project"
            className="p-1 max-h-[300px] overflow-auto"
            options={candidates.map((p) => ({
              value: p._id,
              label: fullName(p),
              keywords: `${p.title} ${p.email}`,
              hint: p.role === "guest" ? "guest · viewer" : p.title,
              icon: <Avatar user={p} size={18} />,
            }))}
            value={picked}
            onSelect={(id) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))}
          />
          <div className="flex items-center gap-2 p-2 border-t border-line bg-canvas/70">
            <Select
              variant="sm"
              width={132}
              menuWidth={280}
              aria-label="Role for new members"
              value={role}
              onChange={setRole}
              renderValue={(o) => `as ${o.label}`}
              options={[
                { value: "member", label: "Member", description: PROJECT_ROLE_HELP.member },
                { value: "viewer", label: "Viewer", description: PROJECT_ROLE_HELP.viewer },
                { value: "manager", label: "Manager", description: PROJECT_ROLE_HELP.manager, disabled: !can.grantManager, disabledReason: "Only the owner can add managers" },
              ]}
            />
            <button className="btn btn-sm btn-primary ml-auto" disabled={!picked.length || saving} onClick={() => add(close)}>
              {saving ? <Spinner size={12} /> : <LuCheck size={13} />} Add {picked.length || ""}
            </button>
          </div>
        </div>
      )}
    >
      {({ ref, toggle }) => (
        <button ref={ref} onClick={toggle} className="btn btn-sm btn-primary">
          <LuUserPlus size={14} /> Add people
        </button>
      )}
    </Popover>
  );
}

export default function ProjectMembers({ project, compact = false, onLeft }) {
  const ws = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const can = project.can;

  const call = async (fn, message) => {
    try {
      await fn();
      await ws.refreshProjects();
      toast.success(message);
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  const memberIds = new Set([project.owner?._id, ...project.members.map((m) => m.user?._id)]);
  const candidates = ws.people.filter((p) => !memberIds.has(p._id) && p.status === "active");
  const rows = [...project.members]
    .filter((m) => m.user)
    .sort((a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role) || a.user.firstName.localeCompare(b.user.firstName))
    .filter((m) => !q.trim() || `${fullName(m.user)} ${m.user.title}`.toLowerCase().includes(q.toLowerCase()));
  if (project.owner && !project.members.some((m) => m.user?._id === project.owner._id)) rows.unshift({ user: project.owner, role: "owner" });

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <label className="field h-8 flex-1 max-w-[260px]">
          <LuSearch size={13} className="text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${project.members.length} members`} />
        </label>
        <span className="ml-auto" />
        {can.manageMembers ? (
          <AddPeople project={project} candidates={candidates} onDone={() => ws.refreshPeople().catch(() => {})} />
        ) : (
          <Tooltip label="Only the project owner and managers can add people">
            <span className="chip h-7">
              <LuInfo size={12} /> View only
            </span>
          </Tooltip>
        )}
      </div>

      <div className={`card divide-y divide-line ${compact ? "max-h-[46vh] overflow-auto" : ""}`}>
        {rows.map((m) => {
          const u = m.user;
          const isOwner = m.role === "owner";
          const isGuest = u.role === "guest";
          const self = u._id === user._id;
          const canEditRole = can.manageMembers && !isOwner && (can.grantManager || m.role !== "manager");
          const canRemove = !isOwner && (self || (can.manageMembers && (can.grantManager || m.role !== "manager")));
          const roleOptions = ["manager", "member", "viewer"]
            .filter((r) => !isGuest || r === "viewer")
            .map((r) => ({ value: r, label: PROJECT_ROLE[r], hint: PROJECT_ROLE_HELP[r].split(",")[0], disabled: r === "manager" && !can.grantManager, disabledReason: "Only the owner can make managers" }));
          if (can.grantManager && !isGuest && !isOwner) roleOptions.push({ separator: true }, { value: "owner", label: "Transfer ownership", icon: <LuCrown size={13} className="text-amber-500" /> });

          return (
            <div key={u._id} className="group flex items-center gap-3 px-4 h-14 hover:bg-subtle/50 transition-colors">
              <Avatar user={u} size={30} presence />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink truncate flex items-center gap-2">
                  {fullName(u)}
                  {self && <span className="text-xs text-faint font-normal">you</span>}
                  {u.role !== "member" && <RoleBadge role={u.role} />}
                </p>
                <p className="text-xs text-muted truncate">{u.title || u.email}</p>
              </div>
              <Popover
                width={250}
                placement="bottom-end"
                disabled={!canEditRole}
                content={({ close }) => (
                  <OptionList
                    options={roleOptions}
                    value={m.role}
                    onSelect={async (role) => {
                      close();
                      if (role === m.role) return;
                      if (role === "owner") {
                        const ok = await confirm({ title: `Transfer ownership to ${u.firstName}?`, body: "You'll become a manager on this project.", confirmLabel: "Transfer ownership" });
                        if (!ok) return;
                      }
                      call(() => api.patch(`/projects/${project._id}/members/${u._id}`, { role }), role === "owner" ? "Ownership transferred" : `${u.firstName} is now a ${PROJECT_ROLE[role].toLowerCase()}`);
                    }}
                  />
                )}
              >
                {({ ref, toggle }) => (
                  <Tooltip label={canEditRole ? PROJECT_ROLE_HELP[m.role] : isOwner ? "Transfer ownership to change the owner" : can.manageMembers ? "Only the owner can change managers" : PROJECT_ROLE_HELP[m.role]}>
                    <button
                      ref={ref}
                      onClick={toggle}
                      disabled={!canEditRole}
                      className="btn btn-sm btn-secondary w-[108px] justify-between disabled:opacity-100 disabled:shadow-none disabled:bg-transparent"
                    >
                      <span className="flex items-center gap-1">
                        {isOwner && <LuCrown size={12} className="text-amber-500" />}
                        {PROJECT_ROLE[m.role]}
                      </span>
                    </button>
                  </Tooltip>
                )}
              </Popover>
              <span className="w-7">
                {canRemove && (
                  <Tooltip label={self ? "Leave project" : "Remove from project"}>
                    <button
                      className="icon-btn opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-danger"
                      onClick={async () => {
                        const ok = await confirm({
                          title: self ? `Leave ${project.name}?` : `Remove ${u.firstName} from ${project.name}?`,
                          body: "Open tasks assigned to them in this project become unassigned.",
                          confirmLabel: self ? "Leave project" : "Remove",
                          danger: true,
                        });
                        if (!ok) return;
                        const done = await call(() => api.del(`/projects/${project._id}/members/${u._id}`), self ? `You left ${project.name}` : `${u.firstName} removed`);
                        if (done && self) {
                          onLeft?.();
                          navigate("/home");
                        }
                      }}
                    >
                      {self ? <LuLogOut size={14} /> : <LuX size={14} />}
                    </button>
                  </Tooltip>
                )}
              </span>
            </div>
          );
        })}
        {!rows.length && <p className="px-4 py-6 text-center text-[13px] text-faint">No one matches “{q}”</p>}
      </div>

      {!compact && (
        <div className="mt-5 rounded-xl bg-canvas p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-ink-2 mb-2">
            <LuInfo size={13} /> What each project role can do
          </p>
          <dl className="grid gap-1.5">
            {Object.entries(PROJECT_ROLE_HELP).map(([r, text]) => (
              <div key={r} className="grid grid-cols-[80px_1fr] text-xs">
                <dt className="font-medium text-ink-2">{PROJECT_ROLE[r]}</dt>
                <dd className="text-muted">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
