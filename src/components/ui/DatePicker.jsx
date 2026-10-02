// src/components/ui/DatePicker.jsx
// Calendar dropdown replacing native <input type="date">.
//   <DatePicker value={iso|null} onChange={(iso|null) => …} />               — field-style trigger
//   <DatePicker value={…} onChange={…}>{({ ref, toggle, open }) => …}</DatePicker> — custom trigger
// Dates are stored at 5pm local so a chosen day never slides across a timezone boundary.
import { useEffect, useRef, useState } from "react";
import { LuCalendar, LuChevronLeft, LuChevronRight, LuX } from "react-icons/lu";
import Popover from "./Popover";
import { useAuth } from "../../context/AuthContext";
import { formatDate, startOfDay } from "../../lib/format";

const DAY = 86400000;
const atFive = (d) => {
  const x = new Date(d);
  x.setHours(17, 0, 0, 0);
  return x.toISOString();
};
const sameDay = (a, b) => a && b && startOfDay(a).getTime() === startOfDay(b).getTime();

function Calendar({ value, onPick, onClear, clearable }) {
  const { user } = useAuth();
  const weekStart = user?.preferences?.weekStartsOn ?? 1;
  const selected = value ? new Date(value) : null;
  const [cursor, setCursor] = useState(() => {
    const d = selected || new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [focus, setFocus] = useState(() => startOfDay(selected || new Date()));
  const grid = useRef(null);

  useEffect(() => {
    grid.current?.focus();
  }, []);

  const offset = (cursor.getDay() - weekStart + 7) % 7;
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - offset);
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 7 + ((i + weekStart) % 7)).toLocaleDateString("en-US", { weekday: "narrow" }));
  const today = startOfDay();

  const moveFocus = (delta) => {
    const next = new Date(focus.getTime() + delta * DAY);
    setFocus(startOfDay(next));
    if (next.getMonth() !== cursor.getMonth() || next.getFullYear() !== cursor.getFullYear()) setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
  };

  const quick = [
    ["Today", today],
    ["Tomorrow", new Date(today.getTime() + DAY)],
    ["Next week", new Date(today.getTime() + 7 * DAY)],
  ];

  return (
    <div className="menu w-[264px] p-3 max-h-none" onMouseDown={(e) => e.preventDefault()}>
      <div className="flex gap-1 mb-3">
        {quick.map(([label, d]) => (
          <button key={label} type="button" onClick={() => onPick(atFive(d))} className="chip flex-1 justify-center h-7 hover:bg-accent-soft hover:text-accent transition-colors">
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center mb-2">
        <p className="flex-1 text-[13px] font-semibold text-ink pl-1">{cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
        <button type="button" className="icon-btn size-7" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month">
          <LuChevronLeft size={15} />
        </button>
        <button type="button" className="icon-btn size-7" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month">
          <LuChevronRight size={15} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {weekdays.map((w, i) => (
          <span key={i} className="grid place-items-center h-6 text-[10.5px] font-medium text-faint">
            {w}
          </span>
        ))}
      </div>
      <div
        ref={grid}
        tabIndex={0}
        role="grid"
        aria-label="Choose a date"
        className="grid grid-cols-7 gap-y-0.5 outline-none"
        onKeyDown={(e) => {
          const map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
          if (map[e.key]) {
            e.preventDefault();
            moveFocus(map[e.key]);
          } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPick(atFive(focus));
          }
        }}
      >
        {days.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isSel = sameDay(d, selected);
          const isToday = sameDay(d, today);
          const isFocus = sameDay(d, focus);
          return (
            <button
              key={d.toISOString()}
              type="button"
              tabIndex={-1}
              onClick={() => onPick(atFive(d))}
              onMouseEnter={() => setFocus(startOfDay(d))}
              className={`relative grid place-items-center h-8 rounded-lg text-[12.5px] tabular-nums transition-colors duration-100
                ${isSel ? "bg-accent text-white font-semibold" : isFocus ? "bg-subtle text-ink" : inMonth ? "text-ink-2" : "text-faint"}
                ${isToday && !isSel ? "font-semibold text-accent" : ""}`}
            >
              {d.getDate()}
              {isToday && <span className={`absolute bottom-1 size-1 rounded-full ${isSel ? "bg-white" : "bg-accent"}`} />}
            </button>
          );
        })}
      </div>
      {clearable && value && (
        <button type="button" onClick={onClear} className="btn btn-sm btn-ghost w-full mt-2">
          <LuX size={13} /> Clear date
        </button>
      )}
    </div>
  );
}

export default function DatePicker({ value, onChange, placeholder = "Pick a date", clearable = true, disabled, className = "", width, children, placement = "bottom-start" }) {
  return (
    <Popover
      disabled={disabled}
      placement={placement}
      content={({ close }) => (
        <Calendar
          value={value}
          clearable={clearable}
          onPick={(iso) => {
            close();
            onChange(iso);
          }}
          onClear={() => {
            close();
            onChange(null);
          }}
        />
      )}
    >
      {({ ref, toggle, open }) =>
        children ? (
          children({ ref, toggle, open })
        ) : (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            disabled={disabled}
            className={`field justify-between gap-2 disabled:opacity-60 ${open ? "shadow-[var(--shadow-focus)]" : ""} ${className}`}
            style={width ? { width } : undefined}
          >
            <span className={`flex items-center gap-2 truncate ${value ? "text-ink" : "text-faint"}`}>
              <LuCalendar size={14} className="text-faint shrink-0" />
              {value ? formatDate(value, { year: "numeric" }) : placeholder}
            </span>
          </button>
        )
      }
    </Popover>
  );
}
