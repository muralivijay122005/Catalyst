// src/BACKEND/routes/memories.cjs
// Knowledge Base: capture, search, ask, distill, verify and connect team knowledge.
// Everything works offline with the local engine (utils/knowledge.cjs); when GROQ_API_KEY is set,
// answers, enrichment and distillation are upgraded to the LLM with the same retrieval underneath.
const express = require("express");
const router = express.Router();
const { Memory, Channel, Message, Project, Task, User } = require("../models/index.cjs");
const { MEMORY_TYPES, VISIBILITY } = require("../models/Memory.cjs");
const { authenticateToken } = require("../middleware/authenticationToken.cjs");
const { groqChat, groqJson, isConfigured, getModel } = require("../utils/groq.cjs");
const kb = require("../utils/knowledge.cjs");
const {
  canReadMemory,
  canWriteMemory,
  memoryCan,
  canEditMemory,
  canVerifyMemory,
  hasGlobal,
  projectRole,
  sameId,
  idOf,
} = require("../utils/permissions.cjs");
const { badRequest, forbidden, notFound, isObjectId } = require("../utils/http.cjs");
const { projectIndexFor, loadTask, notify } = require("../utils/access.cjs");
const { canRead: canReadChannel } = require("./channels.cjs");

router.use(authenticateToken);

const DAY = 86400000;

/* ── Helpers ───────────────────────────────────────────────── */

const clampImportance = (n) => Math.min(5, Math.max(1, Math.round(Number(n) || 3)));
const cleanTags = (tags) =>
  Array.from(
    new Set(
      (Array.isArray(tags) ? tags : [])
        .map((t) => String(t).toLowerCase().trim().replace(/^#/, "").replace(/\s+/g, "-"))
        .filter((t) => t && t.length <= 32)
    )
  ).slice(0, 8);
const cleanEntities = (entities) =>
  Array.from(new Set((Array.isArray(entities) ? entities : []).map((e) => String(e).trim()).filter(Boolean))).slice(0, 8);
const cleanType = (type) => (MEMORY_TYPES.includes(type) ? type : "note");

const isStale = (m) => Boolean(m.verified?.at) && Date.now() - new Date(m.verified.at).getTime() > (m.reviewEveryDays || 90) * DAY;

/** Every memory this user may read, plus the project index used for permission checks. */
async function readableMemories(user) {
  const projectIndex = await projectIndexFor(user);
  const all = await Memory.find({})
    .populate("createdBy", "firstName lastName avatarColor username")
    .populate("verified.by", "firstName lastName")
    .populate("projectId", "key name color")
    .lean();
  const readable = all.filter((m) => canReadMemory(user, { ...m, projectId: m.projectId?._id }, projectIndex));
  return { readable, projectIndex };
}

async function knownEntities() {
  const [users, projects] = await Promise.all([
    User.find({ status: "active" }).select("firstName lastName").lean(),
    Project.find({}).select("name key").lean(),
  ]);
  return [...users.map((u) => `${u.firstName} ${u.lastName}`), ...projects.map((p) => p.name)];
}

function light(user, m, projectIndex, extra = {}) {
  const project = m.projectId ? projectIndex.get(idOf(m.projectId._id || m.projectId)) : null;
  return {
    _id: m._id,
    title: m.title,
    summary: m.summary,
    type: m.type,
    tags: m.tags || [],
    importance: m.importance,
    pinned: m.pinned,
    visibility: m.visibility,
    project: m.projectId && m.projectId.key ? m.projectId : null,
    verified: m.verified?.at ? m.verified : null,
    stale: isStale(m),
    source: m.source,
    createdBy: m.createdBy,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    views: m.views || 0,
    helpfulCount: (m.helpful || []).length,
    isHelpful: (m.helpful || []).some((u) => sameId(u, user._id)),
    taskCount: (m.tasks || []).length,
    linkCount: (m.links || []).length,
    can: memoryCan(user, m, project),
    ...extra,
  };
}

async function enrich(content, { title, index, preferAi }) {
  const local = kb.enrichLocal(content, { title, index, knownEntities: await knownEntities() });
  if (!preferAi || !isConfigured()) return { ...local, enrichedBy: "local" };
  try {
    const result = await groqJson({
      messages: [
        {
          role: "system",
          content: `You are the knowledge engine of Catalyst, a team project-management workspace.
Turn raw notes into a structured, durable team memory. Respond with a JSON object only:
{"title": "short specific title, max 8 words", "summary": "one sentence, max 30 words",
 "type": one of ${JSON.stringify(MEMORY_TYPES)}, "tags": ["2-5 lowercase hyphenated tags"],
 "entities": ["people, systems, projects or tools explicitly mentioned"], "importance": 1-5}
decision = a choice that was made; process = how something is done; insight = lesson learned;
fact = stable information; reference = link/spec/pointer; note = anything else. Never invent facts.`,
        },
        { role: "user", content: `${title ? `Title: ${title}\n` : ""}Raw memory:\n"""\n${content.slice(0, 6000)}\n"""` },
      ],
      temperature: 0.2,
      maxTokens: 500,
    });
    return {
      title: String(result.title || local.title).slice(0, 160),
      summary: String(result.summary || local.summary).slice(0, 400),
      type: cleanType(result.type),
      tags: cleanTags(result.tags?.length ? result.tags : local.tags),
      entities: cleanEntities(result.entities?.length ? result.entities : local.entities),
      importance: clampImportance(result.importance),
      enrichedBy: "groq",
    };
  } catch (err) {
    console.warn("Groq enrichment failed, using local:", err.message);
    return { ...local, enrichedBy: "local" };
  }
}

/** Validate projectId + visibility against what the user may write. */
async function resolveScope(user, { projectId, visibility }) {
  let project = null;
  if (projectId) {
    if (!isObjectId(String(projectId))) throw badRequest("Unknown project");
    project = await Project.findById(projectId);
    if (!project || !projectRole(user, project)) throw notFound("Project");
  }
  if (!canWriteMemory(user, project)) {
    throw forbidden(project ? `You can't add knowledge to ${project.name}` : "Your role can't add knowledge");
  }
  let vis = VISIBILITY.includes(visibility) ? visibility : project ? "project" : "workspace";
  if (vis === "project" && !project) vis = "workspace";
  return { project, visibility: vis };
}

const duplicatesOf = (index, target, excludeId) =>
  kb
    .similar(index, target, { limit: 3, minScore: 0.42, excludeId })
    .map((r) => ({ _id: r.memory._id, title: r.memory.title, type: r.memory.type, score: Math.round(r.score * 100) / 100 }));

/* ── Status & facets ───────────────────────────────────────── */

router.get("/status", (_req, res) => {
  res.json({ ai: isConfigured(), model: isConfigured() ? getModel() : null, engine: isConfigured() ? "groq" : "local" });
});

/* ── List / search ─────────────────────────────────────────── */

router.get("/", async (req, res) => {
  const { q, type, tag, project, filter, sort = "relevant", limit } = req.query;
  const { readable, projectIndex } = await readableMemories(req.user);

  // Facets are computed over everything the user can read, before filters
  const facets = { types: {}, tags: {}, projects: {}, total: readable.length, pinned: 0, verified: 0, review: 0, mine: 0, unverified: 0 };
  readable.forEach((m) => {
    facets.types[m.type] = (facets.types[m.type] || 0) + 1;
    (m.tags || []).forEach((t) => (facets.tags[t] = (facets.tags[t] || 0) + 1));
    if (m.projectId?.key) facets.projects[m.projectId.key] = (facets.projects[m.projectId.key] || 0) + 1;
    if (m.pinned) facets.pinned++;
    if (m.verified?.at) facets.verified++;
    else facets.unverified++;
    if (isStale(m)) facets.review++;
    if (sameId(m.createdBy, req.user._id)) facets.mine++;
  });
  facets.tags = Object.entries(facets.tags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([name, count]) => ({ name, count }));

  let pool = readable;
  if (type && MEMORY_TYPES.includes(type)) pool = pool.filter((m) => m.type === type);
  if (tag) pool = pool.filter((m) => (m.tags || []).includes(String(tag).toLowerCase()));
  if (project) pool = pool.filter((m) => m.projectId?.key === String(project).toUpperCase());
  if (filter === "pinned") pool = pool.filter((m) => m.pinned);
  if (filter === "verified") pool = pool.filter((m) => m.verified?.at);
  if (filter === "unverified") pool = pool.filter((m) => !m.verified?.at);
  if (filter === "review") pool = pool.filter(isStale);
  if (filter === "mine") pool = pool.filter((m) => sameId(m.createdBy, req.user._id));

  let items;
  if (q && String(q).trim()) {
    const index = kb.buildIndex(pool);
    items = kb.search(index, String(q)).map((r) =>
      light(req.user, r.memory, projectIndex, {
        score: Math.round(r.score * 100) / 100,
        matched: r.matched,
        snippet: kb.bestSnippet(r.memory, String(q)),
      })
    );
  } else {
    const sorters = {
      recent: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
      important: (a, b) => b.importance - a.importance || new Date(b.updatedAt) - new Date(a.updatedAt),
      helpful: (a, b) => (b.helpful?.length || 0) - (a.helpful?.length || 0) || (b.views || 0) - (a.views || 0),
      relevant: (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        Number(Boolean(b.verified?.at)) - Number(Boolean(a.verified?.at)) ||
        b.importance - a.importance ||
        new Date(b.updatedAt) - new Date(a.updatedAt),
    };
    items = [...pool].sort(sorters[sort] || sorters.relevant).map((m) => light(req.user, m, projectIndex));
  }
  res.json({ items: items.slice(0, Math.min(Number(limit) || 300, 500)), facets });
});

/* ── Related knowledge for a task or free text ──────────────── */

router.get("/related", async (req, res) => {
  const { readable, projectIndex } = await readableMemories(req.user);
  const index = kb.buildIndex(readable);
  let text = String(req.query.text || "");
  let linkedIds = new Set();
  let projectKey = null;
  if (req.query.task) {
    const { task, project } = await loadTask(req.user, req.query.task);
    text = `${task.title} ${task.title} ${task.description} ${(task.labels || []).join(" ")}`;
    linkedIds = new Set(readable.filter((m) => (m.tasks || []).some((t) => sameId(t, task._id))).map((m) => String(m._id)));
    projectKey = project.key;
  }
  if (!text.trim()) return res.json({ linked: [], suggested: [] });

  const linked = readable.filter((m) => linkedIds.has(String(m._id))).map((m) => light(req.user, m, projectIndex));
  const suggested = kb
    .similar(index, text, { limit: 8, minScore: 0.05 })
    .filter((r) => !linkedIds.has(String(r.memory._id)))
    .map((r) => ({ ...r, score: r.score + (projectKey && r.memory.projectId?.key === projectKey ? 0.05 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((r) => light(req.user, r.memory, projectIndex, { score: Math.round(r.score * 100) / 100, reasons: r.reasons, snippet: kb.bestSnippet(r.memory, text) }));
  res.json({ linked, suggested });
});

/* ── Live analysis while writing (suggested fields + duplicates) ─ */

router.post("/analyze", async (req, res) => {
  const content = String(req.body?.content || "").trim();
  const title = String(req.body?.title || "").trim();
  if (content.length < 12 && title.length < 6) return res.json({ suggestion: null, duplicates: [], related: [] });
  const { readable, projectIndex } = await readableMemories(req.user);
  const index = kb.buildIndex(readable);
  const suggestion = kb.enrichLocal(content || title, { title, index, knownEntities: await knownEntities() });
  const target = { title, content, tags: suggestion.tags, entities: suggestion.entities };
  const duplicates = duplicatesOf(index, target, req.body?.excludeId);
  const dupIds = new Set(duplicates.map((d) => String(d._id)));
  const related = kb
    .similar(index, target, { limit: 6, minScore: 0.12, excludeId: req.body?.excludeId })
    .filter((r) => !dupIds.has(String(r.memory._id)))
    .slice(0, 4)
    .map((r) => light(req.user, r.memory, projectIndex, { score: Math.round(r.score * 100) / 100 }));
  res.json({ suggestion, duplicates, related });
});

/* ── Read one ──────────────────────────────────────────────── */

router.get("/:id", async (req, res) => {
  if (!isObjectId(req.params.id)) throw notFound("Memory");
  const { readable, projectIndex } = await readableMemories(req.user);
  const m = readable.find((x) => String(x._id) === req.params.id);
  if (!m) throw notFound("Memory");

  // Reading isn't editing: don't touch updatedAt
  await Memory.updateOne({ _id: m._id }, { $inc: { views: 1 } }, { timestamps: false });
  const full = await Memory.findById(m._id)
    .populate("createdBy", "firstName lastName avatarColor username title")
    .populate("updatedBy", "firstName lastName")
    .populate("verified.by", "firstName lastName avatarColor")
    .populate("projectId", "key name color")
    .populate({ path: "tasks", select: "number title status priority projectId assignee", populate: { path: "assignee", select: "firstName lastName avatarColor" } })
    .lean();

  const index = kb.buildIndex(readable);
  const readableIds = new Set(readable.map((x) => String(x._id)));
  const explicit = (full.links || []).map(String).filter((id) => readableIds.has(id));
  const byId = new Map(readable.map((x) => [String(x._id), x]));
  const backlinks = readable.filter((x) => (x.links || []).some((l) => sameId(l, m._id)));
  const related = kb
    .similar(index, m, { limit: 8, minScore: 0.1, excludeId: m._id })
    .filter((r) => !explicit.includes(String(r.memory._id)))
    .slice(0, 5);

  // Tasks only visible if the user can see their project
  const tasks = (full.tasks || [])
    .filter((t) => projectIndex.has(idOf(t.projectId)))
    .map((t) => {
      const p = projectIndex.get(idOf(t.projectId));
      return { ...t, ref: `${p.key}-${t.number}`, project: { key: p.key, color: p.color, name: p.name } };
    });

  const project = full.projectId ? projectIndex.get(idOf(full.projectId._id)) : null;
  res.json({
    ...full,
    project: full.projectId || null,
    tasks,
    links: explicit.map((id) => light(req.user, byId.get(id), projectIndex)),
    backlinks: backlinks.map((x) => light(req.user, x, projectIndex)),
    related: related.map((r) => light(req.user, r.memory, projectIndex, { score: Math.round(r.score * 100) / 100, reasons: r.reasons })),
    stale: isStale(full),
    helpfulCount: (full.helpful || []).length,
    isHelpful: (full.helpful || []).some((u) => sameId(u, req.user._id)),
    helpful: undefined,
    views: (full.views || 0) + 1,
    can: memoryCan(req.user, full, project),
  });
});

/* ── Create ────────────────────────────────────────────────── */

async function createMemory(user, body, source = { kind: "manual" }) {
  const content = String(body.content || "").trim();
  if (!content) throw badRequest("Write something to remember");
  const { project, visibility } = await resolveScope(user, body);
  const { readable } = await readableMemories(user);
  const index = kb.buildIndex(readable);
  const auto = await enrich(content, { title: body.title, index, preferAi: body.enrich !== false });

  const fields = {
    title: String(body.title || "").trim() || auto.title,
    summary: String(body.summary || "").trim() || auto.summary,
    type: body.type ? cleanType(body.type) : auto.type,
    tags: cleanTags(body.tags?.length ? body.tags : auto.tags),
    entities: cleanEntities(body.entities?.length ? body.entities : auto.entities),
    importance: body.importance ? clampImportance(body.importance) : auto.importance,
  };
  const duplicates = duplicatesOf(index, { ...fields, content });

  const links = (Array.isArray(body.links) ? body.links : []).filter(isObjectId).slice(0, 20);
  const taskIds = [];
  for (const ref of (Array.isArray(body.tasks) ? body.tasks : []).slice(0, 20)) {
    try {
      const { task } = await loadTask(user, ref);
      taskIds.push(task._id);
    } catch {
      /* skip tasks the user can't see */
    }
  }

  const memory = await Memory.create({
    ...fields,
    content,
    visibility,
    projectId: project?._id,
    pinned: Boolean(body.pinned) && hasGlobal(user, "kb.verify"),
    links,
    tasks: taskIds,
    enrichedBy: auto.enrichedBy,
    source,
    createdBy: user._id,
    updatedBy: user._id,
  });
  return { memory, duplicates };
}

router.post("/", async (req, res) => {
  const { memory, duplicates } = await createMemory(req.user, req.body || {}, {
    kind: req.body?.source?.kind === "answer" ? "answer" : "manual",
    label: req.body?.source?.label,
  });
  res.status(201).json({ memory, duplicates });
});

/** Save several reviewed candidates at once (distill → review → save). */
router.post("/bulk", async (req, res) => {
  const items = (Array.isArray(req.body?.items) ? req.body.items : []).slice(0, 12);
  if (!items.length) throw badRequest("Pick at least one memory to save");
  const source = req.body?.source || {};
  const created = [];
  for (const item of items) {
    const { memory } = await createMemory(
      req.user,
      { ...item, projectId: item.projectId || req.body.projectId, visibility: item.visibility || req.body.visibility, enrich: false },
      { kind: ["channel", "project"].includes(source.kind) ? source.kind : "manual", refId: source.refId, label: source.label }
    );
    created.push(memory);
  }
  res.status(201).json({ created: created.length, ids: created.map((m) => m._id) });
});

/** Turn a chat message into knowledge. */
router.post("/from-message", async (req, res) => {
  const message = isObjectId(req.body?.messageId) && (await Message.findById(req.body.messageId).populate("sender", "firstName lastName"));
  if (!message) throw notFound("Message");
  const channel = await Channel.findById(message.channelId);
  if (!channel || !(await canReadChannel(req.user, channel))) throw notFound("Message");
  if (message.memoryId && (await Memory.exists({ _id: message.memoryId }))) throw badRequest("This message is already in the knowledge base");
  const label = channel.kind === "dm" ? "Direct message" : `#${channel.name}`;
  const content = `${message.text}\n\n— ${message.sender.firstName} ${message.sender.lastName} in ${label}, ${message.createdAt.toISOString().slice(0, 10)}`;
  const { memory, duplicates } = await createMemory(
    req.user,
    {
      content,
      title: req.body.title,
      type: req.body.type,
      projectId: channel.projectId,
      visibility: channel.kind === "public" ? "workspace" : channel.projectId ? "project" : "private",
    },
    { kind: "message", refId: String(message._id), label }
  );
  message.memoryId = memory._id;
  await message.save();
  res.status(201).json({ memory, duplicates });
});

/** Turn a task comment into knowledge, linked back to the task. */
router.post("/from-comment", async (req, res) => {
  const { task, project } = await loadTask(req.user, req.body?.task);
  const comment = task.comments.id(req.body?.commentId);
  if (!comment) throw notFound("Comment");
  await task.populate("comments.author", "firstName lastName");
  const author = task.comments.id(req.body.commentId).author;
  const ref = `${project.key}-${task.number}`;
  const content = `${comment.text}\n\n— ${author.firstName} ${author.lastName} on ${ref} (${task.title})`;
  const { memory, duplicates } = await createMemory(
    req.user,
    { content, title: req.body.title, projectId: project._id, visibility: "project", tasks: [String(task._id)] },
    { kind: "comment", refId: ref, label: ref }
  );
  res.status(201).json({ memory, duplicates });
});

/* ── Update ────────────────────────────────────────────────── */

async function loadEditable(user, id) {
  if (!isObjectId(id)) throw notFound("Memory");
  const memory = await Memory.findById(id);
  if (!memory) throw notFound("Memory");
  const projectIndex = await projectIndexFor(user);
  if (!canReadMemory(user, memory, projectIndex)) throw notFound("Memory");
  const project = memory.projectId ? await Project.findById(memory.projectId) : null;
  return { memory, project, projectIndex };
}

router.patch("/:id", async (req, res) => {
  const { memory, project } = await loadEditable(req.user, req.params.id);
  if (!canEditMemory(req.user, memory, project)) throw forbidden("You can't edit this knowledge");
  const body = req.body || {};
  let contentChanged = false;
  if (typeof body.title === "string" && body.title.trim()) memory.title = body.title.trim();
  if (typeof body.content === "string" && body.content.trim() && body.content.trim() !== memory.content) {
    memory.content = body.content.trim();
    contentChanged = true;
  }
  if (typeof body.summary === "string") memory.summary = body.summary.trim();
  if (body.type) memory.type = cleanType(body.type);
  if (Array.isArray(body.tags)) memory.tags = cleanTags(body.tags);
  if (body.importance) memory.importance = clampImportance(body.importance);
  if (body.reviewEveryDays) memory.reviewEveryDays = Math.min(730, Math.max(7, Number(body.reviewEveryDays) || 90));
  if (body.projectId !== undefined || body.visibility) {
    const scope = await resolveScope(req.user, {
      projectId: body.projectId !== undefined ? body.projectId : memory.projectId,
      visibility: body.visibility || memory.visibility,
    });
    memory.projectId = scope.project?._id;
    memory.visibility = scope.visibility;
  }
  if (Array.isArray(body.links)) memory.links = body.links.filter((l) => isObjectId(l) && l !== String(memory._id)).slice(0, 20);
  // Substantive edits to verified knowledge need re-verification by someone else
  if (contentChanged && memory.verified?.at && !canVerifyMemory(req.user, memory, project)) {
    memory.verified = undefined;
  }
  if (!body.summary && contentChanged) memory.summary = kb.firstSentence(memory.content, 220);
  memory.updatedBy = req.user._id;
  await memory.save();
  res.json({ ok: true, id: memory._id, unverified: contentChanged && !memory.verified?.at });
});

router.delete("/:id", async (req, res) => {
  const { memory, project } = await loadEditable(req.user, req.params.id);
  if (!memoryCan(req.user, memory, project).delete) throw forbidden("Only the author or a curator can delete this");
  await Promise.all([
    memory.deleteOne(),
    Memory.updateMany({ links: memory._id }, { $pull: { links: memory._id } }),
    Message.updateMany({ memoryId: memory._id }, { $unset: { memoryId: 1 } }),
  ]);
  res.json({ id: memory._id });
});

router.post("/:id/pin", async (req, res) => {
  const { memory, project } = await loadEditable(req.user, req.params.id);
  if (!canVerifyMemory(req.user, memory, project) && !canEditMemory(req.user, memory, project)) {
    throw forbidden("Only curators can pin knowledge");
  }
  memory.pinned = !memory.pinned;
  await memory.save();
  res.json({ pinned: memory.pinned });
});

router.post("/:id/verify", async (req, res) => {
  const { memory, project } = await loadEditable(req.user, req.params.id);
  if (!canVerifyMemory(req.user, memory, project)) throw forbidden("Only managers can verify knowledge");
  const unverify = req.body?.verified === false;
  memory.verified = unverify ? undefined : { by: req.user._id, at: new Date() };
  await memory.save();
  if (!unverify) {
    await notify([memory.createdBy], {
      actor: req.user._id,
      type: "kb_verified",
      title: `${req.user.firstName} verified “${memory.title}”`,
      link: { kind: "memory", id: String(memory._id) },
    });
  }
  await memory.populate("verified.by", "firstName lastName avatarColor");
  res.json({ verified: memory.verified?.at ? memory.verified : null, stale: false });
});

router.post("/:id/helpful", async (req, res) => {
  const { memory } = await loadEditable(req.user, req.params.id);
  const has = memory.helpful.some((u) => sameId(u, req.user._id));
  memory.helpful = has ? memory.helpful.filter((u) => !sameId(u, req.user._id)) : [...memory.helpful, req.user._id];
  await memory.save({ timestamps: false });
  res.json({ isHelpful: !has, helpfulCount: memory.helpful.length });
});

/** Link / unlink a task. Anyone who can read the memory and edit (or comment on) the task may connect them. */
router.post("/:id/tasks", async (req, res) => {
  const { memory } = await loadEditable(req.user, req.params.id);
  if (req.user.role === "guest") throw forbidden("Guests can't link knowledge");
  const { task } = await loadTask(req.user, req.body?.task);
  const has = memory.tasks.some((t) => sameId(t, task._id));
  memory.tasks = has ? memory.tasks.filter((t) => !sameId(t, task._id)) : [...memory.tasks, task._id];
  await memory.save();
  res.json({ linked: !has });
});

/* ── Ask ───────────────────────────────────────────────────── */

const ASK_SYSTEM = `You are Catalyst's team knowledge base. Answer the question using ONLY the numbered memories provided.
Cite every claim with the memory number in square brackets, e.g. [2] or [1][4].
If the memories do not contain the answer, say so plainly in one sentence.
Be concise: at most 5 short sentences or a brief bullet list. Plain text, no markdown headings.`;

router.post("/ask", async (req, res) => {
  const question = String(req.body?.question || "").trim();
  if (!question) throw badRequest("Ask a question");
  const { readable, projectIndex } = await readableMemories(req.user);
  let pool = readable;
  if (req.body?.project) pool = pool.filter((m) => m.projectId?.key === String(req.body.project).toUpperCase());
  if (!pool.length) {
    return res.json({ answer: "", citations: [], sources: [], confidence: 0, mode: "local", empty: true });
  }
  const index = kb.buildIndex(pool);
  const ranked = kb.search(index, question, { limit: 8 });
  const sources = ranked
    .slice(0, 6)
    .map((r) => light(req.user, r.memory, projectIndex, { score: Math.round(r.score * 100) / 100, snippet: kb.bestSnippet(r.memory, question) }));

  if (!ranked.length) {
    return res.json({ answer: "", citations: [], sources: [], confidence: 0, mode: "local" });
  }

  if (isConfigured()) {
    try {
      const context = ranked
        .map((r, i) => `[${i + 1}] (${r.memory.type}${r.memory.verified?.at ? ", verified" : ""}) ${r.memory.title}: ${r.memory.content}`)
        .join("\n\n");
      const raw = await groqChat({
        messages: [
          { role: "system", content: ASK_SYSTEM },
          { role: "user", content: `Memories:\n${context.slice(0, 14000)}\n\nQuestion: ${question}` },
        ],
        temperature: 0.2,
        maxTokens: 600,
      });
      // Some models cite as 【1】 or [1, 2]; normalise to [1][2] so the UI can link sources
      const answer = raw
        .replace(/【\s*(\d+)[^】]*】/g, "[$1]")
        .replace(/\[(\d+(?:\s*,\s*\d+)+)\]/g, (_m, list) => list.split(/\s*,\s*/).map((n) => `[${n}]`).join(""))
        .replace(/^\s*[*-]\s+/gm, "• ")
        .trim();
      const citations = [];
      for (const match of answer.matchAll(/\[(\d+)\]/g)) {
        const n = Number(match[1]);
        const m = ranked[n - 1]?.memory;
        if (m && !citations.some((c) => c.ref === n)) citations.push({ ref: n, id: m._id, title: m.title, type: m.type });
      }
      return res.json({ answer, citations, sources, confidence: citations.length ? 0.85 : 0.3, mode: "ai", model: getModel() });
    } catch (err) {
      console.warn("Groq ask failed, falling back to local:", err.message);
    }
  }

  const local = kb.answerLocal(question, ranked, index);
  res.json({ ...local, sources, mode: "local" });
});

/* ── Distill (preview candidates, then save via /bulk) ─────── */

async function loadSource(user, kind, refId) {
  if (kind === "channel") {
    const channel = isObjectId(refId) && (await Channel.findById(refId));
    if (!channel || !(await canReadChannel(user, channel))) throw notFound("Channel");
    const messages = await Message.find({ channelId: refId }).sort({ createdAt: -1 }).limit(200).populate("sender", "firstName lastName");
    if (!messages.length) throw badRequest("That channel has no messages yet");
    const lines = messages.reverse().map((m) => ({ author: `${m.sender?.firstName || "Someone"} ${m.sender?.lastName || ""}`.trim(), text: m.text, at: m.createdAt }));
    return {
      lines,
      text: lines.map((l) => `[${l.at.toISOString().slice(0, 10)}] ${l.author}: ${l.text}`).join("\n"),
      label: channel.kind === "dm" ? "Direct message" : `#${channel.name}`,
      projectId: channel.projectId,
      visibility: channel.kind === "public" ? "workspace" : channel.projectId ? "project" : "private",
    };
  }
  if (kind === "project") {
    const project = isObjectId(refId) && (await Project.findById(refId));
    if (!project || !projectRole(user, project)) throw notFound("Project");
    const tasks = await Task.find({ projectId: refId }).limit(150).populate("assignee", "firstName lastName").populate("comments.author", "firstName lastName");
    if (!tasks.length) throw badRequest("That project has no tasks yet");
    // Comments carry most of the decisions made while working
    const lines = tasks.flatMap((t) =>
      (t.comments || []).map((c) => ({
        author: `${c.author?.firstName || "Someone"} ${c.author?.lastName || ""}`.trim(),
        text: `${c.text} (on ${project.key}-${t.number} ${t.title})`,
        at: c.createdAt,
      }))
    );
    const text =
      `Project: ${project.name}\n${project.description}\n\nTasks:\n` +
      tasks.map((t) => `- ${project.key}-${t.number} [${t.status}] ${t.title}${t.description ? `: ${t.description}` : ""}`).join("\n") +
      `\n\nDiscussion:\n` +
      lines.map((l) => `${l.author}: ${l.text}`).join("\n");
    return { lines, text, label: project.name, projectId: project._id, visibility: "project" };
  }
  throw badRequest("Pick a channel or project");
}

router.post("/distill", async (req, res) => {
  const { kind, refId } = req.body || {};
  if (!hasGlobal(req.user, "kb.distill")) throw forbidden("Your role can't distill knowledge");
  const source = await loadSource(req.user, kind, refId);
  const { readable } = await readableMemories(req.user);
  const index = kb.buildIndex(readable);

  let candidates = null;
  let mode = "local";
  if (isConfigured()) {
    try {
      const result = await groqJson({
        messages: [
          {
            role: "system",
            content: `Extract the durable knowledge worth remembering from this team material: decisions made, important facts,
processes, constraints and lessons. Skip greetings and chit-chat. Respond with JSON only:
{"memories":[{"title":"max 8 words","content":"2-4 self-contained sentences naming people/systems explicitly","summary":"one sentence",
"type":one of ${JSON.stringify(MEMORY_TYPES)},"tags":["2-5 lowercase hyphenated"],"entities":["..."],"importance":1-5}]}
Return 0-8 memories. Never invent information.`,
          },
          { role: "user", content: `Source (${kind}: ${source.label}):\n"""\n${source.text.slice(0, 14000)}\n"""` },
        ],
        temperature: 0.2,
        maxTokens: 2200,
      });
      candidates = (Array.isArray(result.memories) ? result.memories : [])
        .filter((m) => m?.title && m?.content)
        .slice(0, 8)
        .map((m) => ({
          title: String(m.title).slice(0, 160),
          content: String(m.content).slice(0, 8000),
          summary: String(m.summary || "").slice(0, 400),
          type: cleanType(m.type),
          tags: cleanTags(m.tags),
          entities: cleanEntities(m.entities),
          importance: clampImportance(m.importance),
        }));
      mode = "ai";
    } catch (err) {
      console.warn("Groq distill failed, using local:", err.message);
    }
  }
  if (!candidates) {
    candidates = kb.distillLocal(source.lines, { label: source.label, index, knownEntities: await knownEntities() });
  }

  res.json({
    mode,
    source: { kind, refId, label: source.label, projectId: source.projectId || null, visibility: source.visibility },
    candidates: candidates.map((c) => ({ ...c, duplicates: duplicatesOf(index, c) })),
  });
});

module.exports = router;
