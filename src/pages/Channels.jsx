// src/pages/Channels.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LuHash,
  LuLock,
  LuPlus,
  LuSend,
  LuBrain,
  LuSmilePlus,
  LuTrash2,
  LuWandSparkles,
  LuMegaphone,
  LuUsers,
  LuMessagesSquare,
  LuBadgeCheck,
  LuUserPlus,
  LuSettings,
} from "react-icons/lu";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { Avatar, AvatarStack } from "../components/ui/Avatar";
import Modal from "../components/ui/Modal";
import Popover, { OptionList } from "../components/ui/Popover";
import { EmptyState, Kbd, ProjectMark, Spinner, Switch, Tooltip } from "../components/ui/primitives";
import { toast } from "../components/ui/toast";
import { confirm } from "../components/ui/confirm";
import { renderInline } from "../lib/markdown";
import { formatTime, fullName, startOfDay } from "../lib/format";
import DistillModal from "../components/kb/DistillModal";
import MentionInput from "../components/ui/MentionInput";
import ChannelMembers from "../components/channel/ChannelMembers";

const REACTIONS = ["👍", "🎉", "👀", "✅", "❤️"];

function dayLabel(d) {
  const diff = Math.round((startOfDay() - startOfDay(d)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Date(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function NewChannel({ onClose, onCreated }) {
  const { can } = useAuth();
  const [form, setForm] = useState({ name: "", topic: "", kind: "public", locked: false });
  const [saving, setSaving] = useState(false);
  return (
    <Modal
      title="New channel"
      size="sm"
      onClose={onClose}
      footer={(close) => (
        <>
          <button className="btn btn-secondary" onClick={close}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={!form.name.trim() || saving}
            onClick={async () => {
              setSaving(true);
              try {
                const c = await api.post("/channels", form);
                onCreated(c);
                close();
              } catch (err) {
                toast.error(err.message);
                setSaving(false);
              }
            }}
          >
            Create
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <div>
          <label className="label">Name</label>
          <label className="field">
            <LuHash size={14} className="text-faint" />
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="e.g. launch-planning" />
          </label>
        </div>
        <div>
          <label className="label">Topic</label>
          <input className="field" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="What's it for?" />
        </div>
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-[13px] font-medium">Private</span>
            <span className="block text-xs text-muted">Only invited members can see it</span>
          </span>
          <Switch checked={form.kind === "private"} onChange={(v) => setForm({ ...form, kind: v ? "private" : "public" })} label="Private" />
        </label>
        {can("channel.announce") && (
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-[13px] font-medium">Announcements only</span>
              <span className="block text-xs text-muted">Only admins and managers can post</span>
            </span>
            <Switch checked={form.locked} onChange={(v) => setForm({ ...form, locked: v })} label="Announcements only" />
          </label>
        )}
      </div>
    </Modal>
  );
}

export default function Channels() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const ws = useWorkspace();
  const [channels, setChannels] = useState(null);
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [distill, setDistill] = useState(null);
  const [membersTab, setMembersTab] = useState(null);
  const bottom = useRef(null);
  const composer = useRef(null);

  const replaceChannel = (updated) => setChannels((list) => list.map((c) => (c._id === updated._id ? updated : c)));
  const loadChannels = () => api("/channels").then(setChannels).catch(() => setChannels([]));
  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    if (!channelId && channels?.length) navigate(`/channels/${channels.find((c) => c.name === "general")?._id || channels[0]._id}`, { replace: true });
  }, [channelId, channels, navigate]);

  const channel = channels?.find((c) => c._id === channelId);

  // Load + poll messages
  useEffect(() => {
    if (!channelId) return undefined;
    let alive = true;
    setMessages(null);
    api(`/channels/${channelId}/messages`)
      .then((m) => alive && setMessages(m))
      .catch(() => alive && setMessages([]));
    const t = setInterval(async () => {
      try {
        const latest = await api(`/channels/${channelId}/messages`);
        if (alive) setMessages((prev) => (prev && latest.length === prev.length && latest.at(-1)?._id === prev.at(-1)?._id ? prev : latest));
      } catch {
        /* ignore */
      }
    }, 6000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [channelId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages?.length, channelId]);

  const groups = useMemo(() => {
    const out = [];
    (messages || []).forEach((m, i) => {
      const prev = messages[i - 1];
      const day = startOfDay(m.createdAt).getTime();
      if (!prev || startOfDay(prev.createdAt).getTime() !== day) out.push({ day: m.createdAt, items: [] });
      const compact = prev && prev.sender?._id === m.sender?._id && new Date(m.createdAt) - new Date(prev.createdAt) < 5 * 60000 && startOfDay(prev.createdAt).getTime() === day;
      out.at(-1).items.push({ ...m, compact });
    });
    return out;
  }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const msg = await api.post(`/channels/${channelId}/messages`, { text: text.trim() });
      setMessages((list) => [...(list || []), msg]);
      setText("");
      composer.current?.focus();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const react = async (m, emoji) => {
    try {
      const updated = await api.post(`/channels/${channelId}/messages/${m._id}/react`, { emoji });
      setMessages((list) => list.map((x) => (x._id === m._id ? updated : x)));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const saveToKb = async (m) => {
    try {
      const { memory, duplicates } = await api.post("/memories/from-message", { messageId: m._id });
      setMessages((list) => list.map((x) => (x._id === m._id ? { ...x, memoryId: { _id: memory._id, title: memory.title } } : x)));
      toast.success("Saved to the Knowledge Base", {
        description: duplicates?.length ? `Looks similar to “${duplicates[0].title}”.` : `“${memory.title}”`,
        action: { label: "Open", onClick: () => navigate(`/kb/${memory._id}`) },
      });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const sections = useMemo(() => {
    const list = channels || [];
    return [
      { title: "Channels", items: list.filter((c) => c.kind === "public") },
      { title: "Project channels", items: list.filter((c) => c.kind === "private") },
      { title: "Direct messages", items: list.filter((c) => c.kind === "dm") },
    ];
  }, [channels]);

  const dmName = (c) => fullName(c.members?.find((m) => m._id !== user._id)) || "Direct message";
  const dmUser = (c) => c.members?.find((m) => m._id !== user._id);
  const title = channel ? (channel.kind === "dm" ? dmName(channel) : channel.name) : "";
  const canKb = can("kb.write");
  const mentionable = useMemo(() => {
    if (!channel) return [];
    const pool = channel.kind === "public" ? ws.people.filter((p) => p.role !== "guest") : channel.members || [];
    return pool.filter((p) => p._id !== user._id && p.status !== "deactivated");
  }, [channel, ws.people, user._id]);

  return (
    <div className="flex-1 min-h-0 flex">
      {/* Channel list */}
      <aside className="hidden md:flex flex-col w-[248px] shrink-0 border-r border-line bg-canvas/50">
        <div className="flex items-center h-14 px-4 shrink-0">
          <h1 className="h-page flex items-center gap-2">
            <LuMessagesSquare size={16} className="text-muted" /> Channels
          </h1>
          {can("channel.create") && (
            <Tooltip label="New channel">
              <button className="icon-btn ml-auto" onClick={() => setCreating(true)}>
                <LuPlus size={15} />
              </button>
            </Tooltip>
          )}
        </div>
        <div className="flex-1 scroll no-scrollbar px-3 pb-4 space-y-5">
          {sections.map((s) => (
            <div key={s.title}>
              <div className="flex items-center px-2.5 mb-1">
                <p className="eyebrow flex-1">{s.title}</p>
                {s.title === "Direct messages" && user.role !== "guest" && (
                  <Popover
                    width={260}
                    content={({ close }) => (
                      <OptionList
                        searchable
                        placeholder="Message someone…"
                        options={ws.people.filter((p) => p._id !== user._id && p.status === "active").map((p) => ({ value: p._id, label: fullName(p), hint: p.title, icon: <Avatar user={p} size={18} /> }))}
                        onSelect={async (id) => {
                          close();
                          const dm = await api.post("/channels", { kind: "dm", memberIds: [id] });
                          await loadChannels();
                          navigate(`/channels/${dm._id}`);
                        }}
                      />
                    )}
                  >
                    {({ ref, toggle }) => (
                      <button ref={ref} onClick={toggle} className="icon-btn size-5" aria-label="New message">
                        <LuPlus size={12} />
                      </button>
                    )}
                  </Popover>
                )}
              </div>
              <div className="space-y-0.5">
                {s.items.map((c) => {
                  const active = c._id === channelId;
                  return (
                    <button
                      key={c._id}
                      onClick={() => navigate(`/channels/${c._id}`)}
                      className={`flex items-center gap-2 w-full h-8 px-2.5 rounded-lg text-[13px] transition-colors ${active ? "bg-surface text-ink font-medium shadow-[var(--shadow-card)]" : "text-ink-2/80 hover:bg-black/[0.04]"}`}
                    >
                      {c.kind === "dm" ? (
                        <Avatar user={dmUser(c)} size={18} presence />
                      ) : c.project ? (
                        <ProjectMark project={c.project} size={15} />
                      ) : c.locked ? (
                        <LuMegaphone size={14} className="text-muted" />
                      ) : (
                        <LuHash size={14} className="text-muted" />
                      )}
                      <span className="flex-1 text-left truncate">{c.kind === "dm" ? dmName(c) : c.name}</span>
                      {c.kind === "private" && !c.project && <LuLock size={11} className="text-faint" />}
                    </button>
                  );
                })}
                {channels && !s.items.length && <p className="px-2.5 text-xs text-faint">None yet</p>}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Conversation */}
      <section className="flex-1 min-w-0 flex flex-col">
        {channel ? (
          <>
            <header className="flex items-center gap-3 h-14 px-5 border-b border-line shrink-0">
              {channel.kind === "dm" ? <Avatar user={dmUser(channel)} size={26} presence /> : channel.project ? <ProjectMark project={channel.project} size={22} /> : channel.locked ? <LuMegaphone size={17} /> : <LuHash size={17} />}
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold tracking-tight truncate">{title}</h2>
                {channel.topic && <p className="text-xs text-muted truncate -mt-0.5">{channel.topic}</p>}
              </div>
              <div className="ml-auto flex items-center gap-2">
                {channel.can?.join && (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={async () => {
                      try {
                        replaceChannel(await api.post(`/channels/${channel._id}/join`));
                        toast.success(`You joined #${channel.name}`);
                      } catch (err) {
                        toast.error(err.message);
                      }
                    }}
                  >
                    Join channel
                  </button>
                )}
                {channel.kind !== "dm" && (
                  <Tooltip label={channel.can?.addMembers ? "Members · add or remove people" : "Members"}>
                    <button aria-label="Channel members" onClick={() => setMembersTab("members")} className="hidden sm:flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-full hover:bg-subtle transition-colors">
                      <AvatarStack users={channel.members} size={22} max={4} />
                      <span className="text-xs font-medium text-ink-2 tabular-nums">{channel.members.length}</span>
                      {channel.can?.addMembers && <LuUserPlus size={13} className="text-muted" />}
                    </button>
                  </Tooltip>
                )}
                {channel.kind !== "dm" && !channel.project && (
                  <Tooltip label="Channel settings">
                    <button className="icon-btn" onClick={() => setMembersTab("settings")} aria-label="Channel settings">
                      <LuSettings size={15} />
                    </button>
                  </Tooltip>
                )}
                {can("kb.distill") && messages?.length > 0 && (
                  <Tooltip label="Extract decisions and knowledge from this conversation">
                    <button className="btn btn-sm btn-secondary" onClick={() => setDistill({ kind: "channel", refId: channel._id })}>
                      <LuWandSparkles size={13} className="text-accent" /> Distill
                    </button>
                  </Tooltip>
                )}
              </div>
            </header>

            <div className="flex-1 min-h-0 scroll">
              <div className="px-5 py-4">
                {messages === null && (
                  <div className="space-y-5 pt-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3">
                        <span className="skeleton size-8 rounded-full" />
                        <span className="flex-1 space-y-2">
                          <span className="skeleton block h-3 w-32" />
                          <span className="skeleton block h-3.5" style={{ width: `${50 + i * 10}%` }} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {messages?.length === 0 && (
                  <EmptyState icon={channel.kind === "dm" ? LuMessagesSquare : LuHash} title={channel.kind === "dm" ? `Start a conversation with ${title}` : `Welcome to #${channel.name}`}>
                    {channel.topic || "Say hello. Decisions made here can be saved to the Knowledge Base in one click."}
                  </EmptyState>
                )}
                {groups.map((g) => (
                  <div key={g.day}>
                    <div className="flex items-center gap-3 my-4">
                      <span className="flex-1 border-t border-line" />
                      <span className="text-[11.5px] font-medium text-muted">{dayLabel(g.day)}</span>
                      <span className="flex-1 border-t border-line" />
                    </div>
                    {g.items.map((m) => {
                      const mine = m.sender?._id === user._id;
                      return (
                        <div key={m._id} className={`group relative flex gap-3 px-2 -mx-2 rounded-lg hover:bg-subtle/70 transition-colors ${m.compact ? "py-0.5" : "pt-2 pb-1 mt-1"}`} style={{ animation: "var(--animate-enter)" }}>
                          <div className="w-8 shrink-0">
                            {!m.compact ? <Avatar user={m.sender} size={32} /> : <span className="hidden group-hover:block text-[10px] text-faint pt-1 tabular-nums">{formatTime(m.createdAt).replace(/ [AP]M/, "")}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            {!m.compact && (
                              <p className="flex items-baseline gap-2">
                                <span className="text-[13.5px] font-semibold text-ink">{fullName(m.sender)}</span>
                                <span className="text-[11px] text-faint">{formatTime(m.createdAt)}</span>
                              </p>
                            )}
                            <p className="text-[13.5px] leading-[1.6] text-ink-2 whitespace-pre-wrap break-words">{renderInline(m.text, { onTaskRef: ws.openTask, people: ws.people, me: user.username })}</p>
                            {m.memoryId && (
                              <button onClick={() => navigate(`/kb/${m.memoryId._id || m.memoryId}`)} className="inline-flex items-center gap-1 mt-1 h-5 px-1.5 rounded-md bg-accent-soft text-accent text-[11px] font-medium hover:bg-accent hover:text-white transition-colors">
                                <LuBadgeCheck size={11} /> In Knowledge Base{m.memoryId.title ? ` · ${m.memoryId.title}` : ""}
                              </button>
                            )}
                            {m.reactions?.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {m.reactions.map((r) => {
                                  const reacted = r.users.some((u) => (u._id || u) === user._id);
                                  return (
                                    <button key={r.emoji} onClick={() => react(m, r.emoji)} className={`inline-flex items-center gap-1 h-6 px-1.5 rounded-full text-xs transition-all active:scale-90 ${reacted ? "bg-accent-soft text-accent shadow-[inset_0_0_0_1px_rgb(37_99_235/0.25)]" : "bg-subtle text-muted hover:bg-line"}`}>
                                      {r.emoji} <span className="tabular-nums">{r.users.length}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="absolute -top-3 right-2 hidden group-hover:flex items-center gap-0.5 p-0.5 rounded-lg bg-surface" style={{ boxShadow: "var(--shadow-raised)" }}>
                            <Popover
                              placement="bottom-end"
                              content={({ close }) => (
                                <div className="menu flex gap-0.5 min-w-0 p-1">
                                  {REACTIONS.map((e) => (
                                    <button key={e} className="size-8 grid place-items-center rounded-md text-base hover:bg-subtle transition-transform hover:scale-110" onClick={() => { close(); react(m, e); }}>
                                      {e}
                                    </button>
                                  ))}
                                </div>
                              )}
                            >
                              {({ ref, toggle }) => (
                                <button ref={ref} onClick={toggle} className="icon-btn size-7" aria-label="React">
                                  <LuSmilePlus size={14} />
                                </button>
                              )}
                            </Popover>
                            {canKb && !m.memoryId && (
                              <Tooltip label="Save to Knowledge Base">
                                <button className="icon-btn size-7 hover:text-accent" onClick={() => saveToKb(m)} aria-label="Save to Knowledge Base">
                                  <LuBrain size={14} />
                                </button>
                              </Tooltip>
                            )}
                            {(mine || user.role === "admin") && (
                              <Tooltip label="Delete">
                                <button
                                  className="icon-btn size-7 hover:text-danger"
                                  onClick={async () => {
                                    if (!(await confirm({ title: "Delete message?", confirmLabel: "Delete", danger: true }))) return;
                                    await api.del(`/channels/${channelId}/messages/${m._id}`);
                                    setMessages((list) => list.filter((x) => x._id !== m._id));
                                  }}
                                >
                                  <LuTrash2 size={13} />
                                </button>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={bottom} />
              </div>
            </div>

            <div className="px-5 pb-4 pt-1 shrink-0">
              {channel.canPost ? (
                <div className="field h-auto items-end p-2 pl-3.5">
                  <MentionInput
                    inputRef={composer}
                    value={text}
                    onChange={setText}
                    onSubmit={send}
                    submitOn="enter"
                    minHeight={32}
                    maxHeight={160}
                    people={mentionable}
                    placeholder={`Message ${channel.kind === "dm" ? title : `#${channel.name}`} — type @ to mention`}
                    className="leading-6 py-1"
                  />
                  <button className="grid place-items-center size-8 rounded-lg bg-ink text-white disabled:opacity-30 transition-all active:scale-90" disabled={!text.trim() || sending} onClick={send} aria-label="Send">
                    {sending ? <Spinner size={13} /> : <LuSend size={14} />}
                  </button>
                </div>
              ) : (
                <p className="flex items-center justify-center gap-2 h-11 rounded-lg bg-canvas text-[12.5px] text-muted">
                  <LuLock size={13} /> {channel.locked ? "Only admins and managers can post announcements" : "You can read this channel but not post"}
                </p>
              )}
              {channel.canPost && (
                <p className="mt-1.5 text-[11px] text-faint flex items-center gap-1.5">
                  <Kbd keys={["Enter"]} /> send · <Kbd keys={["shift", "Enter"]} /> new line · @mention people, mention tasks like PAY-4
                </p>
              )}
            </div>
          </>
        ) : channels && !channels.length ? (
          <EmptyState icon={LuUsers} title="No channels yet" className="flex-1" />
        ) : (
          <div className="flex-1 grid place-items-center">
            <Spinner className="text-muted" />
          </div>
        )}
      </section>

      {creating && (
        <NewChannel
          onClose={() => setCreating(false)}
          onCreated={async (c) => {
            await loadChannels();
            navigate(`/channels/${c._id}`);
          }}
        />
      )}
      {membersTab && channel && (
        <ChannelMembers
          key={channel._id}
          channel={channel}
          initialTab={membersTab}
          onClose={() => setMembersTab(null)}
          onChanged={replaceChannel}
          onLeft={async (updated) => {
            setMembersTab(null);
            if (updated.kind === "public") replaceChannel(updated);
            else {
              await loadChannels();
              navigate("/channels");
            }
          }}
        />
      )}
      {distill && <DistillModal initialSource={distill} onClose={() => setDistill(null)} />}
    </div>
  );
}
