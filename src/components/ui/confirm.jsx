// src/components/ui/confirm.jsx
// const ok = await confirm({ title, body, confirmLabel, danger, requireText })
import { useEffect, useState } from "react";
import Modal from "./Modal";

let push = null;

export function confirm(opts) {
  return new Promise((resolve) => {
    if (!push) return resolve(window.confirm(opts.title));
    push({ ...opts, resolve });
  });
}

export function ConfirmHost() {
  const [req, setReq] = useState(null);
  const [text, setText] = useState("");
  useEffect(() => {
    push = (r) => {
      setText("");
      setReq(r);
    };
    return () => {
      push = null;
    };
  }, []);
  if (!req) return null;

  const finish = (value) => {
    req.resolve(value);
    setReq(null);
  };
  const blocked = req.requireText && text !== req.requireText;

  return (
    <Modal
      size="sm"
      align="center"
      title={req.title}
      onClose={() => finish(false)}
      footer={(close) => (
        <>
          <button className="btn btn-secondary" onClick={close}>
            Cancel
          </button>
          <button
            data-autofocus={!req.requireText || undefined}
            disabled={blocked}
            className={`btn ${req.danger ? "btn-danger-solid" : "btn-primary"}`}
            onClick={() => finish(true)}
          >
            {req.confirmLabel || "Confirm"}
          </button>
        </>
      )}
    >
      {req.body && <p className="text-[13px] text-muted leading-relaxed">{req.body}</p>}
      {req.requireText && (
        <div className="mt-4">
          <label className="label">
            Type <span className="mono text-ink">{req.requireText}</span> to confirm
          </label>
          <input className="field" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}
