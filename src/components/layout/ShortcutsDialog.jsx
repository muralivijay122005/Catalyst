// src/components/layout/ShortcutsDialog.jsx
import Modal from "../ui/Modal";
import { Kbd } from "../ui/primitives";
import { SHORTCUTS } from "../../lib/constants";

export function ShortcutList({ columns = 2 }) {
  return (
    <div className={`grid gap-x-8 gap-y-6 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {SHORTCUTS.map((g) => (
        <section key={g.group}>
          <h3 className="eyebrow mb-2">{g.group}</h3>
          <div className="divide-y divide-line">
            {g.items.map((s) => (
              <div key={s.label} className="flex items-center justify-between h-9 text-[13px]">
                <span className="text-ink-2">{s.label}</span>
                <span className="flex items-center gap-1">
                  {s.keys.length === 2 && !["mod", "shift"].includes(s.keys[0]) ? (
                    <>
                      <Kbd keys={[s.keys[0]]} />
                      <span className="text-[11px] text-faint">then</span>
                      <Kbd keys={[s.keys[1]]} />
                    </>
                  ) : (
                    <Kbd keys={s.keys} />
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function ShortcutsDialog({ onClose }) {
  return (
    <Modal title="Keyboard shortcuts" description="Move through Catalyst without leaving the keyboard." size="lg" onClose={onClose}>
      <ShortcutList />
    </Modal>
  );
}
