// src/BACKEND/utils/knowledge.cjs
// Local knowledge engine — works with no external AI.
//   tokenize / stem       → normalised terms
//   buildIndex / search   → BM25F ranking over title, summary, tags, entities and content
//   similar               → TF-IDF cosine + shared tags/entities (related knowledge, duplicate detection)
//   enrichLocal           → summary, type, tags, entities and importance from raw text
//   answerLocal           → extractive answer with [n] citations from the best-matching sentences
//   distillLocal          → candidate memories from a conversation or a project's tasks

const STOPWORDS = new Set(
  `a about above after again against all also am an and any are aren't as at be because been before being below
  between both but by can can't cannot could couldn't did didn't do does doesn't doing don't down during each few for
  from further get gets got had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself
  him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself just let's me more most mustn't
  my myself no nor not now of off on once only or other ought our ours ourselves out over own same shan't she she'd
  she'll she's should shouldn't so some such than that that's the their theirs them themselves then there there's
  these they they'd they'll they're they've this those through to too under until up us very was wasn't we we'd we'll
  we're we've were weren't what what's when when's where where's which while who who's whom why why's will with won't
  would wouldn't you you'd you'll you're you've your yours yourself yourselves ok okay yeah yes hey hi thanks thank
  please really still well going go want need like think know one two use used using via etc vs per
  team let lets make made new any every something anything thing things way ways`
    .split(/\s+/)
    .filter(Boolean)
);

// A handful of workspace synonyms so questions match how people actually write things down
const SYNONYMS = {
  deploy: ["release", "ship"],
  release: ["deploy", "ship"],
  ship: ["release", "deploy"],
  bug: ["defect", "issue", "incident"],
  incident: ["outage", "bug"],
  outage: ["incident"],
  login: ["auth", "sign"],
  auth: ["login", "authent"],
  db: ["database", "postgr", "mongo"],
  database: ["db"],
  pr: ["review", "pull"],
  ci: ["pipelin", "build"],
  env: ["environ"],
  staging: ["environ"],
  pay: ["payment", "stripe", "billing"],
  payment: ["stripe", "billing"],
  billing: ["payment", "invoic"],
  oncall: ["pager", "rotation"],
};

/** Very small suffix stripper — good enough to match "deploys"/"deploying"/"deployed". */
function stem(word) {
  let w = word;
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  for (const suffix of ["ational", "ization", "ations", "ation", "ments", "ment", "ness", "ings", "ing", "edly", "ed", "ers", "er", "ly", "es", "s"]) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 3) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  // "stopp" → "stop", "plann" → "plan"
  if (/([^aeiou])\1$/.test(w) && !/(ll|ss|zz)$/.test(w)) w = w.slice(0, -1);
  // "change" → "chang" (matches "changed"/"changing"), "escalate" → "escal" (matches "escalation")
  if (w.endsWith("e") && w.length > 4) w = w.slice(0, -1);
  if (w.endsWith("at") && w.length >= 6) w = w.slice(0, -2);
  return w;
}

function rawTokens(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[`*_>#[\](){}|~]/g, " ")
    .split(/[^a-z0-9+.@-]+/)
    .flatMap((t) => t.split(/[-.@]/).concat(t.includes("-") ? [t.replace(/-/g, "")] : []))
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOPWORDS.has(t) && !/^\d{1,2}$/.test(t));
}

const tokenize = (text) => rawTokens(text).map(stem);

function expandQuery(terms) {
  const out = new Map();
  terms.forEach((t) => out.set(t, Math.max(out.get(t) || 0, 1)));
  terms.forEach((t) => (SYNONYMS[t] || []).forEach((s) => out.set(stem(s), Math.max(out.get(stem(s)) || 0, 0.45))));
  return out;
}

/* ── Index ─────────────────────────────────────────────────── */

const FIELD_WEIGHTS = { title: 3.2, tags: 2.4, summary: 1.8, entities: 1.6, content: 1 };

function docFields(m) {
  return {
    title: m.title || "",
    tags: (m.tags || []).join(" "),
    summary: m.summary || "",
    entities: (m.entities || []).join(" "),
    content: m.content || "",
  };
}

function buildIndex(memories) {
  const docs = memories.map((m) => {
    const fields = docFields(m);
    const tf = new Map();
    let length = 0;
    for (const [field, text] of Object.entries(fields)) {
      const w = FIELD_WEIGHTS[field];
      for (const term of tokenize(text)) {
        tf.set(term, (tf.get(term) || 0) + w);
        length += w;
      }
    }
    return { memory: m, tf, length };
  });
  const df = new Map();
  docs.forEach((d) => d.tf.forEach((_v, term) => df.set(term, (df.get(term) || 0) + 1)));
  const avgLength = docs.reduce((s, d) => s + d.length, 0) / Math.max(docs.length, 1);
  return { docs, df, N: docs.length, avgLength };
}

const idf = (index, term) => {
  const n = index.df.get(term) || 0;
  return Math.log(1 + (index.N - n + 0.5) / (n + 0.5));
};

/**
 * BM25F search. Returns [{ memory, score, matched: [terms] }] best first.
 * Small boosts for exact title phrases, pinned, verified and important knowledge.
 */
function search(index, query, { limit = 50, minScore = 0.05 } = {}) {
  const terms = tokenize(query);
  if (!terms.length || !index.N) return [];
  const weighted = expandQuery(terms);
  const phrase = String(query).toLowerCase().trim();
  const k1 = 1.3;
  const b = 0.72;

  const results = [];
  for (const d of index.docs) {
    let score = 0;
    const matched = [];
    for (const [term, qWeight] of weighted) {
      const f = d.tf.get(term);
      if (!f) continue;
      const norm = f / (f + k1 * (1 - b + (b * d.length) / index.avgLength));
      score += qWeight * idf(index, term) * norm * (k1 + 1);
      if (qWeight === 1) matched.push(term);
    }
    if (score <= 0) continue;
    // Reward documents that cover more of the question, not just one rare word
    const coverage = matched.length / terms.length;
    score *= 0.55 + 0.45 * coverage;
    const m = d.memory;
    if (phrase.length > 3 && (m.title || "").toLowerCase().includes(phrase)) score *= 1.6;
    if (m.pinned) score *= 1.08;
    if (m.verified?.at) score *= 1.12;
    score *= 1 + ((m.importance || 3) - 3) * 0.04;
    if (score >= minScore) results.push({ memory: m, score, matched, coverage });
  }
  return results.sort((a, b2) => b2.score - a.score).slice(0, limit);
}

/* ── Similarity ─────────────────────────────────────────────── */

function vectorFor(index, memoryOrText) {
  const tf = new Map();
  if (typeof memoryOrText === "string") {
    tokenize(memoryOrText).forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
  } else {
    const fields = docFields(memoryOrText);
    for (const [field, text] of Object.entries(fields)) {
      tokenize(text).forEach((t) => tf.set(t, (tf.get(t) || 0) + FIELD_WEIGHTS[field]));
    }
  }
  const vec = new Map();
  let norm = 0;
  tf.forEach((f, t) => {
    const w = (1 + Math.log(f)) * idf(index, t);
    vec.set(t, w);
    norm += w * w;
  });
  return { vec, norm: Math.sqrt(norm) || 1 };
}

function cosine(a, b) {
  let dot = 0;
  const [small, big] = a.vec.size < b.vec.size ? [a, b] : [b, a];
  small.vec.forEach((w, t) => {
    const o = big.vec.get(t);
    if (o) dot += w * o;
  });
  return dot / (a.norm * b.norm);
}

/**
 * Memories most similar to a memory (or to free text, e.g. a task title + description).
 * Returns [{ memory, score, reasons: ["shared tag #x", ...] }]
 */
function similar(index, target, { limit = 6, minScore = 0.08, excludeId } = {}) {
  const tv = vectorFor(index, target);
  const tTags = new Set(typeof target === "string" ? [] : target.tags || []);
  const tEntities = new Set(typeof target === "string" ? [] : (target.entities || []).map((e) => e.toLowerCase()));
  const tProject = typeof target === "string" ? null : String(target.projectId?._id || target.projectId || "");

  const out = [];
  for (const d of index.docs) {
    const m = d.memory;
    if (excludeId && String(m._id) === String(excludeId)) continue;
    let score = cosine(tv, vectorFor(index, m));
    const sharedTags = (m.tags || []).filter((t) => tTags.has(t));
    const sharedEntities = (m.entities || []).filter((e) => tEntities.has(e.toLowerCase()));
    score += sharedTags.length * 0.06 + sharedEntities.length * 0.05;
    if (tProject && tProject === String(m.projectId?._id || m.projectId || "")) score += 0.03;
    if (score < minScore) continue;
    const reasons = [
      ...sharedTags.slice(0, 2).map((t) => `#${t}`),
      ...sharedEntities.slice(0, 2),
    ];
    out.push({ memory: m, score: Math.min(score, 1), reasons });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

/* ── Text helpers ───────────────────────────────────────────── */

function sentences(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split(/\n+/)
    .flatMap((line) => {
      const clean = line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").replace(/^#+\s*/, "").trim();
      if (!clean) return [];
      // Split on sentence punctuation followed by a capital — survives URLs, versions and "e.g."
      return clean.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/);
    })
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

const FILLER =
  /^(?:we(?:'ve| have)? (?:decided|agreed)(?: to| that| on)?|we will|turns out(?: that)?|final call on|heads up:?|make sure(?: that)?|from now on,?|let's go with|decision:?|lesson learned:?|reminder:?|fyi:?|note:?|so,?)\s+/i;

/** A short, readable title from a sentence: drop filler openers, cut on a word boundary. */
function titleFrom(text, max = 70) {
  let t = sentences(text)[0] || String(text || "");
  t = t.replace(/https?:\/\/([^/\s]+)\S*/g, "$1").replace(/\s+/g, " ").trim();
  for (let i = 0; i < 2; i++) t = t.replace(FILLER, "");
  t = t.replace(/[.:;,!?\s—-]+$/, "");
  if (t.length > max) t = t.slice(0, max).replace(/\s+\S*$/, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Sentences tagged with the list (contiguous bullet/numbered block) they belong to, if any. */
function units(text) {
  const out = [];
  let list = null;
  let listId = 0;
  String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .forEach((line) => {
      const isItem = /^\s*(?:[-*•]|\d+[.)])\s+/.test(line);
      if (!line.trim()) return;
      if (isItem && list === null) list = ++listId;
      if (!isItem) list = null;
      sentences(line).forEach((s) => out.push({ text: s, list }));
    });
  return out;
}

const firstSentence = (text, max = 200) => {
  const s = sentences(text)[0] || String(text || "").trim();
  return s.length > max ? `${s.slice(0, max - 1).trim()}…` : s;
};

/* ── Local enrichment ───────────────────────────────────────── */

// Common verbs/adjectives that make poor tags
const VERBISH = new Set(
  "should would could must make made take sent send keep kept give show shown said says start stop move moved goes went done doing able sure next last first good great better best fast slow easy hard every much many more less also really retried retry one two three four five six seven eight nine ten times time then end final update updates job jobs thing stuff people someone anyone today tomorrow yesterday week weeks day days"
    .split(" ")
);

const TYPE_CUES = [
  ["decision", /\b(decided|decision|we will|we'll|going with|agreed|chose|chosen|settled on|adopt(ed)?|switch(ed)? to|instead of|from now on|rule:)\b/i],
  ["process", /\b(steps?|how to|runbook|checklist|playbook|procedure|process|first,|then,|finally|workflow)\b|^\s*\d+[.)]\s/im],
  ["reference", /(https?:\/\/|\bspec\b|\bfigma\b|\bdocs?\b|\bdashboard\b|\blink\b|\bsee\b|\bendpoint\b)/i],
  ["insight", /\b(learned|lesson|turns out|realised|realized|noticed|insight|root cause|post-?mortem|because|caused by|retro)\b/i],
  ["fact", /\b(is|are|lives in|located|owned by|limit|quota|version|uses|runs on|hosted)\b/i],
];

const IMPORTANT_CUES = /\b(must|never|always|critical|security|compliance|legal|pci|gdpr|outage|incident|data loss|breaking|deadline|do not|don't)\b/i;

/**
 * Derive structure from raw text using the existing corpus for keyword weighting.
 * context: { index, knownEntities: [names of people/projects/tools], projectKeys }
 */
function enrichLocal(content, { title, index, knownEntities = [] } = {}) {
  const text = `${title || ""}\n${content}`;
  let type = "note";
  for (const [t, re] of TYPE_CUES) {
    if (re.test(text)) {
      type = t;
      break;
    }
  }

  // Keywords: term frequency × corpus rarity, mapped back to a readable surface form
  const counts = new Map();
  const surface = new Map();
  for (const raw of rawTokens(text)) {
    if (raw.length < 3 || /^\d+$/.test(raw)) continue;
    const s = stem(raw);
    counts.set(s, (counts.get(s) || 0) + 1);
    if (!surface.has(s) || raw.length < surface.get(s).length) surface.set(s, raw);
  }
  const scored = [...counts.entries()]
    .map(([s, c]) => [s, c * (index ? idf(index, s) + 0.3 : 1) * (title && tokenize(title).includes(s) ? 1.8 : 1)])
    .sort((a, b) => b[1] - a[1]);
  // Prefer tags the workspace already uses so the tag cloud converges instead of fragmenting
  const existingTags = new Map();
  index?.docs.forEach((d) => (d.memory.tags || []).forEach((t) => existingTags.set(stem(t.replace(/-/g, "")), t)));
  const tags = [];
  let fresh = 0;
  for (const [s, score] of scored) {
    const known = existingTags.get(s);
    const word = surface.get(s);
    if (known) {
      if (!tags.includes(known)) tags.push(known);
    } else if (
      fresh < 2 &&
      word &&
      word.length <= 24 &&
      !/(ed|ing|ly|ize|ise)$/.test(word) &&
      !/\d/.test(word) &&
      !VERBISH.has(word) &&
      score > 0 &&
      (counts.get(s) > 1 || (title && tokenize(title).includes(s)))
    ) {
      // New tags only for words that clearly carry the topic
      tags.push(word);
      fresh++;
    }
    if (tags.length >= 5) break;
  }

  // Entities: known people/projects/tools mentioned, plus capitalised terms that aren't sentence starts
  const entities = new Set();
  const lower = text.toLowerCase();
  knownEntities.forEach((e) => {
    if (e && e.length > 2 && lower.includes(e.toLowerCase())) entities.add(e);
  });
  (text.match(/(?<![.!?]\s|^)\b([A-Z][a-zA-Z0-9]+(?:\s[A-Z][a-zA-Z0-9]+)?)\b/gm) || [])
    .filter((w) => w.length > 2 && !STOPWORDS.has(w.toLowerCase()) && !/^(The|This|That|We|Our|It|If|When|For|And|But|Use|All)\b/.test(w))
    .slice(0, 10)
    .forEach((w) => entities.add(w));

  let importance = { decision: 4, process: 3, insight: 3, fact: 3, reference: 2, note: 2 }[type];
  if (IMPORTANT_CUES.test(text)) importance += 1;
  importance = Math.max(1, Math.min(5, importance));

  return {
    title: title?.trim() || titleFrom(firstSentence(content, 160)),
    summary: firstSentence(content, 220),
    type,
    tags,
    entities: [...entities].slice(0, 8),
    importance,
  };
}

/* ── Local answering ────────────────────────────────────────── */

/**
 * Build an extractive answer from ranked results.
 * Picks the sentences that best cover the question across the top memories and cites each one.
 */
const PRESCRIPTIVE = /\b(must|should|always|never|lesson|rule|decided|need to|required|only|every|don't|do not)\b/i;

function answerLocal(question, ranked, index) {
  const qTerms = new Set(tokenize(question));
  if (!ranked.length || !qTerms.size) {
    return { answer: "", citations: [], confidence: 0 };
  }
  // Rare words carry the meaning of a question; weight sentence matches by them
  const weight = (t) => (index ? idf(index, t) : 1);
  const totalWeight = [...qTerms].reduce((sum, t) => sum + weight(t), 0) || 1;
  const asksHow = /^(how|what should|what do|when should|should|can i|do we|what's the process|what is the process)/i.test(question.trim());
  // Only memories reasonably close to the best match may contribute sentences
  const top = ranked.filter((r) => r.score >= ranked[0].score * 0.5).slice(0, 4);
  const candidates = [];
  top.forEach((r, i) => {
    const m = r.memory;
    const pool = units(m.content);
    const seen = new Set();
    pool.forEach(({ text: s, list }, pos) => {
      const key = s.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      const terms = new Set(tokenize(s));
      let hits = 0;
      let hitWeight = 0;
      qTerms.forEach((t) => {
        if (terms.has(t)) {
          hits++;
          hitWeight += weight(t);
        }
      });
      const share = hitWeight / totalWeight;
      if (!hits || share < 0.2) return;
      const score =
        share * 2.4 +
        (r.score / (top[0].score || 1)) * 0.8 +
        (asksHow && PRESCRIPTIVE.test(s) ? 0.35 : 0) -
        pos * 0.02 -
        i * 0.15;
      candidates.push({ text: s, score, ref: i + 1, memory: m, hits, list, pos });
    });
  });

  candidates.sort((a, b) => b.score - a.score);
  const chosen = [];
  const covered = new Set();
  for (const c of candidates) {
    if (chosen.length >= 4) break;
    const terms = tokenize(c.text);
    const adds = terms.filter((t) => qTerms.has(t) && !covered.has(t)).length;
    if (chosen.length && adds === 0 && c.score < chosen[0].score * 0.8) continue;
    if (chosen.length && c.score < chosen[0].score * 0.55) continue;
    if (chosen.some((x) => x.text === c.text)) continue;
    chosen.push(c);
    terms.forEach((t) => covered.add(t));
  }
  let matchedByTitle = false;
  if (!chosen.length) {
    // The question matched the memory's title or tags, not its sentences: answer with the memory body
    const m = top[0].memory;
    const firstList = units(m.content).find((u) => u.list != null);
    chosen.push({ text: firstList?.text || m.summary || firstSentence(m.content), ref: 1, memory: m, list: firstList?.list ?? null });
    matchedByTitle = true;
  }

  const clean = (t) => t.replace(/\s+/g, " ").replace(/[.!?]*$/, ".");
  let answer;
  const lead = chosen[0];
  const asksForList = /^(what are|which|list|name|what's on|what is on)\b/i.test(question.trim()) || /\b(steps|priorities|checklist|options)\b/i.test(question);
  if (lead.list != null && (asksForList || matchedByTitle || chosen.filter((c) => c.list === lead.list).length > 1)) {
    // The answer lives in a list: return the list itself, in its original order
    const items = units(lead.memory.content).filter((u) => u.list === lead.list).slice(0, 8);
    answer = items.map((u) => `• ${clean(u.text)} [${lead.ref}]`).join("\n");
    chosen.splice(0, chosen.length, lead);
    tokenize(items.map((u) => u.text).join(" ")).forEach((t) => covered.add(t));
  } else {
    answer = chosen.map((c) => `${clean(c.text)} [${c.ref}]`).join(" ");
  }
  const coverage = [...qTerms].filter((t) => covered.has(t)).length / qTerms.size;
  const raw = matchedByTitle
    ? Math.min(0.85, top[0].coverage || 0)
    : coverage * 0.7 + Math.min(top[0].coverage || 0, 1) * 0.3;
  const confidence = Math.round(Math.min(1, raw) * 100) / 100;

  const citations = [];
  chosen.forEach((c) => {
    if (!citations.some((x) => x.ref === c.ref)) {
      citations.push({ ref: c.ref, id: c.memory._id, title: c.memory.title, type: c.memory.type });
    }
  });
  return { answer, citations: citations.sort((a, b) => a.ref - b.ref), confidence };
}

/* ── Local distillation ─────────────────────────────────────── */

const DISTILL_CUES = [
  ["decision", /\b(decided|decision|we will|we'll|going with|agreed|let's go with|settled|final call|approved|ship it with)\b/i, 4],
  ["process", /\b(from now on|always|never|make sure|remember to|the process|steps|checklist|runbook|rule)\b/i, 3],
  ["insight", /\b(turns out|root cause|learned|lesson|the issue was|because|caused by|noticed)\b/i, 3],
  ["fact", /\b(deadline|due|is at|lives|located|limit|version|endpoint|url|credentials? are|owner is)\b/i, 2],
  ["reference", /https?:\/\//i, 2],
];

/**
 * Turn chat lines into candidate memories.
 * lines: [{ author, text, at }]
 */
function distillLocal(lines, { label, index, knownEntities } = {}) {
  const out = [];
  lines.forEach((line, i) => {
    const text = String(line.text || "").trim();
    if (text.length < 25) return;
    const cue = DISTILL_CUES.find(([, re]) => re.test(text));
    if (!cue) return;
    const [type, , base] = cue;
    // Pull in the next message from the same author when it continues the thought
    const next = lines[i + 1];
    const body =
      next && next.author === line.author && next.text.length > 20 && !DISTILL_CUES.some(([, re]) => re.test(next.text))
        ? `${text} ${next.text}`
        : text;
    const enriched = enrichLocal(body, { index, knownEntities });
    out.push({
      title: titleFrom(text),
      content: `${body}\n\n— ${line.author}${line.at ? `, ${new Date(line.at).toISOString().slice(0, 10)}` : ""}${label ? ` in ${label}` : ""}`,
      summary: enriched.summary,
      type,
      tags: enriched.tags,
      entities: Array.from(new Set([line.author, ...enriched.entities])).slice(0, 8),
      importance: Math.min(5, base + (IMPORTANT_CUES.test(body) ? 1 : 0)),
    });
  });
  // Drop near-duplicates inside the batch
  const unique = [];
  out.forEach((c) => {
    const terms = new Set(tokenize(c.content));
    const dup = unique.some((u) => {
      const ut = new Set(tokenize(u.content));
      let shared = 0;
      terms.forEach((t) => ut.has(t) && shared++);
      return shared / Math.max(1, Math.min(terms.size, ut.size)) > 0.6;
    });
    if (!dup) unique.push(c);
  });
  return unique.sort((a, b) => b.importance - a.importance).slice(0, 8);
}

/** Where a memory's text best matches a query — used to show a relevant snippet in search results. */
function bestSnippet(memory, query, max = 220) {
  const qTerms = new Set(tokenize(query));
  if (!qTerms.size) return memory.summary || firstSentence(memory.content, max);
  let best = null;
  let bestHits = 0;
  for (const s of sentences(memory.content)) {
    const hits = tokenize(s).filter((t) => qTerms.has(t)).length;
    if (hits > bestHits) {
      best = s;
      bestHits = hits;
    }
  }
  const text = best || memory.summary || firstSentence(memory.content, max);
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}

module.exports = {
  tokenize,
  stem,
  buildIndex,
  search,
  similar,
  enrichLocal,
  answerLocal,
  distillLocal,
  bestSnippet,
  sentences,
  firstSentence,
  titleFrom,
};
