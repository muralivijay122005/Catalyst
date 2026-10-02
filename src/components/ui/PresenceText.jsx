// src/components/ui/PresenceText.jsx
// "Online" with a green dot, or "Active 3 hrs ago" when offline. Updates live from the presence store.
import { usePresence, presenceLabel } from "../../lib/presence";

export default function PresenceText({ user, dot = true, className = "" }) {
  const p = usePresence(user);
  return (
    <span className={`inline-flex items-center gap-1.5 ${p.online ? "text-ok" : "text-muted"} ${className}`}>
      {dot && (
        <span className="relative flex size-2">
          {p.online && <span className="absolute inset-0 rounded-full bg-ok/50 animate-ping" style={{ animationDuration: "2.4s" }} />}
          <span className={`relative size-2 rounded-full ${p.online ? "bg-ok" : "bg-line-strong"}`} />
        </span>
      )}
      {presenceLabel(p)}
    </span>
  );
}
