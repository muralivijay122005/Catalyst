// src/components/kb/bits.jsx
import { LuBadgeCheck, LuClock } from "react-icons/lu";
import { MEMORY_TYPE } from "../../lib/constants";
import { Tooltip } from "../ui/primitives";
import { formatDate, fullName } from "../../lib/format";

export function TypeIcon({ type, size = 14, boxed = false }) {
  const meta = MEMORY_TYPE[type] || MEMORY_TYPE.note;
  if (!boxed) return <meta.icon size={size} style={{ color: meta.color }} className="shrink-0" />;
  return (
    <span className="grid place-items-center shrink-0 rounded-lg" style={{ width: size + 14, height: size + 14, background: meta.bg }}>
      <meta.icon size={size} style={{ color: meta.color }} />
    </span>
  );
}

export function TypeBadge({ type }) {
  const meta = MEMORY_TYPE[type] || MEMORY_TYPE.note;
  return (
    <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-md text-[11.5px] font-medium" style={{ background: meta.bg, color: meta.color }}>
      <meta.icon size={12} />
      {meta.label}
    </span>
  );
}

export function VerifiedMark({ verified, stale, size = 14, withLabel = false }) {
  if (stale) {
    return (
      <Tooltip label={`Verified ${formatDate(verified?.at)} — due for review`}>
        <span className="inline-flex items-center gap-1 text-warn text-xs font-medium">
          <LuClock size={size - 1} />
          {withLabel && "Needs review"}
        </span>
      </Tooltip>
    );
  }
  if (!verified) return null;
  return (
    <Tooltip label={`Verified by ${fullName(verified.by) || "a manager"} on ${formatDate(verified.at)}`}>
      <span className="inline-flex items-center gap-1 text-accent text-xs font-medium">
        <LuBadgeCheck size={size} />
        {withLabel && "Verified"}
      </span>
    </Tooltip>
  );
}

export function ImportanceBars({ value = 3 }) {
  return (
    <Tooltip label={`Importance ${value}/5`}>
      <span className="inline-flex items-end gap-[2px] h-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`w-[3px] rounded-full ${i <= value ? "bg-ink-2" : "bg-line"}`} style={{ height: 4 + i * 1.6 }} />
        ))}
      </span>
    </Tooltip>
  );
}
