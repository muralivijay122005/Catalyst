// src/lib/escape.js
// One Escape key, many overlays: only the most recently opened overlay (popover → modal → panel) closes.
import { useEffect, useLayoutEffect, useRef } from "react";

const stack = [];

if (typeof window !== "undefined") {
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Escape" || !stack.length) return;
      e.preventDefault();
      e.stopPropagation();
      stack[stack.length - 1].current?.(e);
    },
    true
  );
}

export function useEscape(handler, active = true) {
  const ref = useRef(handler);
  useLayoutEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!active) return undefined;
    stack.push(ref);
    return () => {
      const i = stack.lastIndexOf(ref);
      if (i !== -1) stack.splice(i, 1);
    };
  }, [active]);
}

export const overlayOpen = () => stack.length > 0;
