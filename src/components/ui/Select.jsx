// src/components/ui/Select.jsx
// Custom dropdown replacing native <select>: styled trigger + keyboard-navigable option list.
//   <Select value={v} onChange={setV} options={[{ value, label, icon?, hint?, description?, disabled?, disabledReason? }]} />
import { LuChevronDown, LuCheck } from "react-icons/lu";
import Popover from "./Popover";
import { useState, useEffect, useRef } from "react";

const TRIGGER = {
  field: "field justify-between",
  sm: "field h-8 text-xs justify-between",
  ghost: "btn btn-sm btn-ghost",
};

function SelectMenu({ options, value, onSelect }) {
  const start = Math.max(0, options.findIndex((o) => o.value === value));
  const [active, setActive] = useState(start);
  const list = useRef(null);

  useEffect(() => {
    list.current?.focus();
  }, []);
  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const move = (dir) => {
    let i = active;
    for (let n = 0; n < options.length; n++) {
      i = (i + dir + options.length) % options.length;
      if (!options[i].disabled) break;
    }
    setActive(i);
  };

  return (
    <div
      ref={list}
      role="listbox"
      tabIndex={-1}
      className="menu outline-none"
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          move(1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          move(-1);
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const o = options[active];
          if (o && !o.disabled) onSelect(o.value);
        }
      }}
    >
      {options.map((o, i) => (
        <button
          key={String(o.value)}
          type="button"
          role="option"
          aria-selected={o.value === value}
          data-index={i}
          data-active={i === active}
          disabled={o.disabled}
          title={o.disabled ? o.disabledReason : undefined}
          onMouseEnter={() => setActive(i)}
          onClick={() => onSelect(o.value)}
          className={`menu-item ${o.description ? "h-auto py-2 items-start" : ""}`}
        >
          {o.icon && <span className={`grid place-items-center w-4 shrink-0 ${o.description ? "mt-0.5" : ""}`}>{o.icon}</span>}
          <span className="flex-1 min-w-0">
            <span className="block truncate">{o.label}</span>
            {o.description && <span className="block text-[11.5px] text-muted leading-4 mt-0.5 whitespace-normal">{o.description}</span>}
          </span>
          {o.hint && <span className="text-[11px] text-faint">{o.hint}</span>}
          <LuCheck size={14} className={`shrink-0 text-accent transition-opacity ${o.value === value ? "opacity-100" : "opacity-0"}`} />
        </button>
      ))}
    </div>
  );
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  variant = "field",
  width,
  menuWidth,
  className = "",
  disabled,
  placement = "bottom-start",
  renderValue,
  style,
  "aria-label": ariaLabel,
}) {
  const current = options.find((o) => o.value === value);
  return (
    <Popover
      disabled={disabled}
      placement={placement}
      width={menuWidth}
      content={({ close }) => (
        <SelectMenu
          options={options}
          value={value}
          onSelect={(v) => {
            close();
            if (v !== value) onChange(v);
          }}
        />
      )}
    >
      {({ ref, toggle, open }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          onKeyDown={(e) => {
            if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !open) {
              e.preventDefault();
              toggle();
            }
          }}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={`${TRIGGER[variant] || TRIGGER.field} gap-2 text-left disabled:opacity-60 disabled:cursor-not-allowed ${open ? "shadow-[var(--shadow-focus)]" : ""} ${className}`}
          style={{ ...(width ? { width } : {}), ...style }}
        >
          <span className="flex items-center gap-2 min-w-0">
            {current?.icon}
            <span className={`truncate ${current ? (style?.color ? "" : "text-ink") : "text-faint"}`}>{renderValue ? renderValue(current) : current?.label || placeholder}</span>
          </span>
          <LuChevronDown size={14} className={`shrink-0 ${style?.color ? "opacity-60" : "text-faint"} transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      )}
    </Popover>
  );
}
