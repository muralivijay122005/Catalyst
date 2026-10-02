// src/components/ui/Modal.jsx
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { LuX } from "react-icons/lu";
import { useExit } from "../../lib/hooks";
import { useEscape } from "../../lib/escape";

const WIDTHS = { sm: "max-w-[420px]", md: "max-w-[560px]", lg: "max-w-[760px]", xl: "max-w-[980px]" };

/**
 * Accessible modal with enter/exit motion.
 * `children` may be a function receiving `close` so inner buttons can animate the exit.
 */
export default function Modal({ onClose, title, description, size = "md", children, footer, align = "top", bare = false }) {
  const [closing, close] = useExit(onClose, 150);
  const panel = useRef(null);

  useEscape(close);

  useEffect(() => {
    const prev = document.activeElement;
    // Focus the first field for fast keyboard use
    requestAnimationFrame(() => {
      const root = panel.current;
      const first =
        root?.querySelector("[data-autofocus]") ||
        root?.querySelector("input:not([type=hidden]):not([disabled]), textarea:not([disabled])") ||
        root?.querySelector(":scope > div:last-child button");
      first?.focus();
    });
    return () => prev?.focus?.();
  }, []);

  return createPortal(
    <div
      className={`fixed inset-0 z-[70] flex justify-center px-4 ${align === "center" ? "items-center" : "items-start pt-[12vh]"}`}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      style={{ animation: closing ? "fade-out 150ms ease-in both" : "fade 180ms ease-out both", background: "rgb(10 10 11 / 0.32)" }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={`w-full ${WIDTHS[size]} surface-pop flex flex-col max-h-[78vh] overflow-hidden`}
        style={{ animation: closing ? "modal-out 150ms ease-in both" : "modal-in 280ms var(--ease-out-expo) both" }}
      >
        {!bare && (title || description) && (
          <div className="flex items-start gap-3 px-5 pt-4 pb-3">
            <div className="flex-1 min-w-0">
              {title && <h2 className="h-page text-[15px]">{title}</h2>}
              {description && <p className="text-[13px] text-muted mt-0.5">{description}</p>}
            </div>
            <button className="icon-btn -mr-1.5 -mt-0.5" onClick={close} aria-label="Close">
              <LuX size={16} />
            </button>
          </div>
        )}
        <div className={`flex-1 min-h-0 scroll ${bare ? "" : "px-5 pb-5"}`}>{typeof children === "function" ? children(close) : children}</div>
        {footer && <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-line bg-canvas/60">{typeof footer === "function" ? footer(close) : footer}</div>}
      </div>
    </div>,
    document.body
  );
}
