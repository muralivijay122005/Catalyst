// src/components/task/pickers.jsx
// Property pickers shared by the task panel, board cards, list rows and the create dialog.
import { LuCalendar, LuFlag, LuLock, LuTag, LuX } from "react-icons/lu";
import Popover, { OptionList } from "../ui/Popover";
import { StatusIcon, PriorityIcon } from "../ui/icons";
import { Avatar } from "../ui/Avatar";
import { Tooltip } from "../ui/primitives";
import { STATUS, STATUSES, PRIORITY, PRIORITIES } from "../../lib/constants";
import { dueLabel, fullName } from "../../lib/format";
import DatePicker from "../ui/DatePicker";

const LOCK_HINT = "You don't have permission to change this";

/** A compact property trigger used in panels: icon + value, lock when read-only. */
export function PropButton({ children, disabled, open, className = "", lockHint, ...rest }) {
  const btn = (
    <button
      type="button"
      disabled={disabled}
      className={`group/prop inline-flex items-center gap-2 h-8 px-2 -mx-2 rounded-md text-[13px] text-ink-2 max-w-full whitespace-nowrap outline-none transition-colors [&>svg]:shrink-0
        ${disabled ? "cursor-default" : "hover:bg-subtle"} ${open ? "bg-subtle" : ""} focus-visible:shadow-[var(--shadow-focus)] ${className}`}
      {...rest}
    >
      {children}
      {disabled && <LuLock size={11} className="text-faint opacity-0 group-hover/prop:opacity-100 transition-opacity" />}
    </button>
  );
  return disabled ? <Tooltip label={lockHint || LOCK_HINT}>{btn}</Tooltip> : btn;
}

export function StatusPicker({ value, onChange, disabled, children, exclude = [], lockHint }) {
  return (
    <Popover
      disabled={disabled}
      width={200}
      content={({ close }) => (
        <OptionList
          options={STATUSES.filter((s) => !exclude.includes(s)).map((s) => ({ value: s, label: STATUS[s].label, icon: <StatusIcon status={s} /> }))}
          value={value}
          onSelect={(v) => {
            close();
            if (v !== value) onChange(v);
          }}
        />
      )}
    >
      {({ ref, toggle, open }) =>
        children ? (
          children({ ref, toggle, open })
        ) : (
          <PropButton ref={ref} onClick={toggle} disabled={disabled} open={open} lockHint={lockHint}>
            <StatusIcon status={value} />
            {STATUS[value]?.label}
          </PropButton>
        )
      }
    </Popover>
  );
}

export function PriorityPicker({ value, onChange, disabled, children, lockHint }) {
  return (
    <Popover
      disabled={disabled}
      width={190}
      content={({ close }) => (
        <OptionList
          options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY[p].label, icon: <PriorityIcon priority={p} /> }))}
          value={value}
          onSelect={(v) => {
            close();
            if (v !== value) onChange(v);
          }}
        />
      )}
    >
      {({ ref, toggle, open }) =>
        children ? (
          children({ ref, toggle, open })
        ) : (
          <PropButton ref={ref} onClick={toggle} disabled={disabled} open={open} lockHint={lockHint}>
            <PriorityIcon priority={value} />
            <span className={value === "none" ? "text-faint" : ""}>{PRIORITY[value]?.label}</span>
          </PropButton>
        )
      }
    </Popover>
  );
}

export function AssigneePicker({ value, people, onChange, disabled, children, lockHint, selfOnly }) {
  const options = [
    { value: null, label: "Unassigned", icon: <Avatar user={null} size={18} /> },
    ...people.map((u) => ({
      value: u._id,
      label: fullName(u),
      keywords: u.username,
      icon: <Avatar user={u} size={18} />,
      disabled: selfOnly && u._id !== selfOnly,
      disabledReason: "Only managers can assign work to others",
    })),
  ];
  const current = people.find((u) => u._id === (value?._id || value));
  return (
    <Popover
      disabled={disabled}
      width={240}
      content={({ close }) => (
        <OptionList
          searchable
          placeholder="Assign to…"
          options={options}
          value={value?._id || value || null}
          onSelect={(v) => {
            close();
            if (v !== (value?._id || value || null)) onChange(v);
          }}
        />
      )}
    >
      {({ ref, toggle, open }) =>
        children ? (
          children({ ref, toggle, open, current })
        ) : (
          <PropButton ref={ref} onClick={toggle} disabled={disabled} open={open} lockHint={lockHint}>
            <Avatar user={current || (typeof value === "object" ? value : null)} size={18} />
            <span className={`truncate ${current || value ? "" : "text-faint"}`}>{current ? fullName(current) : value?.firstName ? fullName(value) : "Unassigned"}</span>
          </PropButton>
        )
      }
    </Popover>
  );
}

export function LabelPicker({ value = [], labels = [], onChange, disabled, lockHint }) {
  const color = (name) => labels.find((l) => l.name === name)?.color || "#a1a1aa";
  return (
    <Popover
      disabled={disabled}
      width={220}
      content={() => (
        <OptionList
          multiple
          searchable={labels.length > 6}
          empty="This project has no labels yet"
          options={labels.map((l) => ({ value: l.name, label: l.name, icon: <span className="dot" style={{ background: l.color }} /> }))}
          value={value}
          onSelect={(v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])}
        />
      )}
    >
      {({ ref, toggle, open }) => (
        <PropButton ref={ref} onClick={toggle} disabled={disabled} open={open} lockHint={lockHint} className="flex-wrap h-auto min-h-8 py-1">
          {value.length ? (
            value.map((l) => (
              <span key={l} className="chip">
                <span className="dot size-1.5" style={{ background: color(l) }} />
                {l}
              </span>
            ))
          ) : (
            <>
              <LuTag size={14} className="text-faint" />
              <span className="text-faint">Add labels</span>
            </>
          )}
        </PropButton>
      )}
    </Popover>
  );
}

export function MilestonePicker({ value, milestones = [], onChange, disabled, lockHint }) {
  const current = milestones.find((m) => m._id === value);
  return (
    <Popover
      disabled={disabled}
      width={230}
      content={({ close }) => (
        <OptionList
          empty="No milestones in this project"
          options={[{ value: null, label: "No milestone" }, ...milestones.map((m) => ({ value: m._id, label: m.name, icon: <LuFlag size={13} className="text-muted" />, hint: m.dueDate ? dueLabel(m.dueDate)?.text : "" }))]}
          value={value || null}
          onSelect={(v) => {
            close();
            onChange(v);
          }}
        />
      )}
    >
      {({ ref, toggle, open }) => (
        <PropButton ref={ref} onClick={toggle} disabled={disabled} open={open} lockHint={lockHint}>
          <LuFlag size={14} className={current ? "text-ink-2" : "text-faint"} />
          <span className={`truncate ${current ? "" : "text-faint"}`}>{current?.name || "No milestone"}</span>
        </PropButton>
      )}
    </Popover>
  );
}

/** Date property that opens the native date picker; shows relative due labels. */
export function DateButton({ value, onChange, disabled, placeholder = "Set date", isDue, status, lockHint }) {
  const due = value ? dueLabel(value, status) : null;
  const tone = isDue && due ? { overdue: "text-danger", today: "text-warn", soon: "text-ink" }[due.tone] || "" : "";
  return (
    <span className="relative inline-flex items-center group/date">
      <DatePicker value={value} onChange={onChange} disabled={disabled}>
        {({ ref, toggle, open }) => (
          <PropButton ref={ref} onClick={toggle} open={open} disabled={disabled} lockHint={lockHint}>
            <LuCalendar size={14} className={value ? tone || "text-ink-2" : "text-faint"} />
            <span className={value ? tone : "text-faint"}>{value ? (isDue ? due.text : new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })) : placeholder}</span>
          </PropButton>
        )}
      </DatePicker>
      {value && !disabled && (
        <button className="icon-btn size-5 ml-1 opacity-0 group-hover/date:opacity-100" onClick={() => onChange(null)} aria-label="Clear date">
          <LuX size={12} />
        </button>
      )}
    </span>
  );
}
