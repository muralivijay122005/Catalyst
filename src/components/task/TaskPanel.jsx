// src/components/task/TaskPanel.jsx
// Slide-over task detail. Every control is driven by the server's field-level permissions (task.can).
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  LuX,
  LuLink,
  LuEllipsis,
  LuTrash2,
  LuBrain,
  LuShieldCheck,
  LuCircleX,
  LuCheck,
  LuPlus,
  LuHand,
  LuSmilePlus,
  LuPencil,
  LuArrowUpRight,
  LuMessageSquare,
  LuHistory,
  LuLock,
  LuGripVertical,
} from "react-icons/lu";
import { api } from "../../lib/api";
import { useExit } from "../../lib/hooks";
import { useEscape } from "../../lib/escape";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { toast } from "../ui/toast";
import { confirm } from "../ui/confirm";
import { Avatar } from "../ui/Avatar";
import Popover from "../ui/Popover";
import { CheckCircle } from "../ui/icons";
import { Kbd, ProgressBar, ProjectMark, Spinner, Tooltip, Segmented } from "../ui/primitives";
import { Markdown, renderInline } from "../../lib/markdown";
import { StatusPicker, PriorityPicker, AssigneePicker, LabelPicker, MilestonePicker, DateButton } from "./pickers";
import { contributors } from "../../lib/people";
import { patchTask } from "./taskApi";
import RelatedKnowledge from "../kb/RelatedKnowledge";
import MentionInput from "../ui/MentionInput";
import MemoryEditor from "../kb/MemoryEditor";
import Modal from "../ui/Modal";
import { STATUS, PRIORITY, PROJECT_ROLE } from "../../lib/constants";
import { formatDate, fullName, timeAgo } from "../../lib/format";

const REACTIONS = ["👍", "🎉", "👀", "❤️", "🚀"];

function Prop({ label, children }) {
  return (
    <div className="grid grid-cols-[92px_1fr] items-center min-h-8 gap-2">
      <span className="text-[12.5px] text-muted">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ApprovalBanner({ task, onApprove, onReject, busy }) {
  const a = task.approval || {};
  if (a.state === "pending") {
    return (
      <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-accent-soft" style={{ boxShadow: "inset 0 0 0 1px rgb(37 99 235 / 0.15)", animation: "var(--animate-enter)" }}>
        <span className="grid place-items-center size-8 rounded-lg bg-surface text-accent shadow-[var(--shadow-xs)]">
          <LuShieldCheck size={16} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-ink">Waiting for review</p>
          <p className="text-xs text-muted">
            {a.requestedBy ? `${fullName(a.requestedBy)} submitted this ${timeAgo(a.requestedAt)}.` : "Submitted for review."}{" "}
            {!task.can?.approve && "A project manager will approve it."}
          </p>
        </div>
        {task.can?.approve && (
          <div className="flex items-center gap-1.5">
            <button className="btn btn-sm btn-secondary" disabled={busy} onClick={onReject}>
              <LuCircleX size={13} /> Request changes
            </button>
            <button className="btn btn-sm btn-accent" disabled={busy} onClick={onApprove}>
              <LuCheck size={13} /> Approve
            </button>
          </div>
        )}
      </div>
    );
  }
  if (a.state === "rejected" && task.status !== "done") {
    return (
      <div className="px-3.5 py-3 rounded-xl bg-red-50" style={{ boxShadow: "inset 0 0 0 1px rgb(220 38 38 / 0.15)" }}>
        <p className="text-[13px] font-medium text-red-700">Changes requested by {fullName(a.reviewedBy) || "a manager"}</p>
        {a.note && <p className="text-xs text-red-700/80 mt-0.5">{a.note}</p>}
      </div>
    );
  }
  if (a.state === "approved" && task.status === "done") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <LuShieldCheck size={13} className="text-ok" /> Approved by {fullName(a.reviewedBy) || "a manager"} {a.reviewedAt && timeAgo(a.reviewedAt)}
        {a.note && <span className="text-faint">— “{a.note}”</span>}
      </p>
    );
  }
  return null;
}

function Checklist({ items, editable, onChange }) {
  const [draft, setDraft] = useState("");
  const done = items.filter((i) => i.done).length;
  const add = () => {
    if (!draft.trim()) return;
    onChange([...items, { text: draft.trim(), done: false }]);
    setDraft("");
  };
  if (!items.length && !editable) return null;
  return (
    <section>
      <div className="flex items-center gap-3 mb-2">
        <h3 className="h-section">Checklist</h3>
        {items.length > 0 && (
          <>
            <span className="text-xs text-muted tabular-nums">
              {done}/{items.length}
            </span>
            <ProgressBar value={(done / items.length) * 100} className="max-w-[140px]" height={4} color={done === items.length ? "var(--color-ok)" : "var(--color-accent)"} />
          </>
        )}
      </div>
      <div className="space-y-0.5">
        {items.map((item, i) => (
          <div key={item._id || i} className="group flex items-center gap-2.5 min-h-8 px-2 -mx-2 rounded-md hover:bg-subtle">
            <LuGripVertical size={12} className="text-faint opacity-0 -ml-1" />
            <CheckCircle checked={item.done} disabled={!editable} onClick={() => onChange(items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} />
            <span className={`flex-1 text-[13px] transition-colors ${item.done ? "text-faint line-through" : "text-ink-2"}`}>{item.text}</span>
            {editable && (
              <button className="icon-btn size-6 opacity-0 group-hover:opacity-100" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove item">
                <LuX size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
      {editable && (
        <div className="flex items-center gap-2.5 h-8 mt-0.5">
          <LuPlus size={14} className="text-faint ml-0.5" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            onBlur={add}
            placeholder="Add an item"
            className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-faint"
          />
        </div>
      )}
    </section>
  );
}

function ActivityLine({ a, people, task }) {
  const who = a.actor ? fullName(a.actor) : "Someone";
  const userName = (id) => fullName(people.find((p) => p._id === id)) || "someone";
  const milestone = (id) => task.project?.milestones?.find((m) => m._id === id)?.name || "a milestone";
  let text;
  if (a.action === "created") text = "created the task";
  else if (a.action === "commented") text = "commented";
  else if (a.action === "approved") text = "approved the work";
  else if (a.action === "rejected") text = "requested changes";
  else if (a.action === "picked_up") text = "picked up the task";
  else if (a.field === "status") text = <>moved it from <b className="font-medium text-ink-2">{STATUS[a.from]?.label}</b> to <b className="font-medium text-ink-2">{STATUS[a.to]?.label}</b></>;
  else if (a.field === "assignee") text = a.to ? <>assigned it to <b className="font-medium text-ink-2">{userName(a.to)}</b></> : "removed the assignee";
  else if (a.field === "priority") text = <>set priority to <b className="font-medium text-ink-2">{PRIORITY[a.to]?.label}</b></>;
  else if (a.field === "dueDate") text = a.to ? <>set the due date to <b className="font-medium text-ink-2">{formatDate(a.to)}</b></> : "removed the due date";
  else if (a.field === "startDate") text = a.to ? <>set the start date to {formatDate(a.to)}</> : "removed the start date";
  else if (a.field === "checklist") text = <>updated the checklist ({a.to})</>;
  else if (a.field === "milestone") text = a.to ? <>moved it to {milestone(a.to)}</> : "removed the milestone";
  else if (a.field === "labels") text = "updated labels";
  else if (a.field === "description") text = "edited the description";
  else if (a.field === "title") text = <>renamed it to “{a.to}”</>;
  else if (a.field === "estimate") text = <>set the estimate to {a.to ?? "none"}</>;
  else text = `updated ${a.field || "the task"}`;
  return (
    <div className="flex items-start gap-2.5 py-1.5 text-[12.5px] text-muted">
      <Avatar user={a.actor} size={18} />
      <p className="flex-1 leading-[18px]">
        <span className="font-medium text-ink-2">{who}</span> {text}
      </p>
      <span className="text-[11.5px] text-faint whitespace-nowrap">{timeAgo(a.at)}</span>
    </div>
  );
}

export default function TaskPanel({ taskRef, onClose }) {
  const { user } = useAuth();
  const ws = useWorkspace();
  const navigate = useNavigate();
  const [closing, close] = useExit(onClose, 200);
  const [task, setTask] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("comments");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [desc, setDesc] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [capture, setCapture] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const titleRef = useRef(null);
  useEscape(close, !capture && !rejecting);

  useEffect(() => {
    let alive = true;
    api(`/tasks/${encodeURIComponent(taskRef)}`)
      .then((t) => {
        if (!alive) return;
        setTask(t);
        setTitle(t.title);
        setDesc(t.description);
      })
      .catch((err) => alive && setError(err));
    return () => {
      alive = false;
    };
  }, [taskRef]);

  useEffect(() => {
    const el = titleRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [title, task]);

  const project = ws.projectByKey(task?.project?.key);
  const people = useMemo(() => contributors(project), [project]);
  const can = task?.can || { fields: [] };
  const may = (f) => can.fields?.includes(f);
  const canAssignOthers = project?.can?.assign;

  const update = async (patch) => {
    const prev = task;
    setTask((t) => ({ ...t, ...patch, assignee: "assignee" in patch ? people.find((p) => p._id === patch.assignee) || null : t.assignee }));
    try {
      const updated = await patchTask(task, patch, { quiet: true });
      setTask(updated);
      ws.taskChanged();
    } catch {
      setTask(prev);
    }
  };

  const run = async (fn, success) => {
    setBusy(true);
    try {
      const updated = await fn();
      setTask(updated);
      ws.taskChanged();
      if (success) toast.success(success);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const sendComment = async () => {
    if (!comment.trim() || sending) return;
    setSending(true);
    try {
      const updated = await api.post(`/tasks/${task._id}/comments`, { text: comment.trim() });
      setTask(updated);
      setComment("");
      ws.taskChanged();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const saveCommentToKb = async (c) => {
    try {
      const { memory, duplicates } = await api.post("/memories/from-comment", { task: task.ref, commentId: c._id });
      toast.success("Saved to the Knowledge Base", {
        description: duplicates?.length ? `Similar to “${duplicates[0].title}” — consider linking them.` : "Linked to this task so others find it.",
        action: { label: "Open", onClick: () => navigate(`/kb/${memory._id}`) },
      });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async () => {
    const ok = await confirm({ title: `Delete ${task.ref}?`, body: "The task, its comments and history will be permanently removed.", confirmLabel: "Delete task", danger: true });
    if (!ok) return;
    try {
      await api.del(`/tasks/${task._id}`);
      toast.success(`${task.ref} deleted`);
      ws.taskChanged();
      close();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?task=${task.ref}`;
    navigator.clipboard?.writeText(url).then(() => toast.success("Link copied", { description: url }));
  };

  const myRole = project?.can?.role;
  const readOnlyReason = !may("status") && !may("title") ? (myRole === "viewer" ? "You have view access to this project" : "Only the assignee and project managers can edit this task") : null;
  const lockHint = canAssignOthers ? undefined : myRole === "viewer" ? "Viewers can't edit tasks" : "Only project managers can change this";

  return createPortal(
    <div className="fixed inset-0 z-[60]" style={{ pointerEvents: "none" }}>
      <div
        className="absolute inset-0"
        style={{ pointerEvents: "auto", background: "rgb(10 10 11 / 0.18)", animation: closing ? "fade-out 200ms ease-in both" : "fade 220ms ease-out both" }}
        onMouseDown={close}
      />
      <aside
        className="absolute top-2 right-2 bottom-2 w-[min(940px,calc(100vw-16px))] bg-surface rounded-xl flex flex-col overflow-hidden"
        style={{ pointerEvents: "auto", boxShadow: "var(--shadow-panel)", animation: closing ? "panel-out 200ms ease-in both" : "var(--animate-panel)" }}
        role="dialog"
        aria-label={task ? `${task.ref} ${task.title}` : "Task"}
      >
        {/* Header */}
        <header className="flex items-center gap-2 h-12 px-4 border-b border-line shrink-0">
          {task ? (
            <>
              <button onClick={() => { navigate(`/projects/${task.project.key}`); }} className="flex items-center gap-2 text-[13px] text-muted hover:text-ink transition-colors">
                <ProjectMark project={task.project} size={16} />
                {task.project.name}
              </button>
              <span className="text-faint">/</span>
              <span className="mono text-[12.5px] text-ink-2">{task.ref}</span>
              {readOnlyReason && (
                <span className="chip h-5 text-[11px] ml-1">
                  <LuLock size={10} /> {readOnlyReason}
                </span>
              )}
            </>
          ) : (
            <span className="skeleton h-4 w-40" />
          )}
          <div className="ml-auto flex items-center gap-0.5">
            {task && (
              <>
                <Tooltip label="Copy link">
                  <button className="icon-btn" onClick={copyLink} aria-label="Copy link">
                    <LuLink size={15} />
                  </button>
                </Tooltip>
                <Popover
                  placement="bottom-end"
                  width={220}
                  content={({ close: c }) => (
                    <div className="menu">
                      {project?.can?.writeKb && (
                        <button className="menu-item" onClick={() => { c(); setCapture({}); }}>
                          <LuBrain size={14} className="text-accent" /> Capture as knowledge
                        </button>
                      )}
                      <button className="menu-item" onClick={() => { c(); navigate(`/projects/${task.project.key}/board`); }}>
                        <LuArrowUpRight size={14} className="text-muted" /> Open in project
                      </button>
                      <div className="menu-sep" />
                      <Tooltip label={can.delete ? null : "Only managers, or the creator before work starts, can delete"}>
                        <button className="menu-item text-danger" disabled={!can.delete} onClick={() => { c(); remove(); }}>
                          <LuTrash2 size={14} /> Delete task
                        </button>
                      </Tooltip>
                    </div>
                  )}
                >
                  {({ ref, toggle }) => (
                    <button ref={ref} className="icon-btn" onClick={toggle} aria-label="More actions">
                      <LuEllipsis size={16} />
                    </button>
                  )}
                </Popover>
              </>
            )}
            <Tooltip label="Close" keys={["Esc"]}>
              <button className="icon-btn" onClick={close} aria-label="Close">
                <LuX size={16} />
              </button>
            </Tooltip>
          </div>
        </header>

        {error && <div className="p-10 text-center text-[13px] text-muted">{error.status === 404 ? "This task doesn't exist or you don't have access to it." : error.message}</div>}

        {!task && !error && (
          <div className="p-8 space-y-4">
            <span className="skeleton block h-7 w-2/3" />
            <span className="skeleton block h-4 w-full" />
            <span className="skeleton block h-4 w-5/6" />
          </div>
        )}

        {task && (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
            {/* Main column */}
            <div className="flex-1 min-w-0 scroll">
              <div className="px-7 pt-6 pb-8 space-y-6 max-w-[640px]">
                <ApprovalBanner
                  task={task}
                  busy={busy}
                  onApprove={() => run(() => api.post(`/tasks/${task._id}/approve`), `${task.ref} approved`)}
                  onReject={() => setRejecting(true)}
                />

                <textarea
                  ref={titleRef}
                  rows={1}
                  value={title}
                  readOnly={!may("title")}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
                  onBlur={() => title.trim() && title.trim() !== task.title && update({ title: title.trim() })}
                  className="w-full bg-transparent outline-none resize-none text-[22px] leading-8 font-semibold tracking-tight text-ink rounded-md -mx-1 px-1 read-only:cursor-default focus:bg-subtle/60"
                />

                {/* Description */}
                <section>
                  {editingDesc ? (
                    <div className="field h-auto flex-col items-stretch p-3">
                      <textarea
                        autoFocus
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        rows={Math.max(5, desc.split("\n").length + 1)}
                        placeholder="Add a description… Markdown supported."
                        className="w-full bg-transparent outline-none resize-none text-[13.5px] leading-relaxed"
                        onKeyDown={(e) => {
                          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                            update({ description: desc });
                            setEditingDesc(false);
                          }
                        }}
                      />
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button className="btn btn-sm btn-ghost" onClick={() => { setDesc(task.description); setEditingDesc(false); }}>
                          Cancel
                        </button>
                        <button className="btn btn-sm btn-primary" onClick={() => { update({ description: desc }); setEditingDesc(false); }}>
                          Save
                        </button>
                      </div>
                    </div>
                  ) : task.description ? (
                    <div
                      className={`group relative rounded-lg -mx-2 px-2 py-1 ${may("description") ? "hover:bg-subtle/70 cursor-text" : ""}`}
                      onClick={() => may("description") && setEditingDesc(true)}
                    >
                      <Markdown text={task.description} onTaskRef={(r) => ws.openTask(r)} />
                      {may("description") && <LuPencil size={13} className="absolute top-2 right-2 text-faint opacity-0 group-hover:opacity-100" />}
                    </div>
                  ) : may("description") ? (
                    <button onClick={() => setEditingDesc(true)} className="text-[13.5px] text-faint hover:text-muted">
                      Add a description…
                    </button>
                  ) : null}
                </section>

                <Checklist items={task.checklist || []} editable={may("checklist")} onChange={(checklist) => update({ checklist })} />

                {/* Comments / activity */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <Segmented
                      size="sm"
                      value={tab}
                      onChange={setTab}
                      options={[
                        { value: "comments", label: "Comments", icon: <LuMessageSquare size={12} />, count: task.comments.length || null },
                        { value: "activity", label: "Activity", icon: <LuHistory size={12} /> },
                      ]}
                    />
                  </div>

                  {tab === "comments" ? (
                    <div className="space-y-4">
                      {task.comments.length === 0 && <p className="text-[13px] text-faint">No comments yet. Decisions made here can be saved to the Knowledge Base.</p>}
                      <div className="space-y-4 stagger">
                        {task.comments.map((c, i) => (
                          <div key={c._id} className="group flex gap-3" style={{ "--i": i }}>
                            <Avatar user={c.author} size={26} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="text-[13px] font-medium text-ink">{fullName(c.author)}</span>
                                <span className="text-[11.5px] text-faint">{timeAgo(c.createdAt)}</span>
                                <span className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Popover
                                    width={190}
                                    content={({ close: c2 }) => (
                                      <div className="menu flex gap-0.5 min-w-0 p-1">
                                        {REACTIONS.map((emoji) => (
                                          <button
                                            key={emoji}
                                            className="size-8 grid place-items-center rounded-md text-base hover:bg-subtle transition-transform hover:scale-110"
                                            onClick={() => {
                                              c2();
                                              run(() => api.post(`/tasks/${task._id}/comments/${c._id}/react`, { emoji }));
                                            }}
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  >
                                    {({ ref, toggle }) => (
                                      <button ref={ref} onClick={toggle} className="icon-btn size-6" aria-label="React">
                                        <LuSmilePlus size={13} />
                                      </button>
                                    )}
                                  </Popover>
                                  {project?.can?.writeKb && (
                                    <Tooltip label="Save to Knowledge Base">
                                      <button className="icon-btn size-6 hover:text-accent" onClick={() => saveCommentToKb(c)} aria-label="Save to Knowledge Base">
                                        <LuBrain size={13} />
                                      </button>
                                    </Tooltip>
                                  )}
                                  {(c.author?._id === user._id || project?.can?.editAny) && (
                                    <Tooltip label="Delete comment">
                                      <button
                                        className="icon-btn size-6 hover:text-danger"
                                        onClick={async () => {
                                          if (await confirm({ title: "Delete this comment?", confirmLabel: "Delete", danger: true })) {
                                            run(() => api.del(`/tasks/${task._id}/comments/${c._id}`));
                                          }
                                        }}
                                        aria-label="Delete comment"
                                      >
                                        <LuTrash2 size={12} />
                                      </button>
                                    </Tooltip>
                                  )}
                                </span>
                              </div>
                              <div className="mt-0.5 text-[13.5px] leading-relaxed text-ink-2 whitespace-pre-wrap break-words">{renderInline(c.text, { onTaskRef: ws.openTask, people: ws.people, me: user.username })}</div>
                              {c.reactions?.length > 0 && (
                                <div className="flex gap-1 mt-1.5">
                                  {c.reactions.map((r) => {
                                    const mine = r.users.some((u) => (u._id || u) === user._id);
                                    return (
                                      <button
                                        key={r.emoji}
                                        onClick={() => run(() => api.post(`/tasks/${task._id}/comments/${c._id}/react`, { emoji: r.emoji }))}
                                        className={`inline-flex items-center gap-1 h-6 px-1.5 rounded-full text-xs transition-colors ${mine ? "bg-accent-soft text-accent shadow-[inset_0_0_0_1px_rgb(37_99_235/0.25)]" : "bg-subtle text-muted hover:bg-line"}`}
                                      >
                                        {r.emoji} <span className="tabular-nums">{r.users.length}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {can.comment ? (
                        <div className="flex gap-3 pt-1">
                          <Avatar user={user} size={26} />
                          <div className="flex-1 field h-auto flex-col items-stretch p-2.5 gap-2">
                            <MentionInput value={comment} onChange={setComment} onSubmit={sendComment} people={people.filter((p) => p._id !== user._id)} placeholder="Leave a comment… Type @ to mention someone." />
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-faint flex items-center gap-1">
                                <Kbd keys={["mod", "Enter"]} /> to send
                              </span>
                              <button className="btn btn-sm btn-primary" disabled={!comment.trim() || sending} onClick={sendComment}>
                                {sending && <Spinner size={12} />} Comment
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-faint flex items-center gap-1.5">
                          <LuLock size={12} /> You can't comment on this project.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="stagger">
                      {[...(task.activity || [])].reverse().map((a, i) => (
                        <div key={i} style={{ "--i": i }}>
                          <ActivityLine a={a} people={ws.people} task={task} />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>

            {/* Properties & knowledge */}
            <aside className="lg:w-[300px] shrink-0 border-t lg:border-t-0 lg:border-l border-line bg-canvas/50 scroll">
              <div className="p-5 space-y-1">
                {can.pickUp && (
                  <button className="btn btn-accent w-full mb-3" disabled={busy} onClick={() => run(() => api.post(`/tasks/${task._id}/pickup`), `You picked up ${task.ref}`)}>
                    <LuHand size={14} /> Pick up this task
                  </button>
                )}
                <Prop label="Status">
                  <StatusPicker
                    value={task.status}
                    disabled={!may("status")}
                    lockHint="Only the assignee and project managers can change status"
                    onChange={(status) =>
                      patchTask(task, { status }).then((u) => {
                        setTask(u);
                        ws.taskChanged();
                      }).catch(() => {})
                    }
                  />
                </Prop>
                <Prop label="Priority">
                  <PriorityPicker value={task.priority} disabled={!may("priority")} lockHint={lockHint} onChange={(priority) => update({ priority })} />
                </Prop>
                <Prop label="Assignee">
                  <AssigneePicker
                    value={task.assignee}
                    people={people}
                    disabled={!may("assignee")}
                    lockHint={lockHint}
                    onChange={(assignee) => update({ assignee })}
                  />
                </Prop>
                <Prop label="Labels">
                  <LabelPicker value={task.labels} labels={task.project.labels} disabled={!may("labels")} onChange={(labels) => update({ labels })} />
                </Prop>
                <Prop label="Milestone">
                  <MilestonePicker value={task.milestone} milestones={task.project.milestones} disabled={!may("milestone")} lockHint={lockHint} onChange={(milestone) => update({ milestone })} />
                </Prop>
                <Prop label="Start">
                  <DateButton value={task.startDate} disabled={!may("startDate")} onChange={(startDate) => update({ startDate })} />
                </Prop>
                <Prop label="Due">
                  <DateButton value={task.dueDate} isDue status={task.status} disabled={!may("dueDate")} onChange={(dueDate) => update({ dueDate })} />
                </Prop>
                <Prop label="Estimate">
                  <span className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={!may("estimate")}
                      defaultValue={task.estimate ?? ""}
                      placeholder="—"
                      onBlur={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        if (v !== (task.estimate ?? null)) update({ estimate: v });
                      }}
                      className="w-14 h-8 px-2 -mx-2 rounded-md bg-transparent outline-none text-[13px] hover:bg-subtle focus:bg-surface focus:shadow-[var(--shadow-focus)] disabled:hover:bg-transparent"
                    />
                    <span className="text-xs text-faint">points</span>
                  </span>
                </Prop>
              </div>

              <div className="px-5 pb-4 text-[11.5px] text-faint space-y-0.5">
                <p>
                  Created by {fullName(task.createdBy)} · {formatDate(task.createdAt)}
                </p>
                {myRole && <p>Your role here: {PROJECT_ROLE[myRole]}{task.can.needsApproval && may("status") ? " · completed work goes to review" : ""}</p>}
              </div>

              <div className="mx-5 border-t border-line" />
              <div className="p-5">
                <RelatedKnowledge taskRef={task.ref} canLink={user.role !== "guest"} onCapture={project?.can?.writeKb ? () => setCapture({}) : null} />
              </div>
            </aside>
          </div>
        )}
      </aside>

      {capture && task && (
        <MemoryEditor
          defaults={{
            title: "",
            content: `${task.title}\n\n${task.description || ""}`.trim(),
            projectId: project?._id,
            visibility: "project",
            tasks: [task.ref],
          }}
          onClose={() => setCapture(null)}
        />
      )}

      {rejecting && (
        <Modal
          title={`Request changes on ${task.ref}`}
          description="The task goes back to In progress and the assignee is notified."
          size="sm"
          onClose={() => setRejecting(false)}
          footer={(c) => (
            <>
              <button className="btn btn-secondary" onClick={c}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!rejectNote.trim()}
                onClick={() => {
                  run(() => api.post(`/tasks/${task._id}/reject`, { note: rejectNote.trim() }), "Changes requested");
                  setRejectNote("");
                  c();
                }}
              >
                Send back
              </button>
            </>
          )}
        >
          <textarea className="field" rows={4} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="What needs to change?" />
        </Modal>
      )}
    </div>,
    document.body
  );
}
