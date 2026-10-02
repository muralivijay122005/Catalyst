// src/components/channel/ChannelMembers.jsx
// Members and settings for a channel. Controls follow channel.can from the server:
// members invite people, the creator/admins/managers remove people and edit the channel,
// anyone can leave; project channels mirror the project team.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuUserPlus, LuX, LuLogOut, LuSearch, LuCheck, LuInfo, LuFolder, LuTrash2, LuHash, LuMegaphone } from "react-icons/lu";
import Modal from "../ui/Modal";
import Popover, { OptionList } from "../ui/Popover";
import { Avatar } from "../ui/Avatar";
import { ProjectMark, RoleBadge, Segmented, Spinner, Switch, Tooltip } from "../ui/primitives";
import { toast } from "../ui/toast";
import { confirm } from "../ui/confirm";
import { api } from "../../lib/api";
import { fullName } from "../../lib/format";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";

function AddPeople({ channel, onAdded }) {
  const ws = useWorkspace();
  const [picked, setPicked] = useState([]);
  const [saving, setSaving] = useState(false);
  const memberIds = new Set(channel.members.map((m) => m._id));
  const candidates = ws.people.filter((p) => !memberIds.has(p._id) && p.status === "active");

  return (
    <Popover
      width={320}
      placement="bottom-end"
      onOpenChange={(o) => !o && setPicked([])}
      content={({ close }) => (
        <div className="menu p-0 overflow-hidden">
          <OptionList
            multiple
            searchable
            className="p-1 max-h-[300px] overflow-auto"
            placeholder="Search people to add…"
            empty="Everyone is already here"
            options={candidates.map((p) => ({
              value: p._id,
              label: fullName(p),
              keywords: `${p.title} ${p.email}`,
              hint: p.role === "guest" ? "guest" : p.title,
              icon: <Avatar user={p} size={18} />,
              disabled: p.role === "guest" && !channel.can.addGuests,
              disabledReason: "Only admins and managers can add guests",
            }))}
            value={picked}
            onSelect={(id) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))}
          />
          <div className="flex items-center gap-2 p-2 border-t border-line bg-canvas/70">
            <span className="text-xs text-muted pl-1">{picked.length ? `${picked.length} selected` : "Select people"}</span>
            <button
              className="btn btn-sm btn-primary ml-auto"
              disabled={!picked.length || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  const updated = await api.post(`/channels/${channel._id}/members`, { userIds: picked });
                  toast.success(picked.length === 1 ? `${fullName(candidates.find((c) => c._id === picked[0]))} added to #${channel.name}` : `${picked.length} people added to #${channel.name}`);
                  onAdded(updated);
                  close();
                } catch (err) {
                  toast.error(err.message);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? <Spinner size={12} /> : <LuCheck size={13} />} Add
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

function ChannelSettings({ channel, onChanged, onDeleted }) {
  const { can } = useAuth();
  const [form, setForm] = useState({ name: channel.name, topic: channel.topic || "", locked: Boolean(channel.locked) });
  const [saving, setSaving] = useState(false);
  const dirty = form.name !== channel.name || form.topic !== (channel.topic || "") || form.locked !== Boolean(channel.locked);
  const editable = channel.can.edit;

  return (
    <div className="space-y-4">
      {!editable && (
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <LuInfo size={13} /> Only the channel creator, admins and managers can change these.
        </p>
      )}
      <fieldset disabled={!editable} className="space-y-4">
        <div>
          <label className="label">Name</label>
          <label className="field">
            <LuHash size={14} className="text-faint" />
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/\s+/g, "-") })} />
          </label>
        </div>
        <div>
          <label className="label">Topic</label>
          <input className="field" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="What's this channel for?" />
        </div>
        {can("channel.announce") && (
          <label className="flex items-start gap-3 p-3 rounded-xl bg-canvas cursor-pointer">
            <Switch checked={form.locked} onChange={(v) => setForm({ ...form, locked: v })} label="Announcements only" />
            <span>
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                <LuMegaphone size={13} /> Announcements only
              </span>
              <span className="block text-xs text-muted mt-0.5">Only admins and managers can post; everyone can read.</span>
            </span>
          </label>
        )}
      </fieldset>
      <div className="flex items-center gap-2 pt-1">
        {channel.can.delete && (
          <button
            className="btn btn-danger"
            onClick={async () => {
              const ok = await confirm({ title: `Delete #${channel.name}?`, body: "All messages in the channel are permanently deleted. Knowledge saved from it stays.", confirmLabel: "Delete channel", danger: true, requireText: channel.name });
              if (!ok) return;
              try {
                await api.del(`/channels/${channel._id}`);
                toast.success(`#${channel.name} deleted`);
                onDeleted();
              } catch (err) {
                toast.error(err.message);
              }
            }}
          >
            <LuTrash2 size={14} /> Delete channel
          </button>
        )}
        {editable && (
          <button
            className="btn btn-primary ml-auto"
            disabled={!dirty || saving}
            onClick={async () => {
              setSaving(true);
              try {
                const updated = await api.patch(`/channels/${channel._id}`, form);
                toast.success("Channel updated");
                onChanged(updated);
              } catch (err) {
                toast.error(err.message);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving && <Spinner size={13} />} Save changes
          </button>
        )}
      </div>
    </div>
  );
}

export default function ChannelMembers({ channel, initialTab = "members", onClose, onChanged, onLeft }) {
  const { user } = useAuth();
  const ws = useWorkspace();
  const navigate = useNavigate();
  const [tab, setTab] = useState(initialTab);
  const [q, setQ] = useState("");
  const can = channel.can || {};
  const project = channel.project ? ws.projectByKey(channel.project.key) : null;

  const members = [...channel.members]
    .sort((a, b) => Number(b._id === channel.createdBy) - Number(a._id === channel.createdBy) || a.firstName.localeCompare(b.firstName))
    .filter((m) => !q.trim() || `${fullName(m)} ${m.title}`.toLowerCase().includes(q.toLowerCase()));

  const remove = async (m) => {
    const self = m._id === user._id;
    const ok = await confirm({
      title: self ? `Leave #${channel.name}?` : `Remove ${m.firstName} from #${channel.name}?`,
      body: self ? (channel.kind === "private" ? "You'll need someone to add you back." : "You can rejoin any time.") : "They'll lose access to this channel's messages.",
      confirmLabel: self ? "Leave channel" : "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      const updated = await api.del(`/channels/${channel._id}/members/${m._id}`);
      toast.success(self ? `You left #${channel.name}` : `${m.firstName} removed`);
      if (self) onLeft(updated);
      else onChanged(updated);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Modal
      size="md"
      title={
        <span className="flex items-center gap-2">
          {channel.project ? <ProjectMark project={channel.project} size={18} /> : channel.locked ? <LuMegaphone size={16} /> : <LuHash size={16} />}
          {channel.name}
        </span>
      }
      description={`${channel.members.length} ${channel.members.length === 1 ? "member" : "members"}${channel.kind === "private" ? " · private" : ""}`}
      onClose={onClose}
    >
      {!can.managedByProject && (
        <div className="mb-4">
          <Segmented
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { value: "members", label: "Members", count: channel.members.length },
              { value: "settings", label: "Settings" },
            ]}
          />
        </div>
      )}

      {tab === "settings" && !can.managedByProject ? (
        <ChannelSettings channel={channel} onChanged={onChanged} onDeleted={() => { onClose(); navigate("/channels"); }} />
      ) : (
        <>
          {can.managedByProject && (
            <div className="flex items-start gap-3 p-3 mb-4 rounded-xl bg-accent-soft/70" style={{ boxShadow: "inset 0 0 0 1px rgb(37 99 235 / 0.12)" }}>
              <LuFolder size={15} className="text-accent mt-0.5" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-ink">Members follow the {channel.project.name} team</p>
                <p className="text-xs text-muted mt-0.5">Add or remove people on the project and this channel updates automatically.</p>
              </div>
              {project && (
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => {
                    onClose();
                    navigate(`/projects/${project.key}/${project.can.manageMembers ? "settings" : "overview"}`);
                  }}
                >
                  {project.can.manageMembers ? "Manage team" : "View project"}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <label className="field h-8 flex-1">
              <LuSearch size={13} className="text-faint" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members" />
            </label>
            {can.addMembers && <AddPeople channel={channel} onAdded={onChanged} />}
          </div>

          <div className="card divide-y divide-line max-h-[44vh] overflow-auto">
            {members.map((m) => {
              const self = m._id === user._id;
              const creator = m._id === channel.createdBy;
              const removable = self ? can.leave : can.removeMembers;
              return (
                <div key={m._id} className="group flex items-center gap-3 px-3.5 h-[52px] hover:bg-subtle/50 transition-colors">
                  <Avatar user={m} size={28} presence />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate flex items-center gap-2">
                      {fullName(m)}
                      {self && <span className="text-xs font-normal text-faint">you</span>}
                    </p>
                    <p className="text-xs text-muted truncate">{m.title}</p>
                  </div>
                  {creator && <span className="chip h-5 text-[11px]">Creator</span>}
                  {m.role !== "member" && <RoleBadge role={m.role} />}
                  <span className="w-7">
                    {removable && (
                      <Tooltip label={self ? "Leave channel" : "Remove from channel"}>
                        <button className="icon-btn opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-danger" onClick={() => remove(m)}>
                          {self ? <LuLogOut size={14} /> : <LuX size={14} />}
                        </button>
                      </Tooltip>
                    )}
                  </span>
                </div>
              );
            })}
            {!members.length && <p className="px-4 py-6 text-center text-[13px] text-faint">No one matches “{q}”</p>}
          </div>

          {!can.managedByProject && (
            <p className="mt-3 text-xs text-muted flex items-center gap-1.5">
              <LuInfo size={12} />
              {can.removeMembers ? "You can add and remove people here." : can.addMembers ? "You can add people. The creator, admins and managers can remove people." : "Only members can add people to this channel."}
            </p>
          )}
        </>
      )}
    </Modal>
  );
}
