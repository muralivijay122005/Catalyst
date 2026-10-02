// src/components/ui/Popover.jsx
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuCheck, LuSearch } from "react-icons/lu";
import { useEscape } from "../../lib/escape";

/**
 * Anchored popover rendered in a portal. Flips above the anchor when there's no room below.
 *   <Popover content={({ close }) => <div className="menu">…</div>}>
 *     {({ ref, toggle, open }) => <button ref={ref} onClick={toggle}>Open</button>}
 *   </Popover>
 */
export default function Popover({ children, content, placement = "bottom-start", offset = 6, width, disabled = false, onOpenChange }) {
  const anchor = useRef(null);
  const panel = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);

  const setOpenState = useCallback(
    (v) => {
      setOpen(v);
      onOpenChange?.(v);
    },
    [onOpenChange]
  );
  const close = useCallback(() => setOpenState(false), [setOpenState]);
  const toggle = useCallback(() => !disabled && setOpenState(!open), [disabled, open, setOpenState]);

  const place = useCallback(() => {
    const a = anchor.current?.getBoundingClientRect();
    const p = panel.current?.getBoundingClientRect();
    if (!a) return;
    const h = p?.height || 240;
    const w = width || p?.width || 220;
    const below = window.innerHeight - a.bottom;
    const up = below < h + offset + 8 && a.top > below;
    let left = placement.endsWith("end") ? a.right - w : a.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    setPos({ left, top: up ? a.top - h - offset : a.bottom + offset, origin: up ? "bottom" : "top" });
  }, [placement, offset, width]);

  useEscape(() => {
    close();
    anchor.current?.focus?.();
  }, open);

  useLayoutEffect(() => {
    if (!open) return undefined;
    // Measure-then-position must happen before paint
    // eslint-disable-next-line react-hooks/set-state-in-effect
    place();
    const id = requestAnimationFrame(place);
    return () => cancelAnimationFrame(id);
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!panel.current?.contains(e.target) && !anchor.current?.contains(e.target)) close();
    };
    const onScroll = (e) => {
      if (!panel.current?.contains(e.target)) place();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, close, place]);

  return (
    <>
      {children({ ref: anchor, toggle, open, close })}
      {open &&
        createPortal(
          <div
            ref={panel}
            className="fixed z-[90]"
            style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, width, transformOrigin: pos?.origin }}
          >
            {content({ close })}
          </div>,
          document.body
        )}
    </>
  );
}

/**
 * Searchable, keyboard-navigable option list for pickers.
 * options: [{ value, label, icon, hint, disabled }]
 */
export function OptionList({ options, value, onSelect, multiple = false, searchable = false, placeholder = "Filter…", empty = "No matches", footer, className = "menu" }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef(null);
  const filtered = q ? options.filter((o) => `${o.label} ${o.keywords || ""}`.toLowerCase().includes(q.toLowerCase())) : options;
  const selected = (v) => (multiple ? (value || []).includes(v) : value === v);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = filtered[active];
      if (o && !o.disabled) onSelect(o.value);
    }
  };

  return (
    <div className={className} onKeyDown={onKeyDown} tabIndex={-1}>
      {(searchable || options.length > 8) && (
        <label className="flex items-center gap-2 h-9 px-3 mb-1 border-b border-line -mx-1 -mt-1">
          <LuSearch size={13} className="text-faint" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            placeholder={placeholder} className="flex-1 bg-transparent outline-none text-[13px]" />
        </label>
      )}
      {!(searchable || options.length > 8) && <input autoFocus className="sr-only" readOnly aria-hidden />}
      <div ref={listRef}>
        {filtered.length === 0 && <p className="px-2 py-2 text-[13px] text-faint">{empty}</p>}
        {filtered.map((o, i) =>
          o.separator ? (
            <div key={`sep-${i}`} className="menu-sep" />
          ) : (
            <button
              key={o.value ?? "none"}
              data-index={i}
              data-active={i === active}
              disabled={o.disabled}
              title={o.disabled ? o.disabledReason : undefined}
              onMouseEnter={() => setActive(i)}
              onClick={() => onSelect(o.value)}
              className="menu-item"
            >
              {o.icon && <span className="grid place-items-center w-4">{o.icon}</span>}
              <span className="flex-1 min-w-0 truncate">{o.label}</span>
              {o.hint && <span className="text-[11px] text-faint">{o.hint}</span>}
              {selected(o.value) && <LuCheck size={14} className="text-accent" />}
            </button>
          )
        )}
      </div>
      {footer}
    </div>
  );
}
