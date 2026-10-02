// src/pages/Knowledge.jsx
// The Knowledge Base: search, ask, browse, curate and map the team's long-term memory.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  LuBrain,
  LuSearch,
  LuSparkles,
  LuPlus,
  LuWandSparkles,
  LuLibrary,
  LuPin,
  LuBadgeCheck,
  LuClock,
  LuCircleDashed,
  LuUser,
  LuX,
  LuList,
  LuNetwork,
  LuThumbsUp,
  LuArrowUp,
  LuCornerDownLeft,
  LuCpu,
  LuGlobe,
  LuFolder,
  LuLock,
} from "react-icons/lu";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { api } from "../lib/api";
import { useDebounced, useKey, isTypingTarget } from "../lib/hooks";
import { overlayOpen } from "../lib/escape";
import { renderInline } from "../lib/markdown";
import { MEMORY_TYPE, MEMORY_TYPES } from "../lib/constants";
import { timeAgo } from "../lib/format";
import { Avatar } from "../components/ui/Avatar";
import { CountUp, EmptyState, Kbd, ProjectMark, Segmented, Spinner, Tooltip } from "../components/ui/primitives";
import Popover, { OptionList } from "../components/ui/Popover";
import { TypeIcon, VerifiedMark } from "../components/kb/bits";
import AskPanel from "../components/kb/AskPanel";
import MemoryReader from "../components/kb/MemoryReader";
import MemoryEditor from "../components/kb/MemoryEditor";
import DistillModal from "../components/kb/DistillModal";
import KnowledgeMap from "../components/kb/KnowledgeMap";

const SAMPLE_QUESTIONS = ["How do we deploy to production?", "How many times are Stripe webhooks retried?", "Who do I escalate to on call?", "What are the Q4 priorities?"];
const VIS_ICON = { workspace: LuGlobe, project: LuFolder, private: LuLock };

function RailItem({ icon: Icon, label, count, active, onClick, tone, iconColor }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full h-8 px-2.5 rounded-lg text-[13px] transition-colors ${active ? "bg-surface text-ink font-medium shadow-[var(--shadow-card)]" : "text-ink-2/80 hover:bg-black/[0.04] hover:text-ink"}`}
    >
      {Icon && <Icon size={14} className={active ? "text-accent" : "text-muted"} style={iconColor ? { color: iconColor } : undefined} />}
      <span className="flex-1 text-left truncate">{label}</span>
      {count > 0 && <span className={`text-[11.5px] tabular-nums ${tone === "warn" ? "text-warn font-semibold" : "text-faint"}`}>{count}</span>}
    </button>
  );
}

function MemoryRow({ m, selected, onOpen, terms, index }) {
  const Vis = VIS_ICON[m.visibility];
  return (
    <button
      onClick={() => onOpen(m._id)}
      data-id={m._id}
      className={`group relative flex items-start gap-3 w-full px-4 py-3.5 text-left border-b border-line transition-colors ${selected ? "bg-accent-soft/60" : "hover:bg-subtle/70"}`}
      style={{ animation: `enter 380ms var(--ease-out-expo) ${Math.min(index, 14) * 22}ms both` }}
    >
      {selected && <span className="absolute left-0 top-3 bottom-3 w-[2.5px] rounded-r bg-accent" style={{ animation: "grow-y 220ms var(--ease-out-expo) both" }} />}
      <TypeIcon type={m.type} size={14} boxed />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13.5px] font-medium text-ink leading-5 line-clamp-1">{terms?.length ? renderInline(m.title, { highlight: terms }) : m.title}</span>
          {m.pinned && <LuPin size={11} className="text-accent fill-current shrink-0" />}
          <VerifiedMark verified={m.verified} stale={m.stale} size={13} />
        </div>
        <p className="text-[12.5px] text-muted leading-[18px] line-clamp-2 mt-0.5">{renderInline(m.snippet || m.summary, { highlight: terms })}</p>
        <div className="flex items-center gap-2 mt-2 text-[11.5px] text-faint min-w-0">
          {m.project && (
            <span className="flex items-center gap-1 shrink-0">
              <ProjectMark project={m.project} size={12} /> {m.project.key}
            </span>
          )}
          {m.visibility !== "workspace" && (
            <Tooltip label={m.visibility === "private" ? "Only you can see this" : "Visible to the project team"}>
              <Vis size={11} className="shrink-0" />
            </Tooltip>
          )}
          <span className="truncate">{m.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}</span>
          <span className="ml-auto flex items-center gap-2 shrink-0">
            {m.helpfulCount > 0 && (
              <span className="flex items-center gap-0.5">
                <LuThumbsUp size={11} /> {m.helpfulCount}
              </span>
            )}
            <Avatar user={m.createdBy} size={16} />
            {timeAgo(m.updatedAt)}
          </span>
        </div>
      </div>
    </button>
  );
}

function Overview({ facets, items, onOpen, onNew, onAsk, canWrite }) {
  const helpful = [...items].sort((a, b) => b.helpfulCount - a.helpfulCount).slice(0, 4);
  const verifiedPct = facets.total ? Math.round((facets.verified / facets.total) * 100) : 0;
  return (
    <div className="flex-1 scroll">
      <div className="px-8 py-8 max-w-[640px]" style={{ animation: "var(--animate-enter)" }}>
        <span className="grid place-items-center size-11 rounded-xl bg-accent text-white shadow-[0_8px_24px_-8px_rgb(37_99_235/0.6)]">
          <LuBrain size={20} />
        </span>
        <h2 className="h-display mt-4">Your team's long-term memory</h2>
        <p className="text-[14px] text-muted mt-2 leading-relaxed">
          Decisions, processes and lessons — captured from tasks and conversations, verified by managers, and surfaced automatically next to the work they relate to.
        </p>
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            ["Knowledge", facets.total],
            ["Verified", `${verifiedPct}%`],
            ["Due for review", facets.review],
          ].map(([label, value], i) => (
            <div key={label} className="card p-4">
              <p className="text-[11.5px] text-muted">{label}</p>
              <p className={`text-[22px] font-semibold tracking-tight mt-1 ${i === 2 && facets.review ? "text-warn" : "text-ink"}`}>{typeof value === "number" ? <CountUp value={value} /> : value}</p>
            </div>
          ))}
        </div>

        <h3 className="h-section mt-8 mb-2">Most helpful</h3>
        <div className="space-y-0.5 -mx-2">
          {helpful.map((m) => (
            <button key={m._id} onClick={() => onOpen(m._id)} className="flex items-center gap-2.5 w-full p-2 rounded-lg text-left hover:bg-subtle transition-colors">
              <TypeIcon type={m.type} size={13} boxed />
              <span className="flex-1 min-w-0 text-[13px] font-medium text-ink truncate">{m.title}</span>
              <span className="flex items-center gap-1 text-xs text-faint">
                <LuThumbsUp size={11} /> {m.helpfulCount}
              </span>
            </button>
          ))}
        </div>

        <h3 className="h-section mt-8 mb-3">Ways to grow it</h3>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {[
            { icon: LuSparkles, title: "Ask a question", text: "Get a cited answer from what the team already knows.", onClick: onAsk },
            canWrite && { icon: LuPlus, title: "Write it down", text: "Capture a decision or process while it's fresh.", onClick: onNew },
            { icon: LuWandSparkles, title: "Distill a channel", text: "Extract decisions from a conversation, then review.", onClick: () => onAsk("distill") },
            { icon: LuBrain, title: "Save from tasks", text: "Use the brain icon on any comment or chat message.", onClick: null },
          ]
            .filter(Boolean)
            .map((c) => (
              <button key={c.title} disabled={!c.onClick} onClick={() => c.onClick?.()} className="card card-hover p-4 text-left disabled:cursor-default disabled:hover:transform-none">
                <c.icon size={16} className="text-accent" />
                <p className="text-[13px] font-medium text-ink mt-2.5">{c.title}</p>
                <p className="text-xs text-muted mt-0.5 leading-5">{c.text}</p>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

export default function Knowledge() {
  const { memoryId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const ws = useWorkspace();

  const [mode, setMode] = useState(params.get("ask") ? "ask" : "search");
  const [q, setQ] = useState(params.get("ask") || "");
  const [view, setView] = useState("list");
  const [sort, setSort] = useState("relevant");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const [ask, setAsk] = useState(null); // { question, result, loading }
  const [editor, setEditor] = useState(params.get("new") === "1" ? { defaults: {} } : null);
  const [distill, setDistill] = useState(null);
  const [readerNonce, setReaderNonce] = useState(0);
  const input = useRef(null);
  const listRef = useRef(null);

  const filter = params.get("filter") || "";
  const type = params.get("type") || "";
  const tag = params.get("tag") || "";
  const project = params.get("project") || "";
  const debouncedQ = useDebounced(mode === "search" ? q.trim() : "", 220);
  const canWrite = can("kb.write");

  const setParam = (k, v) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (v) next.set(k, v);
      else next.delete(k);
      next.delete("new");
      next.delete("ask");
      return next;
    });

  // Load list
  useEffect(() => {
    const ctrl = new AbortController();
    const qs = new URLSearchParams();
    if (debouncedQ) qs.set("q", debouncedQ);
    if (filter) qs.set("filter", filter);
    if (type) qs.set("type", type);
    if (tag) qs.set("tag", tag);
    if (project) qs.set("project", project);
    qs.set("sort", sort);
    setLoading(true);
    api(`/memories?${qs}`, { signal: ctrl.signal })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [debouncedQ, filter, type, tag, project, sort, nonce]);

  const runAsk = async (question) => {
    const text = (question ?? q).trim();
    if (!text) return;
    setMode("ask");
    setQ(text);
    setAsk({ question: text, loading: true });
    try {
      const result = await api.post("/memories/ask", { question: text, project: project || undefined });
      setAsk({ question: text, result, loading: false });
    } catch (err) {
      setAsk({ question: text, result: { answer: "", sources: [], citations: [], error: err.message }, loading: false });
    }
  };

  // Deep link: /kb?ask=...
  useEffect(() => {
    const a = params.get("ask");
    if (a) runAsk(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = useMemo(() => data?.items || [], [data]);
  const facets = data?.facets;
  const terms = debouncedQ ? debouncedQ.split(/\s+/).filter((t) => t.length > 2) : null;

  const open = (id) => navigate(`/kb/${id}${window.location.search}`);
  const reload = () => setNonce((n) => n + 1);

  // Keyboard: N new, A ask, J/K move through results
  useKey("n", () => canWrite && setEditor({ defaults: {} }), { enabled: !editor && !distill });
  useKey("a", () => {
    setMode("ask");
    input.current?.focus();
  });
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || isTypingTarget(e.target) || overlayOpen() || !items.length) return;
      if (e.key !== "j" && e.key !== "k") return;
      const i = items.findIndex((m) => m._id === memoryId);
      const next = e.key === "j" ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1);
      open(items[next]._id);
      listRef.current?.querySelector(`[data-id="${items[next]._id}"]`)?.scrollIntoView({ block: "nearest" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, memoryId]);

  const activeFilters = [
    type && { label: MEMORY_TYPE[type]?.plural, clear: () => setParam("type", "") },
    tag && { label: `#${tag}`, clear: () => setParam("tag", "") },
    project && { label: ws.projectByKey(project)?.name || project, clear: () => setParam("project", "") },
  ].filter(Boolean);

  const library = [
    { id: "", label: "All knowledge", icon: LuLibrary, count: facets?.total },
    { id: "pinned", label: "Pinned", icon: LuPin, count: facets?.pinned },
    { id: "verified", label: "Verified", icon: LuBadgeCheck, count: facets?.verified },
    { id: "review", label: "Needs review", icon: LuClock, count: facets?.review, tone: "warn" },
    { id: "unverified", label: "Unverified", icon: LuCircleDashed, count: facets?.unverified },
    { id: "mine", label: "Created by me", icon: LuUser, count: facets?.mine },
  ];

  return (
    <div className="flex-1 min-h-0 flex">
      {/* Rail */}
      <aside className="hidden lg:flex flex-col w-[232px] shrink-0 border-r border-line bg-canvas/50">
        <div className="flex items-center gap-2.5 h-14 px-4 shrink-0">
          <span className="grid place-items-center size-7 rounded-lg bg-accent text-white">
            <LuBrain size={15} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[14px] font-semibold tracking-tight text-ink leading-4">Knowledge Base</h1>
            <Tooltip label={ws.kbStatus.ai ? `Answers by ${ws.kbStatus.model}` : "Search, answers and suggestions run locally — nothing leaves your workspace"}>
              <span className="flex items-center gap-1 text-[11px] text-muted">
                <LuCpu size={10} /> {ws.kbStatus.ai ? "AI-assisted" : "Local engine"}
              </span>
            </Tooltip>
          </div>
        </div>
        <div className="flex-1 scroll no-scrollbar px-3 pb-4 space-y-5">
          <div className="space-y-0.5">
            {library.map((l) => (
              <RailItem key={l.id} icon={l.icon} label={l.label} count={l.count} tone={l.tone} active={filter === l.id} onClick={() => setParam("filter", l.id)} />
            ))}
          </div>
          <div>
            <p className="eyebrow px-2.5 mb-1.5">Types</p>
            <div className="space-y-0.5">
              {MEMORY_TYPES.map((t) => (
                <RailItem key={t} icon={MEMORY_TYPE[t].icon} iconColor={MEMORY_TYPE[t].color} label={MEMORY_TYPE[t].plural} count={facets?.types[t]} active={type === t} onClick={() => setParam("type", type === t ? "" : t)} />
              ))}
            </div>
          </div>
          {facets && Object.keys(facets.projects).length > 0 && (
            <div>
              <p className="eyebrow px-2.5 mb-1.5">Projects</p>
              <div className="space-y-0.5">
                {Object.entries(facets.projects).map(([k, n]) => {
                  const p = ws.projectByKey(k);
                  return (
                    <button
                      key={k}
                      onClick={() => setParam("project", project === k ? "" : k)}
                      className={`flex items-center gap-2.5 w-full h-8 px-2.5 rounded-lg text-[13px] transition-colors ${project === k ? "bg-surface text-ink font-medium shadow-[var(--shadow-card)]" : "text-ink-2/80 hover:bg-black/[0.04]"}`}
                    >
                      <ProjectMark project={p || { key: k }} size={14} />
                      <span className="flex-1 text-left truncate">{p?.name || k}</span>
                      <span className="text-[11.5px] text-faint tabular-nums">{n}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {facets?.tags.length > 0 && (
            <div>
              <p className="eyebrow px-2.5 mb-2">Tags</p>
              <div className="flex flex-wrap gap-1 px-1.5">
                {facets.tags.slice(0, 18).map((t) => (
                  <button key={t.name} onClick={() => setParam("tag", tag === t.name ? "" : t.name)} className={`chip transition-colors ${tag === t.name ? "chip-accent" : "hover:bg-line"}`}>
                    #{t.name}
                    <span className="text-faint font-normal">{t.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* List column */}
      <section className={`${memoryId ? "hidden xl:flex" : "flex"} flex-col min-w-0 flex-1 xl:flex-none xl:w-[min(560px,42%)] border-r border-line`}>
        <div className="shrink-0 px-4 pt-3 pb-3 border-b border-line space-y-2.5">
          <div className="flex items-center gap-2">
            <h2 className="lg:hidden h-page mr-auto flex items-center gap-2">
              <LuBrain size={16} className="text-accent" /> Knowledge
            </h2>
            <span className="hidden lg:block mr-auto text-xs text-muted">{loading ? <Spinner size={12} /> : `${items.length} ${items.length === 1 ? "item" : "items"}`}</span>
            <Segmented
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: "list", label: "List", icon: <LuList size={12} /> },
                { value: "map", label: "Map", icon: <LuNetwork size={12} /> },
              ]}
            />
            {can("kb.distill") && (
              <Tooltip label="Extract knowledge from a channel or project">
                <button className="btn btn-sm btn-secondary" onClick={() => setDistill({})}>
                  <LuWandSparkles size={13} className="text-accent" /> Distill
                </button>
              </Tooltip>
            )}
            {canWrite && (
              <Tooltip label="New knowledge" keys={["N"]}>
                <button className="btn btn-sm btn-primary" onClick={() => setEditor({ defaults: { projectId: ws.projectByKey(project)?._id } })}>
                  <LuPlus size={14} /> New
                </button>
              </Tooltip>
            )}
          </div>

          {/* Search / Ask bar */}
          <div className={`flex items-center gap-2 h-11 pl-1.5 pr-2 rounded-xl bg-surface transition-shadow ${mode === "ask" ? "shadow-[0_0_0_1.5px_var(--color-accent-line),0_4px_16px_-6px_rgb(37_99_235/0.25)]" : "shadow-[var(--shadow-card)] focus-within:shadow-[var(--shadow-focus)]"}`}>
            <div className="flex p-0.5 rounded-lg bg-subtle shrink-0">
              {[
                { v: "search", icon: LuSearch, label: "Search" },
                { v: "ask", icon: LuSparkles, label: "Ask" },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => {
                    setMode(o.v);
                    input.current?.focus();
                  }}
                  className={`flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium transition-all ${mode === o.v ? (o.v === "ask" ? "bg-accent text-white shadow-sm" : "bg-surface text-ink shadow-[var(--shadow-card)]") : "text-muted hover:text-ink"}`}
                >
                  <o.icon size={12} /> {o.label}
                </button>
              ))}
            </div>
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Tab" && !e.shiftKey && !q) {
                  e.preventDefault();
                  setMode((m) => (m === "ask" ? "search" : "ask"));
                }
                if (e.key === "Enter") {
                  if (mode === "ask" || /\?$/.test(q.trim())) runAsk();
                }
                if (e.key === "Escape" && q) {
                  e.stopPropagation();
                  setQ("");
                  setAsk(null);
                }
              }}
              placeholder={mode === "ask" ? "Ask anything about how your team works…" : "Search titles, content, tags…"}
              className="flex-1 min-w-0 bg-transparent outline-none text-[14px] placeholder:text-faint"
            />
            {q && (
              <button className="icon-btn size-6" onClick={() => { setQ(""); setAsk(null); input.current?.focus(); }} aria-label="Clear">
                <LuX size={13} />
              </button>
            )}
            {mode === "ask" ? (
              <button className="grid place-items-center size-7 rounded-lg bg-accent text-white disabled:opacity-40 transition-transform active:scale-90" disabled={!q.trim()} onClick={() => runAsk()} aria-label="Ask">
                <LuArrowUp size={15} />
              </button>
            ) : (
              <Kbd keys={["A"]} className="opacity-60" />
            )}
          </div>

          {mode === "ask" && !ask && (
            <div className="flex flex-wrap gap-1.5" style={{ animation: "var(--animate-enter)" }}>
              {SAMPLE_QUESTIONS.map((s) => (
                <button key={s} onClick={() => runAsk(s)} className="chip h-6 hover:bg-accent-soft hover:text-accent transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {activeFilters.map((f) => (
                <span key={f.label} className="chip chip-accent h-6 pr-1">
                  {f.label}
                  <button onClick={f.clear} className="grid place-items-center size-4 rounded hover:bg-accent/15" aria-label="Clear filter">
                    <LuX size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div ref={listRef} className="flex-1 min-h-0 scroll">
          {ask && (
            <div className="p-4 border-b border-line bg-canvas/50">
              <AskPanel
                question={ask.question}
                result={ask.result}
                loading={ask.loading}
                onClose={() => setAsk(null)}
                onSave={() =>
                  setEditor({
                    defaults: {
                      title: ask.question.replace(/\?$/, ""),
                      content: ask.result.answer.replace(/\s?\[\d+\]/g, "").replace(/^• /gm, "- "),
                      type: "fact",
                      source: { kind: "answer", label: "Answer from Knowledge Base" },
                      links: ask.result.citations.map((c) => c.id),
                    },
                  })
                }
                onAddMissing={() => setEditor({ defaults: { title: ask.question.replace(/\?$/, "") } })}
              />
            </div>
          )}

          {view === "map" ? (
            <div className="p-4 h-full min-h-[480px] flex">{items.length ? <KnowledgeMap items={items} /> : <EmptyState icon={LuNetwork} title="Nothing to map" />}</div>
          ) : (
            <>
              {(filter || type || tag || project || debouncedQ) && items.length > 0 && !debouncedQ && (
                <div className="flex items-center gap-2 px-4 h-9 text-xs text-muted border-b border-line">
                  Sorted by
                  <Popover
                    width={180}
                    content={({ close }) => (
                      <OptionList
                        options={[
                          { value: "relevant", label: "Relevance" },
                          { value: "recent", label: "Recently updated" },
                          { value: "important", label: "Importance" },
                          { value: "helpful", label: "Most helpful" },
                        ]}
                        value={sort}
                        onSelect={(v) => {
                          setSort(v);
                          close();
                        }}
                      />
                    )}
                  >
                    {({ ref, toggle }) => (
                      <button ref={ref} onClick={toggle} className="font-medium text-ink-2 hover:text-ink">
                        {{ relevant: "Relevance", recent: "Recently updated", important: "Importance", helpful: "Most helpful" }[sort]}
                      </button>
                    )}
                  </Popover>
                </div>
              )}
              {loading && !data &&
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex gap-3 px-4 py-4 border-b border-line">
                    <span className="skeleton size-7 rounded-lg" />
                    <span className="flex-1 space-y-2">
                      <span className="skeleton block h-3.5 w-2/3" />
                      <span className="skeleton block h-3 w-full" />
                      <span className="skeleton block h-3 w-1/2" />
                    </span>
                  </div>
                ))}
              {data && !items.length && (
                <EmptyState
                  icon={debouncedQ ? LuSearch : LuBrain}
                  title={debouncedQ ? `Nothing matches “${debouncedQ}”` : "No knowledge here yet"}
                  action={
                    debouncedQ ? (
                      <button className="btn btn-secondary" onClick={() => runAsk(debouncedQ)}>
                        <LuSparkles size={13} className="text-accent" /> Ask instead
                      </button>
                    ) : (
                      canWrite && (
                        <button className="btn btn-primary" onClick={() => setEditor({ defaults: {} })}>
                          <LuPlus size={14} /> Add knowledge
                        </button>
                      )
                    )
                  }
                >
                  {debouncedQ ? "Try different words, or ask it as a question." : "Capture decisions, processes and lessons so nobody has to ask twice."}
                </EmptyState>
              )}
              {items.map((m, i) => (
                <MemoryRow key={m._id} m={m} index={i} selected={m._id === memoryId} onOpen={open} terms={terms} />
              ))}
              {debouncedQ && items.length > 0 && (
                <button onClick={() => runAsk(debouncedQ)} className="flex items-center gap-2 w-full px-4 h-11 text-[12.5px] text-accent hover:bg-accent-soft/60 transition-colors">
                  <LuSparkles size={13} /> Ask the Knowledge Base “{debouncedQ}”
                  <LuCornerDownLeft size={12} className="ml-auto opacity-60" />
                </button>
              )}
            </>
          )}
        </div>
      </section>

      {/* Reader */}
      <section className={`${memoryId ? "flex" : "hidden xl:flex"} flex-col flex-1 min-w-0`}>
        {memoryId ? (
          <MemoryReader
            key={`${memoryId}-${readerNonce}`}
            id={memoryId}
            onBack={() => navigate(`/kb${window.location.search}`)}
            onEdit={(m) => setEditor({ memory: m })}
            onChanged={reload}
          />
        ) : facets ? (
          <Overview facets={facets} items={items} onOpen={open} canWrite={canWrite} onNew={() => setEditor({ defaults: {} })} onAsk={(what) => (what === "distill" ? setDistill({}) : (setMode("ask"), input.current?.focus()))} />
        ) : null}
      </section>

      {editor && (
        <MemoryEditor
          memory={editor.memory}
          defaults={editor.defaults}
          onClose={() => {
            setEditor(null);
            if (params.get("new")) setParam("new", "");
          }}
          onSaved={(id) => {
            reload();
            if (editor.memory) setReaderNonce((n) => n + 1);
            else navigate(`/kb/${id}`);
          }}
        />
      )}
      {distill && <DistillModal initialSource={distill.kind ? distill : null} onClose={() => setDistill(null)} onSaved={reload} />}
    </div>
  );
}
