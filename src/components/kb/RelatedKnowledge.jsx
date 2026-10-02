// src/components/kb/RelatedKnowledge.jsx
// Knowledge surfaced next to a task: what's explicitly linked, plus what the engine thinks is relevant.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuBrain, LuLink2, LuPlus, LuSparkles, LuUnlink } from "react-icons/lu";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";
import { toast } from "../ui/toast";
import { Tooltip } from "../ui/primitives";
import { TypeIcon, VerifiedMark } from "./bits";

function Item({ m, linked, onToggle, busy }) {
  const navigate = useNavigate();
  return (
    <div className="group relative flex items-start gap-2.5 p-2 -mx-2 rounded-lg hover:bg-subtle transition-colors">
      <TypeIcon type={m.type} size={13} boxed />
      <button className="flex-1 min-w-0 text-left" onClick={() => navigate(`/kb/${m._id}`)}>
        <span className="flex items-center gap-1.5">
          <span className="text-[12.5px] font-medium text-ink leading-5 line-clamp-1">{m.title}</span>
          <VerifiedMark verified={m.verified} stale={m.stale} size={12} />
        </span>
        <span className="block text-[11.5px] text-muted leading-4 line-clamp-2 mt-0.5">{m.snippet || m.summary}</span>
        {!linked && m.reasons?.length > 0 && <span className="block text-[11px] text-faint mt-1">Shares {m.reasons.join(", ")}</span>}
      </button>
      {onToggle && (
        <Tooltip label={linked ? "Unlink from task" : "Link to this task"}>
          <button disabled={busy} onClick={() => onToggle(m)} className="icon-btn size-6 opacity-0 group-hover:opacity-100 focus:opacity-100">
            {linked ? <LuUnlink size={12} /> : <LuLink2 size={12} />}
          </button>
        </Tooltip>
      )}
    </div>
  );
}

export default function RelatedKnowledge({ taskRef, onCapture, canLink }) {
  const { data, loading, reload } = useApi(`/memories/related?task=${encodeURIComponent(taskRef)}`);
  const [busy, setBusy] = useState(false);

  const toggle = async (m) => {
    setBusy(true);
    try {
      const { linked } = await api.post(`/memories/${m._id}/tasks`, { task: taskRef });
      toast.success(linked ? "Linked to task" : "Unlinked");
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const linked = data?.linked || [];
  const suggested = data?.suggested || [];

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <span className="grid place-items-center size-5 rounded-md bg-accent-soft text-accent">
          <LuBrain size={12} />
        </span>
        <h3 className="h-section">Knowledge</h3>
        {onCapture && (
          <Tooltip label="Capture what you learned on this task">
            <button className="icon-btn size-6 ml-auto" onClick={onCapture} aria-label="Add knowledge">
              <LuPlus size={14} />
            </button>
          </Tooltip>
        )}
      </div>

      {loading && !data && (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-2.5">
              <span className="skeleton size-[27px] rounded-lg" />
              <span className="flex-1 space-y-1.5 pt-0.5">
                <span className="skeleton block h-3 w-3/4" />
                <span className="skeleton block h-2.5 w-full" />
              </span>
            </div>
          ))}
        </div>
      )}

      {linked.length > 0 && (
        <div className="stagger">
          {linked.map((m, i) => (
            <div key={m._id} style={{ "--i": i }}>
              <Item m={m} linked onToggle={canLink ? toggle : null} busy={busy} />
            </div>
          ))}
        </div>
      )}

      {suggested.length > 0 && (
        <>
          <p className="flex items-center gap-1.5 mt-3 mb-1 text-[11px] font-medium text-faint">
            <LuSparkles size={11} className="text-accent" /> Might help with this task
          </p>
          <div className="stagger">
            {suggested.map((m, i) => (
              <div key={m._id} style={{ "--i": i + linked.length }}>
                <Item m={m} onToggle={canLink ? toggle : null} busy={busy} />
              </div>
            ))}
          </div>
        </>
      )}

      {data && !linked.length && !suggested.length && (
        <p className="text-xs text-muted leading-5">
          Nothing in the Knowledge Base relates to this task yet.
          {onCapture && (
            <>
              {" "}
              <button className="link" onClick={onCapture}>
                Capture what you learn
              </button>
            </>
          )}
        </p>
      )}
    </section>
  );
}
