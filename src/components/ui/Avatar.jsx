// src/components/ui/Avatar.jsx
import { initials, fullName } from "../../lib/format";
import { isOnline } from "../../lib/people";

export function Avatar({ user, size = 24, ring = false, presence = false, className = "" }) {
  const online = presence && isOnline(user);
  const fontSize = Math.max(9, Math.round(size * 0.4));
  return (
    <span
      className={`relative inline-grid place-items-center shrink-0 rounded-full font-semibold text-white select-none ${ring ? "ring-2 ring-surface" : ""} ${className}`}
      style={{ width: size, height: size, fontSize, background: user ? user.avatarColor || "#0f172a" : "#e4e4e7", letterSpacing: 0 }}
      title={fullName(user) || "Unassigned"}
    >
      {user ? initials(user) : <UnassignedGlyph size={size} />}
      {online && (
        <span
          className="absolute -bottom-px -right-px rounded-full bg-ok ring-2 ring-surface"
          style={{ width: Math.max(6, size * 0.3), height: Math.max(6, size * 0.3) }}
        />
      )}
    </span>
  );
}

const UnassignedGlyph = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="text-faint">
    <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
    <circle cx="12" cy="10" r="3.2" fill="currentColor" />
    <path d="M6.5 18.2c1.2-2.3 3.2-3.4 5.5-3.4s4.3 1.1 5.5 3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export function AvatarStack({ users = [], size = 22, max = 4 }) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <span className="flex items-center -space-x-1.5">
      {shown.map((u) => (
        <Avatar key={u._id} user={u} size={size} ring />
      ))}
      {rest > 0 && (
        <span
          className="grid place-items-center rounded-full bg-subtle text-[10px] font-semibold text-muted ring-2 ring-surface"
          style={{ width: size, height: size }}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
