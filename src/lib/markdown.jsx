// src/lib/markdown.jsx
// Small, safe Markdown renderer → React elements (no innerHTML).
// Supports headings, paragraphs, bullet/numbered lists, blockquotes, fenced code, inline code, bold, italic,
// links, bare URLs, @mentions and task references like PAY-12.
import { Fragment } from "react";

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\((https?:\/\/[^)\s]+)\))|(https?:\/\/[^\s)]+)|(@[a-z0-9._-]{2,30})|(\b[A-Z]{2,5}-\d+\b)/g;

export function renderInline(text, { onTaskRef, highlight, people, me } = {}) {
  const out = [];
  let last = 0;
  let key = 0;
  const str = String(text || "");
  for (const m of str.matchAll(INLINE)) {
    if (m.index > last) out.push(...highlightText(str.slice(last, m.index), highlight, key++));
    const [tok] = m;
    if (m[1]) out.push(<code key={key++}>{tok.slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={key++}>{renderInline(tok.slice(2, -2), { onTaskRef, highlight })}</strong>);
    else if (m[3]) out.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    else if (m[4]) {
      const label = tok.slice(1, tok.indexOf("]"));
      out.push(
        <a key={key++} href={m[5]} target="_blank" rel="noreferrer">
          {label}
        </a>
      );
    } else if (m[6]) {
      out.push(
        <a key={key++} href={tok} target="_blank" rel="noreferrer">
          {tok.replace(/^https?:\/\//, "")}
        </a>
      );
    } else if (m[7]) {
      const person = people?.find((p) => p.username === tok.slice(1).toLowerCase());
      const isMe = me && tok.slice(1).toLowerCase() === me;
      out.push(
        <span
          key={key++}
          title={person ? `@${person.username}` : undefined}
          className={`inline-flex items-center rounded px-1 -mx-0.5 font-medium ${isMe ? "bg-amber-100 text-amber-900" : "bg-accent-soft text-accent"}`}
        >
          @{person ? `${person.firstName} ${person.lastName}` : tok.slice(1)}
        </span>
      );
    }
    else if (m[8]) {
      out.push(
        onTaskRef ? (
          <button key={key++} type="button" onClick={() => onTaskRef(tok)} className="mono text-[0.92em] text-accent hover:underline">
            {tok}
          </button>
        ) : (
          <span key={key++} className="mono text-[0.92em]">{tok}</span>
        )
      );
    }
    last = m.index + tok.length;
  }
  if (last < str.length) out.push(...highlightText(str.slice(last), highlight, key++));
  return out;
}

function highlightText(text, terms, k) {
  if (!terms?.length) return [<Fragment key={`t${k}`}>{text}</Fragment>];
  const rx = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return text.split(rx).map((part, i) => (i % 2 ? <mark key={`h${k}-${i}`}>{part}</mark> : <Fragment key={`t${k}-${i}`}>{part}</Fragment>));
}

export function Markdown({ text, className = "prose-kb", onTaskRef }) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push(<pre key={blocks.length}>{code.join("\n")}</pre>);
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const Tag = `h${h[1].length}`;
      blocks.push(<Tag key={blocks.length}>{renderInline(h[2], { onTaskRef })}</Tag>);
      i++;
      continue;
    }
    if (/^\s*[-*•]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*•]\s+/, ""));
      blocks.push(
        <ul key={blocks.length}>
          {items.map((it, j) => (
            <li key={j}>{renderInline(it, { onTaskRef })}</li>
          ))}
        </ul>
      );
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ""));
      blocks.push(
        <ol key={blocks.length}>
          {items.map((it, j) => (
            <li key={j}>{renderInline(it, { onTaskRef })}</li>
          ))}
        </ol>
      );
      continue;
    }
    if (line.startsWith(">")) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith(">")) quote.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push(<blockquote key={blocks.length}>{renderInline(quote.join(" "), { onTaskRef })}</blockquote>);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|```|>|\s*[-*•]\s+|\s*\d+[.)]\s+)/.test(lines[i])) para.push(lines[i++]);
    if (!para.length) para.push(lines[i++]);
    blocks.push(
      <p key={blocks.length}>
        {para.map((p, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {renderInline(p, { onTaskRef })}
          </Fragment>
        ))}
      </p>
    );
  }
  return <div className={className}>{blocks}</div>;
}
