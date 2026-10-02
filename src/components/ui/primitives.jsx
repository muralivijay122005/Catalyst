// src/components/ui/primitives.jsx
import { useLayoutEffect, useRef, useState, cloneElement } from "react";
import { createPortal } from "react-dom";
import { modKey } from "../../lib/format";
import { ROLE } from "../../lib/constants";

/* ── Kbd ──────────────────────────────────────────────────── */
const KEY_LABEL = { mod: modKey, Enter: "↵", Esc: "Esc", shift: "⇧" };
export function Kbd({ keys = [], className = "" }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {keys.map((k, i) => (
        <kbd key={i} className="kbd">
          {KEY_LABEL[k] || k}
        </kbd>
      ))}
    </span>
  );
}

/* ── Tooltip ──────────────────────────────────────────────── */
export function Tooltip({ label, keys, children, side = "top", delay = 350 }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const timer = useRef(null);
  const tip = useRef(null);

  useLayoutEffect(() => {
    if (!show || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const t = tip.current?.getBoundingClientRect();
    const w = t?.width || 0;
    const h = t?.height || 0;
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(6, Math.min(left, window.innerWidth - w - 6));
    let top = side === "bottom" ? r.bottom + 6 : r.top - h - 6;
    if (side === "right") {
      left = r.right + 8;
      top = r.top + r.height / 2 - h / 2;
    }
    if (top < 4) top = r.bottom + 6;
    setPos({ left, top });
  }, [show, side]);

  if (!label) return children;
  const enter = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(true), delay);
  };
  const leave = () => {
    clearTimeout(timer.current);
    setShow(false);
    setPos(null);
  };

  return (
    <>
      {cloneElement(children, {
        // Keep the child's own ref (e.g. a popover anchor) working alongside ours
        ref: (el) => {
          ref.current = el;
          const own = children.props.ref;
          if (typeof own === "function") own(el);
          // eslint-disable-next-line react-hooks/immutability
          else if (own) own.current = el;
        },
        onMouseEnter: (e) => {
          enter();
          children.props.onMouseEnter?.(e);
        },
        onMouseLeave: (e) => {
          leave();
          children.props.onMouseLeave?.(e);
        },
        onMouseDown: (e) => {
          leave();
          children.props.onMouseDown?.(e);
        },
        onFocus: (e) => children.props.onFocus?.(e),
      })}
      {show &&
        createPortal(
          <div
            ref={tip}
            role="tooltip"
            className="fixed z-[120] pointer-events-none flex items-center gap-2 px-2 py-1 rounded-md bg-ink text-white text-xs font-medium whitespace-nowrap"
            style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, animation: "fade 120ms ease-out both", boxShadow: "0 4px 12px rgb(0 0 0 / 0.18)" }}
          >
            {label}
            {keys && (
              <span className="flex gap-0.5">
                {keys.map((k) => (
                  <span key={k} className="px-1 rounded bg-white/15 text-[10.5px] mono">
                    {KEY_LABEL[k] || k}
                  </span>
                ))}
              </span>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

/* ── Empty state ──────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, children, action, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`} style={{ animation: "var(--animate-enter)" }}>
      {Icon && (
        <span className="grid place-items-center size-11 mb-4 rounded-xl bg-surface text-muted" style={{ boxShadow: "var(--shadow-card)" }}>
          <Icon size={19} />
        </span>
      )}
      <p className="text-[14px] font-medium text-ink">{title}</p>
      {children && <p className="mt-1 max-w-sm text-[13px] text-muted leading-5">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ── Switch ───────────────────────────────────────────────── */
export function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:opacity-50 ${
        checked ? "bg-accent" : "bg-line-strong"
      }`}
    >
      <span
        className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm"
        style={{ transform: checked ? "translateX(16px)" : "none", transition: "transform 220ms var(--ease-spring)" }}
      />
    </button>
  );
}

/* ── Segmented control with sliding indicator ─────────────── */
export function Segmented({ options, value, onChange, size = "md" }) {
  const refs = useRef({});
  const [indicator, setIndicator] = useState(null);
  useLayoutEffect(() => {
    const el = refs.current[value];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [value, options.length]);
  const h = size === "sm" ? "h-7 text-xs" : "h-8 text-[13px]";
  return (
    <div className={`relative inline-flex items-center p-0.5 rounded-lg bg-subtle ${size === "sm" ? "h-8" : "h-9"}`} style={{ boxShadow: "inset 0 0 0 1px rgb(10 10 11 / 0.05)" }}>
      {indicator && (
        <span
          className="absolute top-0.5 bottom-0.5 rounded-md bg-surface"
          style={{ left: indicator.left, width: indicator.width, boxShadow: "var(--shadow-card)", transition: "left 260ms var(--ease-out-expo), width 260ms var(--ease-out-expo)" }}
        />
      )}
      {options.map((o) => (
        <button
          key={o.value}
          ref={(el) => (refs.current[o.value] = el)}
          onClick={() => onChange(o.value)}
          className={`relative z-10 inline-flex items-center gap-1.5 px-2.5 rounded-md font-medium transition-colors ${h} ${value === o.value ? "text-ink" : "text-muted hover:text-ink"}`}
        >
          {o.icon}
          {o.label}
          {o.count != null && <span className="text-faint tabular-nums">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ── Progress ─────────────────────────────────────────────── */
export function ProgressBar({ value = 0, color = "var(--color-accent)", className = "", height = 6 }) {
  return (
    <div className={`w-full rounded-full bg-subtle overflow-hidden ${className}`} style={{ height }}>
      <div
        className="h-full rounded-full origin-left"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color, transition: "width 600ms var(--ease-out-expo)", animation: "grow-x 700ms var(--ease-out-expo) both" }}
      />
    </div>
  );
}

export function ProgressRing({ value = 0, size = 18, stroke = 2.5, color = "var(--color-accent)", track = "#e7e7ea" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(100, value) / 100)}
        style={{ transition: "stroke-dashoffset 700ms var(--ease-out-expo)" }}
      />
    </svg>
  );
}

export function Spinner({ size = 14, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`animate-spin ${className}`} fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export const RoleBadge = ({ role, className = "" }) => (
  <span className={`inline-flex items-center h-5 px-1.5 rounded-md text-[11px] font-medium ${ROLE[role]?.tone || ROLE.member.tone} ${className}`}>
    {ROLE[role]?.label || role}
  </span>
);

export const ProjectMark = ({ project, size = 18 }) => (
  <span
    className="inline-grid place-items-center shrink-0 rounded-[5px] text-white font-semibold mono"
    style={{ width: size, height: size, background: project?.color || "#71717a", fontSize: Math.max(8, size * 0.42) }}
  >
    {project?.key?.[0] || "?"}
  </span>
);

export function SkeletonRows({ rows = 5, className = "" }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 h-9">
          <span className="skeleton size-4 rounded-full" />
          <span className="skeleton h-3.5" style={{ width: `${40 + ((i * 17) % 45)}%` }} />
          <span className="skeleton h-3.5 w-14 ml-auto" />
        </div>
      ))}
    </div>
  );
}

/** Animated count-up for stat tiles. */
export function CountUp({ value, duration = 700 }) {
  const [n, setN] = useState(0);
  const from = useRef(0);
  useLayoutEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(a + (value - a) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className="tabular-nums">{n}</span>;
}
