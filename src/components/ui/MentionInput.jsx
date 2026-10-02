// src/components/ui/MentionInput.jsx
// Auto-growing textarea with @mention autocomplete. Typing "@" opens a people picker
// (↑/↓ to move, Enter/Tab to insert, Esc to dismiss); mentioned people get notified by the server.
import { useEffect, useRef, useState } from "react";
import { LuAtSign } from "react-icons/lu";
import { Avatar } from "./Avatar";
import { fullName } from "../../lib/format";

export default function MentionInput({
  value,
  onChange,
  onSubmit,
  people = [],
  placeholder,
  autoFocus,
  submitOn = "mod-enter", // "enter" for chat, "mod-enter" for comments
  minHeight = 64,
  maxHeight = 220,
  inputRef,
  className = "",
}) {
  const ref = useRef(null);
  const [query, setQuery] = useState(null);
  const [active, setActive] = useState(0);

  const q = (query || "").toLowerCase();
  const matches =
    query == null
      ? []
      : people
          .filter((u) => `${u.firstName} ${u.lastName} ${u.username}`.toLowerCase().includes(q))
          .sort((a, b) => Number(!a.firstName.toLowerCase().startsWith(q)) - Number(!b.firstName.toLowerCase().startsWith(q)))
          .slice(0, 6);

  const setRef = (el) => {
    ref.current = el;
    if (inputRef) inputRef.current = el;
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(maxHeight, Math.max(minHeight, el.scrollHeight))}px`;
  }, [value, minHeight, maxHeight]);

  const detect = (el) => {
    const before = el.value.slice(0, el.selectionStart);
    const m = /(?:^|[\s(])@([a-z0-9._-]*)$/i.exec(before);
    setQuery(m ? m[1] : null);
    setActive(0);
  };

  const pick = (u) => {
    const el = ref.current;
    const pos = el.selectionStart;
    const before = value.slice(0, pos).replace(/@([a-z0-9._-]*)$/i, `@${u.username} `);
    onChange(before + value.slice(pos));
    setQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(before.length, before.length);
    });
  };

  const onKeyDown = (e) => {
    if (matches.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (a + 1) % matches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (a - 1 + matches.length) % matches.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pick(matches[active]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setQuery(null);
        return;
      }
    }
    const submit = submitOn === "enter" ? e.key === "Enter" && !e.shiftKey : (e.metaKey || e.ctrlKey) && e.key === "Enter";
    if (submit) {
      e.preventDefault();
      setQuery(null);
      onSubmit?.();
    }
  };

  return (
    <div className="relative flex-1 min-w-0">
      <textarea
        ref={setRef}
        rows={1}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          detect(e.target);
        }}
        onClick={(e) => detect(e.target)}
        onBlur={() => setTimeout(() => setQuery(null), 120)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`block w-full bg-transparent outline-none resize-none text-[13.5px] leading-relaxed placeholder:text-faint ${className}`}
      />
      {query != null && (
        <div className="menu absolute left-0 bottom-full mb-2 w-72 z-20" role="listbox" aria-label="Mention someone">
          <p className="menu-label flex items-center gap-1">
            <LuAtSign size={11} /> Mention — they'll be notified
          </p>
          {matches.length === 0 && <p className="px-2 pb-2 text-xs text-faint">No one matches “{query}”</p>}
          {matches.map((u, i) => (
            <button
              key={u._id}
              type="button"
              role="option"
              aria-selected={i === active}
              data-active={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(u);
              }}
              className="menu-item"
            >
              <Avatar user={u} size={20} presence />
              <span className="flex-1 min-w-0">
                <span className="block truncate text-ink">{fullName(u)}</span>
              </span>
              <span className="text-[11px] text-faint truncate max-w-[110px]">{u.title || `@${u.username}`}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
