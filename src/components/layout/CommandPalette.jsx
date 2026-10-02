// src/components/layout/CommandPalette.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  LuSearch,
  LuHouse,
  LuInbox,
  LuCircleCheck,
  LuShieldCheck,
  LuBrain,
  LuMessagesSquare,
  LuUsers,
  LuSettings,
  LuPlus,
  LuSparkles,
  LuHash,
  LuKeyboard,
  LuCornerDownLeft,
  LuFilePlus2,
} from "react-icons/lu";
import { api } from "../../lib/api";
import { useDebounced, useExit } from "../../lib/hooks";
import { useEscape } from "../../lib/escape";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useAuth } from "../../context/AuthContext";
import { StatusIcon } from "../ui/icons";
import { Avatar } from "../ui/Avatar";
import { Kbd, ProjectMark, Spinner } from "../ui/primitives";
import { MEMORY_TYPE } from "../../lib/constants";
import { fullName } from "../../lib/format";

const QUESTION = /^(how|what|why|when|where|who|which|should|can|do|does|is|are)\b|\?$/i;

export default function CommandPalette({ onClose }) {
  const ws = useWorkspace();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [closing, close] = useExit(onClose, 140);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounced(q.trim(), 160);
  const listRef = useRef(null);
  useEscape(close);

  useEffect(() => {
    if (!debounced) {
      setResults(null);
      return undefined;
    }
    const ctrl = new AbortController();
    setLoading(true);
    api(`/workspace/search?q=${encodeURIComponent(debounced)}`, { signal: ctrl.signal })
      .then(setResults)
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [debounced]);

  const go = (path) => () => navigate(path);

  const actions = useMemo(
    () =>
      [
        ws.creatableProjects.length && { id: "a-task", icon: <LuPlus size={15} />, label: "Create task", keys: ["C"], run: () => ws.openCreateTask({}) },
        can("kb.write") && { id: "a-kb", icon: <LuFilePlus2 size={15} />, label: "Add to Knowledge Base", run: go("/kb?new=1") },
        can("project.create") && { id: "a-proj", icon: <LuPlus size={15} />, label: "Create project", run: go("/projects?new=1") },
        { id: "n-home", icon: <LuHouse size={15} />, label: "Go to Home", keys: ["G", "H"], run: go("/home") },
        { id: "n-inbox", icon: <LuInbox size={15} />, label: "Go to Inbox", keys: ["G", "I"], run: go("/inbox") },
        { id: "n-tasks", icon: <LuCircleCheck size={15} />, label: "Go to My tasks", keys: ["G", "T"], run: go("/my-tasks") },
        ws.canApproveAnywhere && { id: "n-appr", icon: <LuShieldCheck size={15} />, label: "Go to Approvals", keys: ["G", "A"], run: go("/approvals") },
        { id: "n-kb", icon: <LuBrain size={15} />, label: "Go to Knowledge Base", keys: ["G", "K"], run: go("/kb") },
        { id: "n-ch", icon: <LuMessagesSquare size={15} />, label: "Go to Channels", keys: ["G", "C"], run: go("/channels") },
        { id: "n-people", icon: <LuUsers size={15} />, label: "Go to People", keys: ["G", "P"], run: go("/team") },
        { id: "n-set", icon: <LuSettings size={15} />, label: "Open settings", keys: ["G", "S"], run: go("/settings") },
        { id: "n-keys", icon: <LuKeyboard size={15} />, label: "Keyboard shortcuts", keys: ["?"], run: () => ws.setShortcutsOpen(true) },
      ].filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ws.creatableProjects.length, ws.canApproveAnywhere]
  );

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out = [];
    if (term && QUESTION.test(q.trim())) {
      out.push({
        title: "Knowledge Base",
        items: [{ id: "ask", icon: <LuSparkles size={15} className="text-accent" />, label: `Ask: “${q.trim()}”`, hint: "Answer from team knowledge", run: go(`/kb?ask=${encodeURIComponent(q.trim())}`) }],
      });
    }
    if (results) {
      if (results.tasks.length)
        out.push({
          title: "Tasks",
          items: results.tasks.map((t) => ({
            id: `t-${t._id}`,
            icon: <StatusIcon status={t.status} />,
            label: t.title,
            prefix: <span className="mono text-xs text-faint w-14 shrink-0">{t.ref}</span>,
            right: t.assignee && <Avatar user={t.assignee} size={18} />,
            run: () => ws.openTask(t.ref),
          })),
        });
      if (results.memories.length)
        out.push({
          title: "Knowledge",
          items: results.memories.map((m) => {
            const T = MEMORY_TYPE[m.type] || MEMORY_TYPE.note;
            return { id: `m-${m._id}`, icon: <T.icon size={15} style={{ color: T.color }} />, label: m.title, sub: m.snippet, run: go(`/kb/${m._id}`) };
          }),
        });
      if (results.projects.length)
        out.push({ title: "Projects", items: results.projects.map((p) => ({ id: `p-${p._id}`, icon: <ProjectMark project={p} size={16} />, label: p.name, hint: p.key, run: go(`/projects/${p.key}`) })) });
      if (results.people.length)
        out.push({ title: "People", items: results.people.map((u) => ({ id: `u-${u._id}`, icon: <Avatar user={u} size={18} />, label: fullName(u), hint: u.title, run: go(`/team?person=${u._id}`) })) });
      if (results.channels.length)
        out.push({ title: "Channels", items: results.channels.map((c) => ({ id: `c-${c._id}`, icon: <LuHash size={15} />, label: c.name, hint: c.topic, run: go(`/channels/${c._id}`) })) });
    }
    if (!term) {
      out.push({
        title: "Projects",
        items: ws.projects.slice(0, 6).map((p) => ({ id: `p-${p._id}`, icon: <ProjectMark project={p} size={16} />, label: p.name, hint: p.key, run: go(`/projects/${p.key}`) })),
      });
    }
    const matched = term ? actions.filter((a) => a.label.toLowerCase().includes(term)) : actions;
    if (matched.length) out.push({ title: term ? "Actions" : "Quick actions", items: matched });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, results, actions, ws.projects]);

  const flat = groups.flatMap((g) => g.items);
  useEffect(() => setActive(0), [q, results]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const run = (item) => {
    item.run();
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && flat[active]) {
      e.preventDefault();
      run(flat[active]);
    }
  };

  let idx = -1;
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex justify-center items-start pt-[14vh] px-4"
      style={{ background: "rgb(10 10 11 / 0.28)", animation: closing ? "fade-out 140ms ease-in both" : "fade 160ms ease-out both" }}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        className="w-full max-w-[640px] surface-pop overflow-hidden"
        style={{ animation: closing ? "modal-out 140ms ease-in both" : "modal-in 240ms var(--ease-out-expo) both" }}
        onKeyDown={onKeyDown}
      >
        <label className="flex items-center gap-3 h-14 px-4 border-b border-line">
          {loading ? <Spinner size={17} className="text-muted" /> : <LuSearch size={17} className="text-muted" />}
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks, knowledge, people… or ask a question"
            className="flex-1 bg-transparent outline-none text-[15px] text-ink placeholder:text-faint"
          />
          <Kbd keys={["Esc"]} />
        </label>
        <div ref={listRef} className="max-h-[420px] scroll p-2">
          {groups.map((g) => (
            <div key={g.title} className="mb-1.5 last:mb-0">
              <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium text-faint">{g.title}</p>
              {g.items.map((item) => {
                idx++;
                const i = idx;
                return (
                  <button
                    key={item.id}
                    data-idx={i}
                    onMouseMove={() => setActive(i)}
                    onClick={() => run(item)}
                    className={`relative flex items-center gap-3 w-full min-h-10 px-2.5 py-1.5 rounded-lg text-left transition-colors duration-75 ${i === active ? "bg-subtle" : ""}`}
                  >
                    {i === active && <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-accent" />}
                    <span className="grid place-items-center w-5 text-muted shrink-0">{item.icon}</span>
                    {item.prefix}
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13.5px] text-ink truncate">{item.label}</span>
                      {item.sub && <span className="block text-xs text-muted truncate">{item.sub}</span>}
                    </span>
                    {item.hint && <span className="text-xs text-faint truncate max-w-[180px]">{item.hint}</span>}
                    {item.right}
                    {item.keys && <Kbd keys={item.keys} />}
                    {i === active && !item.keys && <LuCornerDownLeft size={13} className="text-faint" />}
                  </button>
                );
              })}
            </div>
          ))}
          {debounced && results && !loading && flat.length === 0 && <p className="px-3 py-8 text-center text-[13px] text-muted">Nothing found for “{debounced}”</p>}
        </div>
        <div className="flex items-center gap-4 h-9 px-4 border-t border-line bg-canvas/70 text-[11.5px] text-faint">
          <span className="flex items-center gap-1.5">
            <Kbd keys={["↑", "↓"]} /> navigate
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd keys={["Enter"]} /> open
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <LuSparkles size={12} className="text-accent" /> End with “?” to ask the Knowledge Base
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
