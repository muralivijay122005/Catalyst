// src/components/kb/MemoryReader.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuArrowLeft,
  LuThumbsUp,
  LuPin,
  LuBadgeCheck,
  LuPencil,
  LuEllipsis,
  LuLink,
  LuTrash2,
  LuGlobe,
  LuFolder,
  LuLock,
  LuClock,
  LuEye,
  LuHash,
  LuMessageSquare,
  LuCircleDot,
  LuPlus,
  LuUnlink,
  LuSparkles,
  LuCornerDownRight,
  LuX,
  LuSearch,
  LuRefreshCw,
} from "react-icons/lu";
import { api } from "../../lib/api";
import { useDebounced } from "../../lib/hooks";
import { Markdown } from "../../lib/markdown";
import { useWorkspace } from "../../context/WorkspaceContext";
import { Avatar } from "../ui/Avatar";
import Popover from "../ui/Popover";
import { StatusIcon } from "../ui/icons";
import { ProjectMark, Spinner, Tooltip } from "../ui/primitives";
import { toast } from "../ui/toast";
import { confirm } from "../ui/confirm";
import { TypeBadge, TypeIcon, VerifiedMark, ImportanceBars } from "./bits";
import { VISIBILITY } from "../../lib/constants";
import { formatDate, fullName, timeAgo } from "../../lib/format";

const VIS_ICON = { workspace: LuGlobe, project: LuFolder, private: LuLock };
const SOURCE_ICON = { channel: LuHash, message: LuMessageSquare, comment: LuMessageSquare, project: LuFolder, task: LuCircleDot, answer: LuSparkles };

function TaskLinker({ onLink }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const debounced = useDebounced(q.trim(), 200);
  useEffect(() => {
    if (!debounced) return;
    api(`/workspace/search?q=${encodeURIComponent(debounced)}`).then((r) => setResults(r.tasks)).catch(() => {});
  }, [debounced]);
  return (
    <div className="menu w-[320px]">
      <label className="flex items-center gap-2 h-9 px-3 -mx-1 -mt-1 mb-1 border-b border-line">
        <LuSearch size={13} className="text-faint" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks or type PAY-12" className="flex-1 bg-transparent outline-none text-[13px]" />
      </label>
      {(!debounced || !results.length) && <p className="px-2 py-2 text-xs text-faint">{debounced ? "No tasks found" : "Find a task to link"}</p>}
      {debounced && results.map((t) => (
        <button key={t._id} className="menu-item" onClick={() => onLink(t.ref)}>
          <StatusIcon status={t.status} />
          <span className="mono text-[11px] text-faint w-12">{t.ref}</span>
          <span className="flex-1 truncate">{t.title}</span>
        </button>
      ))}
    </div>
  );
}

function ConnectionItem({ m, action, sub }) {
  const navigate = useNavigate();
  return (
    <div className="group flex items-start gap-2.5 p-2 -mx-2 rounded-lg hover:bg-subtle transition-colors">
      <TypeIcon type={m.type} size={13} boxed />
      <button className="flex-1 min-w-0 text-left" onClick={() => navigate(`/kb/${m._id}`)}>
        <span className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium text-ink truncate">{m.title}</span>
          <VerifiedMark verified={m.verified} stale={m.stale} size={12} />
        </span>
        <span className="block text-[11.5px] text-muted line-clamp-1">{sub || m.summary}</span>
      </button>
      {action}
    </div>
  );
}

export default function MemoryReader({ id, onBack, onEdit, onChanged }) {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const [m, setM] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    api(`/memories/${id}`)
      .then((data) => alive && setM(data))
      .catch((err) => alive && setError(err));
    return () => {
      alive = false;
    };
  }, [id, nonce]);

  const reload = () => {
    setNonce((n) => n + 1);
    onChanged?.();
  };

  const act = async (fn, message) => {
    setBusy(true);
    try {
      const res = await fn();
      if (message) toast.success(message);
      return res;
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="flex-1 grid place-items-center p-10 text-center">
        <div>
          <p className="text-[14px] font-medium text-ink">{error.status === 404 ? "This knowledge doesn't exist or isn't visible to you" : error.message}</p>
          <button className="btn btn-secondary mt-4" onClick={onBack}>
            Back to Knowledge Base
          </button>
        </div>
      </div>
    );
  }

  if (!m || m._id !== id) {
    return (
      <div className="flex-1 p-8 space-y-4">
        <span className="skeleton block h-5 w-24" />
        <span className="skeleton block h-8 w-3/4" />
        <span className="skeleton block h-4 w-full" />
        <span className="skeleton block h-4 w-5/6" />
        <span className="skeleton block h-4 w-4/6" />
      </div>
    );
  }

  const VisIcon = VIS_ICON[m.visibility];
  const SrcIcon = SOURCE_ICON[m.source?.kind];

  const toggleVerify = async () => {
    const res = await act(() => api.post(`/memories/${m._id}/verify`, { verified: m.verified?.at && !m.stale ? false : true }), m.verified?.at && !m.stale ? "Verification removed" : "Verified — the team can rely on this");
    if (res) {
      setM((x) => ({ ...x, verified: res.verified, stale: false }));
      onChanged?.();
    }
  };

  const addLink = async (otherId) => {
    const links = [...new Set([...(m.links || []).map((l) => l._id), otherId])];
    if (await act(() => api.patch(`/memories/${m._id}`, { links }), "Linked")) reload();
  };
  const removeLink = async (otherId) => {
    const links = (m.links || []).map((l) => l._id).filter((x) => x !== otherId);
    if (await act(() => api.patch(`/memories/${m._id}`, { links }), "Link removed")) reload();
  };
  const toggleTask = async (ref) => {
    if (await act(() => api.post(`/memories/${m._id}/tasks`, { task: ref }))) reload();
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col" key={m._id} style={{ animation: "var(--animate-enter)" }}>
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 h-12 px-4 border-b border-line shrink-0">
        <Tooltip label="Back to list">
          <button className="icon-btn xl:hidden" onClick={onBack} aria-label="Back">
            <LuArrowLeft size={15} />
          </button>
        </Tooltip>
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
        <TypeBadge type={m.type} />
        <Tooltip label={VISIBILITY[m.visibility].hint}>
          <span className="chip h-[22px]">
            <VisIcon size={11} /> {VISIBILITY[m.visibility].label}
          </span>
        </Tooltip>
        {m.project && (
          <button className="chip h-[22px] hover:bg-line" onClick={() => navigate(`/projects/${m.project.key}`)}>
            <ProjectMark project={m.project} size={12} /> <span className="truncate max-w-[140px]">{m.project.name}</span>
          </button>
        )}
        </div>
        <div className="ml-auto flex items-center gap-0.5 shrink-0">
          <Tooltip label={m.isHelpful ? "You found this helpful" : "Mark as helpful"}>
            <button
              disabled={busy}
              onClick={async () => {
                const res = await act(() => api.post(`/memories/${m._id}/helpful`));
                if (res) setM((x) => ({ ...x, ...res }));
              }}
              className={`btn btn-sm ${m.isHelpful ? "bg-accent-soft text-accent" : "btn-ghost"}`}
            >
              <LuThumbsUp size={13} className={m.isHelpful ? "fill-current" : ""} style={{ transition: "transform 200ms var(--ease-spring)", transform: m.isHelpful ? "scale(1.12) rotate(-8deg)" : "none" }} />
              <span className="tabular-nums">{m.helpfulCount}</span>
            </button>
          </Tooltip>
          {(m.can.edit || m.can.verify) && (
            <Tooltip label={m.pinned ? "Unpin" : "Pin to the top"}>
              <button
                disabled={busy}
                className={`icon-btn ${m.pinned ? "text-accent" : ""}`}
                onClick={async () => {
                  const res = await act(() => api.post(`/memories/${m._id}/pin`));
                  if (res) {
                    setM((x) => ({ ...x, pinned: res.pinned }));
                    onChanged?.();
                  }
                }}
              >
                <LuPin size={15} className={m.pinned ? "fill-current" : ""} />
              </button>
            </Tooltip>
          )}
          {m.can.verify && (
            <button disabled={busy} onClick={toggleVerify} className={`btn btn-sm ${m.verified?.at && !m.stale ? "btn-ghost text-accent" : "btn-secondary"}`}>
              {m.stale ? <LuRefreshCw size={13} /> : <LuBadgeCheck size={14} />}
              {m.verified?.at ? (m.stale ? "Re-verify" : "Verified") : "Verify"}
            </button>
          )}
          {m.can.edit && (
            <Tooltip label="Edit">
              <button className="icon-btn" onClick={() => onEdit(m)}>
                <LuPencil size={14} />
              </button>
            </Tooltip>
          )}
          <Popover
            placement="bottom-end"
            width={200}
            content={({ close }) => (
              <div className="menu">
                <button
                  className="menu-item"
                  onClick={() => {
                    close();
                    navigator.clipboard?.writeText(`${window.location.origin}/kb/${m._id}`).then(() => toast.success("Link copied"));
                  }}
                >
                  <LuLink size={14} className="text-muted" /> Copy link
                </button>
                {m.can.delete && (
                  <button
                    className="menu-item text-danger"
                    onClick={async () => {
                      close();
                      const ok = await confirm({ title: `Delete “${m.title}”?`, body: "Links to it from other knowledge and tasks are removed too.", confirmLabel: "Delete", danger: true });
                      if (!ok) return;
                      if (await act(() => api.del(`/memories/${m._id}`), "Deleted")) {
                        onChanged?.();
                        onBack();
                      }
                    }}
                  >
                    <LuTrash2 size={14} /> Delete
                  </button>
                )}
              </div>
            )}
          >
            {({ ref, toggle }) => (
              <button ref={ref} onClick={toggle} className="icon-btn" aria-label="More">
                <LuEllipsis size={16} />
              </button>
            )}
          </Popover>
        </div>
      </div>

      <div className="flex-1 scroll">
        <article className="px-8 py-7 max-w-[760px]">
          {m.stale && (
            <div className="flex items-center gap-3 mb-5 px-3.5 py-2.5 rounded-xl bg-amber-50" style={{ boxShadow: "inset 0 0 0 1px rgb(217 119 6 / 0.2)" }}>
              <LuClock size={15} className="text-warn shrink-0" />
              <p className="flex-1 text-[12.5px] text-amber-900">
                Due for review — verified {timeAgo(m.verified?.at)} by {fullName(m.verified?.by)}. Check it's still true.
              </p>
              {m.can.verify && (
                <button className="btn btn-sm btn-secondary" onClick={toggleVerify} disabled={busy}>
                  Still accurate
                </button>
              )}
            </div>
          )}

          <h1 className="text-[26px] leading-[1.25] font-semibold tracking-[-0.025em] text-ink">{m.title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[12.5px] text-muted">
            <span className="flex items-center gap-1.5">
              <Avatar user={m.createdBy} size={18} />
              {fullName(m.createdBy)}
            </span>
            <span>·</span>
            <span>Updated {timeAgo(m.updatedAt)}</span>
            {m.verified?.at && !m.stale && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1 text-accent">
                  <LuBadgeCheck size={13} /> Verified by {fullName(m.verified.by)}
                </span>
              </>
            )}
            <span>·</span>
            <ImportanceBars value={m.importance} />
          </div>

          {m.summary && !m.content.replace(/^#+\s*/, "").startsWith(m.summary.replace(/…$/, "").slice(0, 60)) && <p className="mt-5 text-[15px] leading-relaxed text-ink-2 font-medium">{m.summary}</p>}

          <div className="mt-5">
            <Markdown text={m.content} onTaskRef={(r) => ws.openTask(r)} />
          </div>

          {m.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-6">
              {m.tags.map((t) => (
                <button key={t} onClick={() => navigate(`/kb?tag=${t}`)} className="chip hover:bg-line transition-colors">
                  #{t}
                </button>
              ))}
            </div>
          )}

          {/* Facts */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-7 p-4 rounded-xl bg-canvas">
            <div>
              <dt className="text-[11px] text-faint">Created</dt>
              <dd className="text-[12.5px] text-ink-2 mt-0.5">{formatDate(m.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-faint">Source</dt>
              <dd className="text-[12.5px] text-ink-2 mt-0.5 flex items-center gap-1 min-w-0">
                {SrcIcon && <SrcIcon size={12} className="shrink-0" />}
                <span className="truncate">{m.source?.kind === "manual" || !m.source?.label ? "Written by hand" : m.source.label}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-faint">Views</dt>
              <dd className="text-[12.5px] text-ink-2 mt-0.5 flex items-center gap-1">
                <LuEye size={12} /> {m.views}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-faint">Review cycle</dt>
              <dd className="text-[12.5px] text-ink-2 mt-0.5">Every {m.reviewEveryDays || 90} days</dd>
            </div>
          </dl>

          {/* Linked tasks */}
          <section className="mt-8">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="h-section">Linked tasks</h2>
              <span className="text-xs text-faint">{m.tasks.length}</span>
              <Popover placement="bottom-end" content={({ close }) => <TaskLinker onLink={(ref) => { close(); toggleTask(ref); }} />}>
                {({ ref, toggle }) => (
                  <button ref={ref} onClick={toggle} className="btn btn-sm btn-ghost ml-auto">
                    <LuPlus size={13} /> Link task
                  </button>
                )}
              </Popover>
            </div>
            {m.tasks.length === 0 && <p className="text-[12.5px] text-faint">Not linked to any task. Linking makes this show up when people work on related tasks.</p>}
            <div className="space-y-0.5">
              {m.tasks.map((t) => (
                <div key={t._id} className="group flex items-center gap-2.5 h-9 px-2 -mx-2 rounded-lg hover:bg-subtle">
                  <StatusIcon status={t.status} />
                  <span className="mono text-[11.5px] text-faint w-14">{t.ref}</span>
                  <button className="flex-1 min-w-0 truncate text-left text-[13px] text-ink-2 hover:text-ink" onClick={() => ws.openTask(t.ref)}>
                    {t.title}
                  </button>
                  {t.assignee && <Avatar user={t.assignee} size={18} />}
                  <Tooltip label="Unlink">
                    <button className="icon-btn size-6 opacity-0 group-hover:opacity-100" onClick={() => toggleTask(t.ref)}>
                      <LuX size={12} />
                    </button>
                  </Tooltip>
                </div>
              ))}
            </div>
          </section>

          {/* Connections */}
          <section className="mt-8 grid md:grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <h2 className="h-section mb-2">Connected knowledge</h2>
              {!m.links.length && !m.backlinks.length && <p className="text-[12.5px] text-faint">No explicit connections yet.</p>}
              {m.links.map((l) => (
                <ConnectionItem
                  key={l._id}
                  m={l}
                  action={
                    m.can.edit && (
                      <Tooltip label="Remove link">
                        <button className="icon-btn size-6 opacity-0 group-hover:opacity-100" onClick={() => removeLink(l._id)}>
                          <LuUnlink size={12} />
                        </button>
                      </Tooltip>
                    )
                  }
                />
              ))}
              {m.backlinks.length > 0 && (
                <>
                  <p className="flex items-center gap-1 text-[11px] font-medium text-faint mt-3 mb-1">
                    <LuCornerDownRight size={11} /> Referenced by
                  </p>
                  {m.backlinks.map((l) => (
                    <ConnectionItem key={l._id} m={l} />
                  ))}
                </>
              )}
            </div>
            <div>
              <h2 className="h-section mb-2 flex items-center gap-1.5">
                <LuSparkles size={12} className="text-accent" /> Related
              </h2>
              {!m.related.length && <p className="text-[12.5px] text-faint">Nothing similar found.</p>}
              {m.related.map((r) => (
                <ConnectionItem
                  key={r._id}
                  m={r}
                  sub={r.reasons?.length ? `Shares ${r.reasons.join(", ")}` : `${Math.round(r.score * 100)}% similar`}
                  action={
                    m.can.edit && (
                      <Tooltip label="Connect permanently">
                        <button className="icon-btn size-6 opacity-0 group-hover:opacity-100" disabled={busy} onClick={() => addLink(r._id)}>
                          {busy ? <Spinner size={11} /> : <LuLink size={12} />}
                        </button>
                      </Tooltip>
                    )
                  }
                />
              ))}
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}
