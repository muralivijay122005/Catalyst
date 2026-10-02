// src/pages/Approvals.jsx
import { useState } from "react";
import { LuShieldCheck, LuCheck, LuCircleX, LuInfo } from "react-icons/lu";
import PageHeader from "../components/layout/PageHeader";
import Modal from "../components/ui/Modal";
import { Avatar } from "../components/ui/Avatar";
import { EmptyState, ProjectMark, SkeletonRows, Tooltip } from "../components/ui/primitives";
import { PriorityIcon } from "../components/ui/icons";
import { toast } from "../components/ui/toast";
import { useApi } from "../lib/hooks";
import { api } from "../lib/api";
import { fullName, timeAgo } from "../lib/format";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";
import { DueChip, LabelChips } from "../components/task/TaskRow";

export default function Approvals() {
  const ws = useWorkspace();
  const { user } = useAuth();
  const { data, loading, setData } = useApi("/tasks?approval=pending", [ws.taskVersion]);
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState("");
  const [leaving, setLeaving] = useState({});

  const actionable = (data || []).filter((t) => t.can?.approve);
  const blocked = (data || []).filter((t) => !t.can?.approve && ws.projectByKey(t.project.key)?.can?.approve);
  const mine = (data || []).filter((t) => (t.approval?.requestedBy?._id || t.approval?.requestedBy) === user._id);

  const act = async (task, kind, body) => {
    setLeaving((l) => ({ ...l, [task._id]: true }));
    try {
      await api.post(`/tasks/${task._id}/${kind}`, body);
      toast.success(kind === "approve" ? `${task.ref} approved` : `Changes requested on ${task.ref}`);
      setTimeout(() => setData((list) => list.filter((t) => t._id !== task._id)), 220);
      ws.taskChanged();
    } catch (err) {
      setLeaving((l) => ({ ...l, [task._id]: false }));
      toast.error(err.message);
    }
  };

  const renderCard = ({ t, i, canAct, reason }) => (
    <div
      key={t._id}
      className="card p-4 flex flex-col gap-3"
      style={{
        "--i": i,
        transition: "opacity 200ms ease, transform 220ms var(--ease-out-expo)",
        opacity: leaving[t._id] ? 0 : 1,
        transform: leaving[t._id] ? "translateX(16px)" : "none",
      }}
    >
      <button onClick={() => ws.openTask(t.ref)} className="text-left">
        <span className="flex items-center gap-2 text-xs text-muted">
          <ProjectMark project={t.project} size={14} />
          <span className="mono">{t.ref}</span>
          <PriorityIcon priority={t.priority} size={12} />
          <DueChip date={t.dueDate} status={t.status} className="ml-auto" />
        </span>
        <span className="block mt-1.5 text-[14px] font-medium text-ink leading-snug hover:text-accent transition-colors">{t.title}</span>
      </button>
      <div className="flex items-center gap-2">
        <LabelChips labels={t.labels} project={ws.projectByKey(t.project.key)} />
        {t.checklistTotal > 0 && (
          <span className="text-xs text-muted tabular-nums">
            Checklist {t.checklistDone}/{t.checklistTotal}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-line">
        <Avatar user={t.approval?.requestedBy} size={22} />
        <span className="text-xs text-muted flex-1 min-w-0 truncate">
          <span className="text-ink-2 font-medium">{fullName(t.approval?.requestedBy)}</span> submitted {timeAgo(t.approval?.requestedAt)}
        </span>
        {canAct ? (
          <>
            <button className="btn btn-sm btn-secondary" onClick={() => setRejecting(t)}>
              <LuCircleX size={13} /> Changes
            </button>
            <button className="btn btn-sm btn-accent" onClick={() => act(t, "approve")}>
              <LuCheck size={13} /> Approve
            </button>
          </>
        ) : (
          <Tooltip label={reason}>
            <span className="chip">
              <LuInfo size={11} /> Needs another reviewer
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );

  return (
    <>
      <PageHeader icon={<LuShieldCheck size={15} />} title="Approvals" subtitle="Work submitted for review in projects you manage" />
      <div className="flex-1 scroll">
        <div className="max-w-[1080px] mx-auto px-6 py-6 space-y-8">
          {loading && !data && <SkeletonRows rows={6} />}
          {data && !actionable.length && !blocked.length && (
            <EmptyState icon={LuShieldCheck} title="No reviews waiting">
              When members finish work in projects that require approval, it lands here for a manager to approve.
            </EmptyState>
          )}
          {actionable.length > 0 && (
            <section>
              <h2 className="h-section mb-3">
                Ready for your review <span className="text-faint font-normal tabular-nums">{actionable.length}</span>
              </h2>
              <div className="grid md:grid-cols-2 gap-3 stagger">
                {actionable.map((t, i) => (
                  renderCard({ t, i, canAct: true })
                ))}
              </div>
            </section>
          )}
          {blocked.length > 0 && (
            <section>
              <h2 className="h-section mb-1">Needs another reviewer</h2>
              <p className="text-xs text-muted mb-3">You submitted or are assigned to these, so someone else has to approve them.</p>
              <div className="grid md:grid-cols-2 gap-3 stagger">
                {blocked.map((t, i) => (
                  renderCard({ t, i, reason: "Separation of duties: you can't approve your own work" })
                ))}
              </div>
            </section>
          )}
          {mine.length > 0 && !blocked.length && (
            <p className="text-xs text-muted">{mine.length} of your submissions are waiting for review.</p>
          )}
        </div>
      </div>

      {rejecting && (
        <Modal
          title={`Request changes on ${rejecting.ref}`}
          description="It goes back to In progress and the assignee gets your note."
          size="sm"
          onClose={() => {
            setRejecting(null);
            setNote("");
          }}
          footer={(close) => (
            <>
              <button className="btn btn-secondary" onClick={close}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!note.trim()}
                onClick={() => {
                  act(rejecting, "reject", { note: note.trim() });
                  close();
                }}
              >
                Send back
              </button>
            </>
          )}
        >
          <textarea className="field" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What needs to change?" />
        </Modal>
      )}
    </>
  );
}
