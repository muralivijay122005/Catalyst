// src/components/ui/icons.jsx
// Hand-drawn status and priority glyphs — crisp at 14px and consistent across the app.
import { STATUS } from "../../lib/constants";

export function StatusIcon({ status, size = 14, className = "" }) {
  const c = STATUS[status]?.color || "#a1a1aa";
  const common = { width: size, height: size, viewBox: "0 0 16 16", className: `shrink-0 ${className}`, "aria-label": STATUS[status]?.label };
  switch (status) {
    case "backlog":
      return (
        <svg {...common} fill="none">
          <circle cx="8" cy="8" r="6.25" stroke={c} strokeWidth="1.5" strokeDasharray="2.2 2.2" />
        </svg>
      );
    case "todo":
      return (
        <svg {...common} fill="none">
          <circle cx="8" cy="8" r="6.25" stroke={c} strokeWidth="1.5" />
        </svg>
      );
    case "in_progress":
      return (
        <svg {...common} fill="none">
          <circle cx="8" cy="8" r="6.25" stroke={c} strokeWidth="1.5" />
          <path d="M8 4.25a3.75 3.75 0 0 1 0 7.5z" fill={c} />
        </svg>
      );
    case "in_review":
      return (
        <svg {...common} fill="none">
          <circle cx="8" cy="8" r="6.25" stroke={c} strokeWidth="1.5" />
          <path d="M8 4.25A3.75 3.75 0 1 1 4.25 8H8z" fill={c} />
        </svg>
      );
    case "done":
      return (
        <svg {...common} fill="none">
          <circle cx="8" cy="8" r="7" fill={c} />
          <path d="M5.2 8.2 7 10l3.8-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "canceled":
      return (
        <svg {...common} fill="none">
          <circle cx="8" cy="8" r="7" fill={c} />
          <path d="m5.75 5.75 4.5 4.5m0-4.5-4.5 4.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export function PriorityIcon({ priority, size = 14, className = "" }) {
  const common = { width: size, height: size, viewBox: "0 0 16 16", className: `shrink-0 ${className}`, "aria-label": priority };
  if (priority === "urgent") {
    return (
      <svg {...common}>
        <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="#dc2626" />
        <path d="M8 4.5v4.2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8" cy="11.2" r="1" fill="#fff" />
      </svg>
    );
  }
  if (!priority || priority === "none") {
    return (
      <svg {...common}>
        {[3, 7, 11].map((x) => (
          <rect key={x} x={x - 0.5} y="7.25" width="3" height="1.5" rx="0.75" fill="#a1a1aa" />
        ))}
      </svg>
    );
  }
  const level = { low: 1, medium: 2, high: 3 }[priority] || 0;
  return (
    <svg {...common}>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={2 + i * 4.5}
          y={10 - i * 3.5}
          width="3"
          height={4 + i * 3.5}
          rx="1"
          fill={i < level ? "#3f3f46" : "#e4e4e7"}
        />
      ))}
    </svg>
  );
}

/** The Catalyst logo */
export function Logo({ size = 24, className = "" }) {
  return (
    <img
      src="/Catalyst_Logo_Black.png"
      alt="Catalyst"
      style={{ height: size, width: "auto" }}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}

export function CheckCircle({ checked, onClick, size = 16, disabled, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="group/check grid place-items-center shrink-0 rounded-full outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-default"
      style={{ width: size, height: size }}
    >
      {checked ? (
        <svg width={size} height={size} viewBox="0 0 16 16" className="check-anim">
          <circle cx="8" cy="8" r="7.5" fill="#16a34a" />
          <path d="M5 8.3 7 10.2l4-4.4" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 16 16" className="transition-transform duration-150 group-hover/check:scale-110">
          <circle cx="8" cy="8" r="6.75" fill="#fff" stroke="#c4c4cc" strokeWidth="1.5" className="group-hover/check:stroke-[#16a34a]" />
          <path d="M5 8.3 7 10.2l4-4.4" stroke="#16a34a" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover/check:opacity-60 transition-opacity" />
        </svg>
      )}
    </button>
  );
}
