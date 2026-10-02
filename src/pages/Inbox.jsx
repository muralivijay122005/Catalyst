// src/pages/Inbox.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuInbox,
  LuCheckCheck,
  LuAtSign,
  LuShieldCheck,
  LuUserPlus,
  LuMessageSquare,
  LuCircleCheck,
  LuCircleX,
  LuBadgeCheck,
  LuUserCog,
  LuFolderPlus,
  LuArrowRightLeft,
  LuClock,
  LuMail,
  LuMailOpen,
  LuTrash2,
  LuBell,
  LuHash,
} from "react-icons/lu";
import PageHeader from "../components/layout/PageHeader";
import { Avatar } from "../components/ui/Avatar";
import { EmptyState, Segmented, SkeletonRows, Tooltip } from "../components/ui/primitives";
import { toast } from "../components/ui/toast";
import { useApi } from "../lib/hooks";
import { api } from "../lib/api";
import { timeAgo, startOfDay } from "../lib/format";
import { useWorkspace } from "../context/WorkspaceContext";

const TYPE = {
  assigned: { icon: LuUserPlus, color: "#2563eb" },
  mentioned: { icon: LuAtSign, color: "#2563eb" },
  message: { icon: LuMessageSquare, color: "#0891b2" },
  commented: { icon: LuMessageSquare, color: "#71717a" },
  approval_requested: { icon: LuShieldCheck, color: "#2563eb" },
  approved: { icon: LuCircleCheck, color: "#16a34a" },
  rejected: { icon: LuCircleX, color: "#dc2626" },
  status_changed: { icon: LuArrowRightLeft, color: "#71717a" },
  role_changed: { icon: LuUserCog, color: "#7c3aed" },
  added_to_project: { icon: LuFolderPlus, color: "#0891b2" },
  added_to_channel: { icon: LuHash, color: "#0891b2" },
  removed_from_channel: { icon: LuHash, color: "#71717a" },
  kb_verified: { icon: LuBadgeCheck, color: "#2563eb" },
  kb_review: { icon: LuClock, color: "#d97706" },
};

const FILTERS = {
  all: () => true,
  unread: (n) => !n.read,
  mentions: (n) => ["mentioned", "message", "commented"].includes(n.type),
  reviews: (n) => ["approval_requested", "approved", "rejected"].includes(n.type),
};

export default function Inbox() {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const { data, loading, setData } = useApi("/notifications");

  const items = useMemo(() => (data?.items || []).filter(FILTERS[filter]), [data, filter]);
  const groups = useMemo(() => {
    const today = startOfDay().getTime();
    const week = today - 6 * 86400000;
    const out = { Today: [], "This week": [], Earlier: [] };
    items.forEach((n) => {
      const t = new Date(n.createdAt).getTime();
      out[t >= today ? "Today" : t >= week ? "This week" : "Earlier"].push(n);
    });
    return Object.entries(out).filter(([, list]) => list.length);
  }, [items]);

  const mark = async (ids, read = true) => {
    setData((d) => ({ ...d, items: d.items.map((n) => (!ids || ids.includes(n._id) ? { ...n, read } : n)) }));
    try {
      const { unread } = await api.post("/notifications/read", { ids, read });
      ws.setUnread(unread);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (id) => {
    setData((d) => ({ ...d, items: d.items.filter((n) => n._id !== id) }));
    const { unread } = await api.del(`/notifications/${id}`);
    ws.setUnread(unread);
  };

  const open = (n) => {
    if (!n.read) mark([n._id]);
    const l = n.link || {};
    if (l.kind === "task") ws.openTask(l.id);
    else if (l.kind === "project") navigate(`/projects/${l.id}`);
    else if (l.kind === "memory") navigate(`/kb/${l.id}`);
    else if (l.kind === "kb") navigate(`/kb?filter=${l.id}`);
    else if (l.kind === "channel") navigate(`/channels/${l.id}`);
    else if (l.kind === "people") navigate("/team");
    else if (l.kind === "channels") navigate("/channels");
  };

  const unreadCount = (data?.items || []).filter((n) => !n.read).length;

  return (
    <>
      <PageHeader
        icon={<LuInbox size={15} />}
        title="Inbox"
        subtitle={unreadCount ? `${unreadCount} unread` : "You're all caught up"}
        actions={
          <>
            <Segmented
              size="sm"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All" },
                { value: "unread", label: "Unread", count: unreadCount || null },
                { value: "mentions", label: "Mentions" },
                { value: "reviews", label: "Reviews" },
              ]}
            />
            <button className="btn btn-secondary btn-sm" disabled={!unreadCount} onClick={() => mark(null)}>
              <LuCheckCheck size={14} /> Mark all read
            </button>
          </>
        }
      />
      <div className="flex-1 scroll">
        <div className="max-w-[860px] mx-auto px-6 py-6">
          {loading && !data && <SkeletonRows rows={8} />}
          {data && !items.length && (
            <EmptyState icon={LuBell} title={filter === "unread" ? "No unread notifications" : "Nothing here yet"}>
              Assignments, mentions, reviews and knowledge updates show up here.
            </EmptyState>
          )}
          {groups.map(([label, list]) => (
            <section key={label} className="mb-6">
              <h2 className="eyebrow px-3 mb-1.5">{label}</h2>
              <div className="stagger">
                {list.map((n, i) => {
                  const meta = TYPE[n.type] || { icon: LuBell, color: "#71717a" };
                  return (
                    <div
                      key={n._id}
                      role="button"
                      tabIndex={0}
                      onClick={() => open(n)}
                      onKeyDown={(e) => e.key === "Enter" && open(n)}
                      style={{ "--i": i }}
                      className="group relative flex items-start gap-3 px-3 py-3 rounded-xl cursor-pointer outline-none transition-colors hover:bg-subtle focus-visible:bg-subtle"
                    >
                      <span className={`absolute left-0 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-accent transition-opacity ${n.read ? "opacity-0" : ""}`} />
                      <span className="relative shrink-0">
                        {n.actor ? <Avatar user={n.actor} size={32} /> : <span className="grid place-items-center size-8 rounded-full bg-subtle"><meta.icon size={15} style={{ color: meta.color }} /></span>}
                        {n.actor && (
                          <span className="absolute -bottom-1 -right-1 grid place-items-center size-[18px] rounded-full bg-surface ring-2 ring-surface">
                            <meta.icon size={11} style={{ color: meta.color }} />
                          </span>
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13.5px] leading-5 ${n.read ? "text-ink-2" : "text-ink font-medium"}`}>{n.title}</p>
                        {n.body && <p className="text-[12.5px] text-muted leading-5 line-clamp-2 mt-0.5">{n.body}</p>}
                      </div>
                      <span className="text-[11.5px] text-faint whitespace-nowrap group-hover:opacity-0 transition-opacity">{timeAgo(n.createdAt)}</span>
                      <span className="absolute right-3 top-2.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip label={n.read ? "Mark as unread" : "Mark as read"}>
                          <button className="icon-btn bg-surface shadow-[var(--shadow-card)]" onClick={(e) => { e.stopPropagation(); mark([n._id], !n.read); }}>
                            {n.read ? <LuMail size={13} /> : <LuMailOpen size={13} />}
                          </button>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <button className="icon-btn bg-surface shadow-[var(--shadow-card)] hover:text-danger" onClick={(e) => { e.stopPropagation(); remove(n._id); }}>
                            <LuTrash2 size={13} />
                          </button>
                        </Tooltip>
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
