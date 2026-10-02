// src/components/ui/Toaster.jsx
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LuCircleCheck, LuCircleAlert, LuInfo, LuX } from "react-icons/lu";
import { subscribeToasts } from "./toast";

const ICON = {
  success: <LuCircleCheck size={16} className="text-ok" />,
  error: <LuCircleAlert size={16} className="text-danger" />,
  info: <LuInfo size={16} className="text-accent" />,
};

export default function Toaster() {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 180);
  }, []);

  useEffect(
    () =>
      subscribeToasts((t) => {
        setToasts((list) => [...list.slice(-3), t]);
        setTimeout(() => dismiss(t.id), t.duration);
      }),
    [dismiss]
  );

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex items-start gap-2.5 w-[340px] max-w-[calc(100vw-2rem)] px-3.5 py-3 rounded-xl bg-surface text-[13px]"
          style={{
            boxShadow: "var(--shadow-pop)",
            animation: t.leaving ? "toast-out 180ms ease-in both" : "toast-in 320ms var(--ease-out-expo) both",
          }}
        >
          {ICON[t.tone] && <span className="mt-px">{ICON[t.tone]}</span>}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-ink leading-5">{t.message}</p>
            {t.description && <p className="text-muted leading-5 mt-0.5">{t.description}</p>}
          </div>
          {t.action && (
            <button
              className="btn btn-sm btn-secondary -my-0.5"
              onClick={() => {
                t.action.onClick();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button className="icon-btn size-5 -mr-1" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <LuX size={13} />
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}
