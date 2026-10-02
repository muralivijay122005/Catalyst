// src/components/kb/MemoryEditor.jsx
// Create or edit knowledge. As you write, the local engine suggests a type and tags, warns about
// likely duplicates and offers related knowledge to link — before anything is saved.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuTriangleAlert, LuSparkles, LuX, LuLink2, LuGlobe, LuFolder, LuLock, LuCheck, LuArrowUpRight } from "react-icons/lu";
import Modal from "../ui/Modal";
import { toast } from "../ui/toast";
import { Kbd, Segmented, Spinner, Tooltip } from "../ui/primitives";
import Popover, { OptionList } from "../ui/Popover";
import { Markdown } from "../../lib/markdown";
import { api } from "../../lib/api";
import { useDebounced } from "../../lib/hooks";
import { MEMORY_TYPE, MEMORY_TYPES, VISIBILITY } from "../../lib/constants";
import { useWorkspace } from "../../context/WorkspaceContext";
import { TypeIcon } from "./bits";

const VIS_ICON = { workspace: LuGlobe, project: LuFolder, private: LuLock };

function TagInput({ tags, onChange, suggestions = [] }) {
  const [draft, setDraft] = useState("");
  const add = (t) => {
    const clean = t.toLowerCase().trim().replace(/^#/, "").replace(/\s+/g, "-");
    if (clean && !tags.includes(clean) && tags.length < 8) onChange([...tags, clean]);
    setDraft("");
  };
  const fresh = suggestions.filter((s) => !tags.includes(s)).slice(0, 4);
  return (
    <div>
      <div className="field h-auto min-h-9 flex-wrap py-1.5 gap-1">
        {tags.map((t) => (
          <span key={t} className="chip" style={{ animation: "var(--animate-pop)" }}>
            #{t}
            <button onClick={() => onChange(tags.filter((x) => x !== t))} className="text-faint hover:text-ink" aria-label={`Remove ${t}`}>
              <LuX size={11} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === "," || e.key === " ") && draft.trim()) {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && tags.length) onChange(tags.slice(0, -1));
          }}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={tags.length ? "" : "Add tags"}
          className="flex-1 min-w-[60px] bg-transparent outline-none text-[13px]"
        />
      </div>
      {fresh.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
          <LuSparkles size={11} className="text-accent" />
          {fresh.map((s) => (
            <button key={s} onClick={() => add(s)} className="chip chip-accent h-5 text-[11px] hover:bg-accent hover:text-white transition-colors">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MemoryEditor({ memory, defaults = {}, onClose, onSaved }) {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const editing = Boolean(memory?._id);
  const [title, setTitle] = useState(memory?.title || defaults.title || "");
  const [content, setContent] = useState(memory?.content || defaults.content || "");
  const [type, setType] = useState(memory?.type || defaults.type || null);
  const [tags, setTags] = useState(memory?.tags || defaults.tags || []);
  const [importance, setImportance] = useState(memory?.importance || defaults.importance || null);
  const [projectId, setProjectId] = useState(memory?.project?._id || memory?.projectId?._id || defaults.projectId || null);
  const [visibility, setVisibility] = useState(memory?.visibility || defaults.visibility || (defaults.projectId ? "project" : "workspace"));
  const [links, setLinks] = useState((memory?.links || defaults.links || []).map((l) => l._id || l));
  const [mode, setMode] = useState("write");
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const touched = useRef({ type: Boolean(memory?.type || defaults.type), tags: Boolean(memory?.tags?.length || defaults.tags?.length), importance: Boolean(memory?.importance) });
  const contentRef = useRef(null);

  const writable = useMemo(() => ws.projects.filter((p) => p.can?.writeKb), [ws.projects]);
  const project = ws.projects.find((p) => p._id === projectId);
  const debounced = useDebounced(`${title}\n${content}`, 450);

  // Live analysis
  useEffect(() => {
    if (debounced.trim().length < 20) {
      setAnalysis(null);
      return undefined;
    }
    const ctrl = new AbortController();
    setAnalyzing(true);
    api("/memories/analyze", { method: "POST", body: { title, content, excludeId: memory?._id }, signal: ctrl.signal })
      .then((a) => {
        setAnalysis(a);
        const s = a.suggestion;
        if (s && !touched.current.type) setType(s.type);
        if (s && !touched.current.importance) setImportance(s.importance);
      })
      .catch(() => {})
      .finally(() => setAnalyzing(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // Auto-grow content
  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.max(220, el.scrollHeight)}px`;
    }
  }, [content, mode]);

  useEffect(() => {
    if (!projectId && visibility === "project") setVisibility("workspace");
  }, [projectId, visibility]);

  const effectiveType = type || analysis?.suggestion?.type || "note";
  const canSave = content.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        content: content.trim(),
        type: effectiveType,
        tags: tags.length ? tags : analysis?.suggestion?.tags || [],
        importance: importance || analysis?.suggestion?.importance || 3,
        projectId: projectId || null,
        visibility,
        links,
      };
      if (editing) {
        const res = await api.patch(`/memories/${memory._id}`, body);
        toast.success("Knowledge updated", res.unverified ? { description: "Content changed, so it needs to be verified again." } : undefined);
        onSaved?.(memory._id);
      } else {
        const { memory: created } = await api.post("/memories", { ...body, tasks: defaults.tasks || [], source: defaults.source });
        toast.success("Added to the Knowledge Base", { action: { label: "Open", onClick: () => navigate(`/kb/${created._id}`) } });
        onSaved?.(created._id);
      }
      onClose();
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  };

  const suggestion = analysis?.suggestion;
  const duplicates = analysis?.duplicates || [];
  const related = analysis?.related || [];

  return (
    <Modal size="xl" bare onClose={onClose}>
      {(close) => (
        <div
          className="flex flex-col md:flex-row min-h-[520px]"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
        >
          {/* Writing area */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-2 px-6 pt-5">
              <span className="eyebrow flex items-center gap-1.5">
                <TypeIcon type={effectiveType} size={12} />
                {editing ? "Edit knowledge" : "New knowledge"}
              </span>
              <span className="ml-auto">
                <Segmented
                  size="sm"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "write", label: "Write" },
                    { value: "preview", label: "Preview" },
                  ]}
                />
              </span>
              <button className="icon-btn" onClick={close} aria-label="Close">
                <LuX size={16} />
              </button>
            </div>
            <div className="px-6 pt-3 flex-1">
              <input
                data-autofocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={suggestion?.title ? suggestion.title : "Title (optional — we'll suggest one)"}
                className="w-full bg-transparent outline-none text-[20px] font-semibold tracking-tight text-ink placeholder:text-faint/80"
              />
              {mode === "write" ? (
                <textarea
                  ref={contentRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={"What should the team remember?\n\nDecisions and why, how something is done, lessons learned, links people keep asking for… Markdown works: lists, **bold**, `code`, links."}
                  className="mt-3 w-full bg-transparent outline-none resize-none text-[14px] leading-[1.7] text-ink-2 placeholder:text-faint"
                />
              ) : (
                <div className="mt-3 min-h-[220px]">{content.trim() ? <Markdown text={content} /> : <p className="text-faint text-sm">Nothing to preview yet.</p>}</div>
              )}
            </div>

            {/* Live analysis */}
            {(duplicates.length > 0 || related.length > 0) && (
              <div className="mx-6 mb-4 space-y-2" style={{ animation: "var(--animate-enter)" }}>
                {duplicates.length > 0 && (
                  <div className="rounded-lg bg-amber-50 px-3 py-2.5" style={{ boxShadow: "inset 0 0 0 1px rgb(217 119 6 / 0.2)" }}>
                    <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-amber-800">
                      <LuTriangleAlert size={13} /> This may already be in the Knowledge Base
                    </p>
                    <div className="mt-1.5 space-y-1">
                      {duplicates.map((d) => (
                        <button
                          key={d._id}
                          onClick={() => window.open(`/kb/${d._id}`, "_blank")}
                          className="flex items-center gap-2 w-full text-left text-[12.5px] text-amber-900 hover:underline"
                        >
                          <TypeIcon type={d.type} size={12} />
                          <span className="truncate">{d.title}</span>
                          <span className="ml-auto text-[11px] text-amber-700 tabular-nums">{Math.round(d.score * 100)}% similar</span>
                          <LuArrowUpRight size={12} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {related.length > 0 && (
                  <div className="rounded-lg bg-canvas px-3 py-2.5" style={{ boxShadow: "inset 0 0 0 1px var(--color-line)" }}>
                    <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2">
                      <LuLink2 size={13} className="text-accent" /> Related knowledge — link it so people find both
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {related.map((r) => {
                        const on = links.includes(r._id);
                        return (
                          <button
                            key={r._id}
                            onClick={() => setLinks((l) => (on ? l.filter((x) => x !== r._id) : [...l, r._id]))}
                            className={`chip h-6 transition-colors ${on ? "chip-accent" : "hover:bg-line"}`}
                          >
                            {on ? <LuCheck size={11} /> : <TypeIcon type={r.type} size={11} />}
                            <span className="max-w-[220px] truncate">{r.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Properties */}
          <aside className="md:w-[290px] shrink-0 border-t md:border-t-0 md:border-l border-line bg-canvas/60 flex flex-col">
            <div className="flex-1 p-5 space-y-5 scroll">
              <div>
                <p className="label flex items-center justify-between">
                  Type
                  {analyzing ? <Spinner size={11} className="text-faint" /> : suggestion && !touched.current.type && <span className="flex items-center gap-1 text-[11px] font-normal text-accent"><LuSparkles size={10} /> suggested</span>}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {MEMORY_TYPES.map((t) => {
                    const meta = MEMORY_TYPE[t];
                    const on = effectiveType === t;
                    return (
                      <Tooltip key={t} label={meta.hint}>
                        <button
                          onClick={() => {
                            touched.current.type = true;
                            setType(t);
                          }}
                          className={`flex items-center gap-2 h-8 px-2.5 rounded-lg text-[12.5px] font-medium transition-all duration-150 ${on ? "bg-surface text-ink" : "text-muted hover:text-ink hover:bg-surface/70"}`}
                          style={on ? { boxShadow: `0 0 0 1.5px ${meta.color}, var(--shadow-xs)` } : undefined}
                        >
                          <meta.icon size={13} style={{ color: meta.color }} />
                          {meta.label}
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="label">Project</p>
                <Popover
                  width={250}
                  content={({ close: c }) => (
                    <OptionList
                      options={[{ value: null, label: "No project (workspace)" }, ...writable.map((p) => ({ value: p._id, label: p.name, hint: p.key, icon: <span className="dot" style={{ background: p.color }} /> }))]}
                      value={projectId}
                      onSelect={(v) => {
                        setProjectId(v);
                        if (v && visibility === "workspace") setVisibility("project");
                        c();
                      }}
                    />
                  )}
                >
                  {({ ref, toggle }) => (
                    <button ref={ref} onClick={toggle} className="field justify-start">
                      {project ? <span className="dot" style={{ background: project.color }} /> : <LuGlobe size={14} className="text-faint" />}
                      <span className="truncate">{project?.name || "No project"}</span>
                    </button>
                  )}
                </Popover>
              </div>

              <div>
                <p className="label">Who can see this</p>
                <div className="space-y-1">
                  {Object.entries(VISIBILITY).map(([v, meta]) => {
                    const Icon = VIS_ICON[v];
                    const disabled = v === "project" && !projectId;
                    return (
                      <button
                        key={v}
                        disabled={disabled}
                        onClick={() => setVisibility(v)}
                        className={`flex items-start gap-2.5 w-full px-2.5 py-2 rounded-lg text-left transition-all disabled:opacity-40 ${visibility === v ? "bg-surface shadow-[var(--shadow-card)]" : "hover:bg-surface/70"}`}
                      >
                        <Icon size={14} className={`mt-0.5 ${visibility === v ? "text-accent" : "text-faint"}`} />
                        <span>
                          <span className="block text-[12.5px] font-medium text-ink">{meta.label}</span>
                          <span className="block text-[11.5px] text-muted">{disabled ? "Pick a project first" : meta.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="label">Tags</p>
                <TagInput
                  tags={tags}
                  onChange={(t) => {
                    touched.current.tags = true;
                    setTags(t);
                  }}
                  suggestions={suggestion?.tags || []}
                />
              </div>

              <div>
                <p className="label">Importance</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const value = importance || suggestion?.importance || 3;
                    return (
                      <button
                        key={n}
                        onClick={() => {
                          touched.current.importance = true;
                          setImportance(n);
                        }}
                        className={`h-6 flex-1 rounded-md transition-all duration-200 ${n <= value ? "bg-ink" : "bg-line hover:bg-line-strong"}`}
                        aria-label={`Importance ${n}`}
                      />
                    );
                  })}
                </div>
                <p className="hint">{["", "Nice to know", "Useful", "Important", "Critical to remember", "Must never be forgotten"][importance || suggestion?.importance || 3]}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-4 border-t border-line">
              <span className="text-[11.5px] text-faint flex items-center gap-1">
                <Kbd keys={["mod", "Enter"]} /> to save
              </span>
              <button className="btn btn-secondary ml-auto" onClick={close}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={!canSave} onClick={save}>
                {saving && <Spinner size={13} />}
                {editing ? "Save" : "Add"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </Modal>
  );
}
