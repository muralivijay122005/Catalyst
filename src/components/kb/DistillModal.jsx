// src/components/kb/DistillModal.jsx
// Turn a conversation or a project's discussion into reviewed knowledge: pick source → review candidates → save.
import { useEffect, useState } from "react";
import { LuHash, LuSparkles, LuArrowLeft, LuTriangleAlert, LuCheck, LuMessagesSquare, LuFolder, LuLock } from "react-icons/lu";
import Modal from "../ui/Modal";
import { Segmented, Spinner, ProjectMark } from "../ui/primitives";
import { toast } from "../ui/toast";
import { api } from "../../lib/api";
import { useWorkspace } from "../../context/WorkspaceContext";
import { MEMORY_TYPE, MEMORY_TYPES } from "../../lib/constants";
import { TypeIcon } from "./bits";
import Select from "../ui/Select";

export default function DistillModal({ initialSource, onClose, onSaved }) {
  const ws = useWorkspace();
  const [kind, setKind] = useState(initialSource?.kind || "channel");
  const [channels, setChannels] = useState(null);
  const [step, setStep] = useState(initialSource ? "loading" : "pick");
  const [result, setResult] = useState(null);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api("/channels").then((list) => setChannels(list.filter((c) => c.kind !== "dm"))).catch(() => setChannels([]));
  }, []);

  const run = async (k, refId) => {
    setStep("loading");
    try {
      const res = await api.post("/memories/distill", { kind: k, refId });
      setResult(res);
      setItems(res.candidates.map((c) => ({ ...c, selected: !c.duplicates?.length })));
      setStep("review");
    } catch (err) {
      toast.error(err.message);
      setStep("pick");
    }
  };

  useEffect(() => {
    if (initialSource) run(initialSource.kind, initialSource.refId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (close) => {
    const chosen = items.filter((i) => i.selected);
    setSaving(true);
    try {
      const { created } = await api.post("/memories/bulk", {
        items: chosen.map(({ title, content, summary, type, tags, entities, importance }) => ({ title, content, summary, type, tags, entities, importance })),
        source: result.source,
        projectId: result.source.projectId,
        visibility: result.source.visibility,
      });
      toast.success(`${created} ${created === 1 ? "memory" : "memories"} added to the Knowledge Base`, { description: `From ${result.source.label}` });
      onSaved?.();
      close();
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  };

  const update = (i, patch) => setItems((list) => list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const selected = items.filter((i) => i.selected).length;

  return (
    <Modal
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <span className="grid place-items-center size-6 rounded-md bg-accent text-white">
            <LuSparkles size={13} />
          </span>
          Distill knowledge
        </span>
      }
      description={step === "review" ? `Found ${items.length} things worth remembering in ${result?.source.label}. Review before saving.` : "Pull decisions, processes and lessons out of a conversation or a project's discussion."}
      onClose={onClose}
      footer={
        step === "review"
          ? (close) => (
              <>
                <button className="btn btn-ghost mr-auto" onClick={() => setStep("pick")}>
                  <LuArrowLeft size={14} /> Another source
                </button>
                <span className="text-xs text-muted">{selected} selected</span>
                <button className="btn btn-primary" disabled={!selected || saving} onClick={() => save(close)}>
                  {saving && <Spinner size={13} />} Save {selected || ""} to Knowledge Base
                </button>
              </>
            )
          : undefined
      }
    >
      {step === "pick" && (
        <div>
          <Segmented
            size="sm"
            value={kind}
            onChange={setKind}
            options={[
              { value: "channel", label: "Channels", icon: <LuMessagesSquare size={12} /> },
              { value: "project", label: "Projects", icon: <LuFolder size={12} /> },
            ]}
          />
          <div className="mt-3 grid sm:grid-cols-2 gap-1.5 stagger">
            {kind === "channel" &&
              (channels || []).map((c, i) => (
                <button key={c._id} style={{ "--i": i }} onClick={() => run("channel", c._id)} className="flex items-center gap-2.5 p-3 rounded-lg text-left card card-hover">
                  {c.kind === "private" ? <LuLock size={14} className="text-muted" /> : <LuHash size={14} className="text-muted" />}
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-ink">{c.name}</span>
                    <span className="block text-[11.5px] text-muted truncate">{c.topic || "No topic"}</span>
                  </span>
                </button>
              ))}
            {kind === "project" &&
              ws.projects.map((p, i) => (
                <button key={p._id} style={{ "--i": i }} onClick={() => run("project", p._id)} className="flex items-center gap-2.5 p-3 rounded-lg text-left card card-hover">
                  <ProjectMark project={p} size={18} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-ink">{p.name}</span>
                    <span className="block text-[11.5px] text-muted">Reads task comments and descriptions</span>
                  </span>
                </button>
              ))}
            {kind === "channel" && channels === null && <Spinner className="text-muted" />}
          </div>
        </div>
      )}

      {step === "loading" && (
        <div className="py-14 flex flex-col items-center text-center">
          <span className="grid place-items-center size-12 rounded-2xl bg-accent-soft text-accent" style={{ animation: "pulse-ring 1.4s ease-out infinite" }}>
            <LuSparkles size={20} />
          </span>
          <p className="mt-4 text-[14px] font-medium text-ink">Reading and extracting…</p>
          <p className="text-[13px] text-muted mt-1">Looking for decisions, processes, lessons and facts.</p>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-2.5">
          {items.length === 0 && (
            <p className="py-8 text-center text-[13px] text-muted">Nothing durable found — mostly chit-chat. Try a channel where decisions get made.</p>
          )}
          {items.map((c, i) => {
            const meta = MEMORY_TYPE[c.type];
            return (
              <div
                key={i}
                className={`rounded-xl p-3.5 transition-all duration-200 ${c.selected ? "bg-surface" : "bg-canvas opacity-70"}`}
                style={{ boxShadow: c.selected ? "0 0 0 1.5px var(--color-accent-line), var(--shadow-xs)" : "inset 0 0 0 1px var(--color-line)", animation: `enter 360ms var(--ease-out-expo) ${i * 50}ms both` }}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => update(i, { selected: !c.selected })}
                    className={`grid place-items-center size-5 mt-0.5 rounded-md shrink-0 transition-all ${c.selected ? "bg-accent text-white" : "bg-surface shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]"}`}
                    aria-label={c.selected ? "Deselect" : "Select"}
                  >
                    {c.selected && <LuCheck size={13} className="check-anim" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <input value={c.title} onChange={(e) => update(i, { title: e.target.value })} className="flex-1 bg-transparent outline-none text-[13.5px] font-semibold text-ink rounded px-1 -mx-1 focus:bg-subtle" />
                      <Select
                        value={c.type}
                        onChange={(type) => update(i, { type })}
                        placement="bottom-end"
                        menuWidth={240}
                        aria-label="Knowledge type"
                        options={MEMORY_TYPES.map((t) => {
                          const T = MEMORY_TYPE[t];
                          return { value: t, label: T.label, description: T.hint, icon: <T.icon size={13} style={{ color: T.color }} /> };
                        })}
                        renderValue={(o) => o.label}
                        style={{ background: meta.bg, color: meta.color }}
                        className="!h-6 !w-auto !px-2 !rounded-md !text-[11.5px] font-medium !shadow-none"
                        variant="field"
                      />
                    </div>
                    <p className="text-[12.5px] text-muted leading-5 mt-1 whitespace-pre-line line-clamp-4">{c.content}</p>
                    {c.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.tags.map((t) => (
                          <span key={t} className="chip h-5 text-[11px]">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                    {c.duplicates?.length > 0 && (
                      <p className="flex items-center gap-1.5 mt-2 text-[11.5px] text-amber-700">
                        <LuTriangleAlert size={12} /> Similar to “{c.duplicates[0].title}” ({Math.round(c.duplicates[0].score * 100)}%) — unchecked to avoid duplicates
                      </p>
                    )}
                  </div>
                  <TypeIcon type={c.type} size={14} />
                </div>
              </div>
            );
          })}
          {result && (
            <p className="text-[11.5px] text-faint text-center pt-1">
              Extracted by the {result.mode === "ai" ? "AI model" : "local engine"} · saved as {result.source.visibility} knowledge
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
