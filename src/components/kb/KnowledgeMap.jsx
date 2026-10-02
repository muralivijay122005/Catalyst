// src/components/kb/KnowledgeMap.jsx
// A force-directed map of knowledge. Nodes are memories (sized by importance, colored by type);
// edges connect memories that share tags. Hover to see a neighborhood, click to open.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MEMORY_TYPE } from "../../lib/constants";

const W = 900;
const H = 600;

function layout(items) {
  const nodes = items.slice(0, 150).map((m, i) => {
    const a = (i / Math.max(1, items.length)) * Math.PI * 2;
    return { m, x: W / 2 + Math.cos(a) * 220, y: H / 2 + Math.sin(a) * 170, vx: 0, vy: 0, r: 5 + (m.importance || 3) * 1.7 };
  });
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    const ti = new Set(nodes[i].m.tags || []);
    for (let j = i + 1; j < nodes.length; j++) {
      const shared = (nodes[j].m.tags || []).filter((t) => ti.has(t)).length + (nodes[i].m.project?.key && nodes[i].m.project?.key === nodes[j].m.project?.key ? 0.3 : 0);
      if (shared >= 1) edges.push({ a: i, b: j, w: shared });
    }
  }
  for (let step = 0; step < 260; step++) {
    const cool = 1 - step / 260;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const d2 = Math.max(dx * dx + dy * dy, 80);
        const d = Math.sqrt(d2);
        const f = 2400 / d2;
        nodes[i].vx -= (dx / d) * f;
        nodes[i].vy -= (dy / d) * f;
        nodes[j].vx += (dx / d) * f;
        nodes[j].vy += (dy / d) * f;
      }
    }
    edges.forEach(({ a, b, w }) => {
      const dx = nodes[b].x - nodes[a].x;
      const dy = nodes[b].y - nodes[a].y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - 90) * 0.006 * Math.min(w, 3);
      nodes[a].vx += (dx / d) * f;
      nodes[a].vy += (dy / d) * f;
      nodes[b].vx -= (dx / d) * f;
      nodes[b].vy -= (dy / d) * f;
    });
    nodes.forEach((n) => {
      n.vx += (W / 2 - n.x) * 0.004;
      n.vy += (H / 2 - n.y) * 0.004;
      n.x = Math.max(30, Math.min(W - 30, n.x + n.vx * cool));
      n.y = Math.max(30, Math.min(H - 30, n.y + n.vy * cool));
      n.vx *= 0.55;
      n.vy *= 0.55;
    });
  }
  // Fit the view to where the nodes actually landed (plus room for labels)
  const pad = 60;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const box = nodes.length
    ? { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 }
    : { x: 0, y: 0, w: W, h: H };
  return { nodes, edges, box };
}

export default function KnowledgeMap({ items }) {
  const navigate = useNavigate();
  const [hover, setHover] = useState(null);
  const { nodes, edges, box } = useMemo(() => layout(items), [items]);

  const neighbors = useMemo(() => {
    if (hover == null) return null;
    const set = new Set([hover]);
    edges.forEach((e) => {
      if (e.a === hover) set.add(e.b);
      if (e.b === hover) set.add(e.a);
    });
    return set;
  }, [hover, edges]);

  return (
    <div className="relative flex-1 min-h-[420px] rounded-xl bg-canvas overflow-hidden" style={{ boxShadow: "inset 0 0 0 1px var(--color-line)" }}>
      <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(var(--color-line-strong) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} className="relative w-full h-full" preserveAspectRatio="xMidYMid meet">
        <g>
          {edges.map((e, i) => {
            const on = neighbors && neighbors.has(e.a) && neighbors.has(e.b) && (e.a === hover || e.b === hover);
            return (
              <line
                key={i}
                x1={nodes[e.a].x}
                y1={nodes[e.a].y}
                x2={nodes[e.b].x}
                y2={nodes[e.b].y}
                stroke={on ? "#2563eb" : "#a1a1aa"}
                strokeOpacity={neighbors ? (on ? 0.8 : 0.06) : 0.22}
                strokeWidth={on ? 1.6 : Math.min(2, 0.6 + e.w * 0.3)}
                style={{ transition: "stroke-opacity 200ms ease" }}
              />
            );
          })}
        </g>
        <g>
          {nodes.map((n, i) => {
            const meta = MEMORY_TYPE[n.m.type] || MEMORY_TYPE.note;
            const dim = neighbors && !neighbors.has(i);
            const showLabel = hover === i || (neighbors && neighbors.has(i)) || (!neighbors && (n.m.importance >= 5 || n.m.pinned));
            return (
              <g
                key={n.m._id}
                transform={`translate(${n.x},${n.y})`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => navigate(`/kb/${n.m._id}`)}
                className="cursor-pointer"
                style={{ opacity: dim ? 0.18 : 1, transition: "opacity 200ms ease", animation: `fade 500ms ease-out ${Math.min(i, 60) * 12}ms both` }}
              >
                <circle r={n.r + (hover === i ? 3 : 0)} fill={meta.color} fillOpacity={0.14} style={{ transition: "r 200ms var(--ease-spring)" }} />
                <circle r={n.r * 0.62} fill={meta.color} stroke="#fff" strokeWidth="1.5" />
                {n.m.verified && <circle r={2.4} cx={n.r * 0.55} cy={-n.r * 0.55} fill="#2563eb" stroke="#fff" strokeWidth="1" />}
                {showLabel && (
                  <text y={-n.r - 6} textAnchor="middle" className="pointer-events-none" style={{ fontSize: 11, fontWeight: 500, fill: "#27272a", paintOrder: "stroke", stroke: "#f7f7f8", strokeWidth: 4 }}>
                    {n.m.title.length > 38 ? `${n.m.title.slice(0, 36)}…` : n.m.title}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="absolute left-3 bottom-3 flex flex-wrap gap-x-3 gap-y-1 px-3 py-2 rounded-lg bg-surface/90 backdrop-blur text-[11px] text-muted" style={{ boxShadow: "var(--shadow-card)" }}>
        {Object.entries(MEMORY_TYPE).map(([k, meta]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: meta.color }} />
            {meta.label}
          </span>
        ))}
        <span className="text-faint">· lines = shared tags</span>
      </div>
    </div>
  );
}
