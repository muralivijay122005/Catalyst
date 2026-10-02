// src/BACKEND/seed/seedData.cjs
// Seeds a realistic Catalyst workspace. All dates are relative to "now" so the data always looks current.
// Run: npm run seed   (back up first with: npm run db:backup)
const mongoose = require("mongoose");
const path = require("path");
const dns = require("dns");
require("dotenv").config({ path: path.join(__dirname, "../.env"), quiet: true });
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const { User, Project, Task, Channel, Message, Memory, Notification } = require("../models/index.cjs");
const { firstSentence } = require("../utils/knowledge.cjs");

const DAY = 86400000;
const NOW = Date.now();
const at = (days, hour = 17) => {
  const d = new Date(NOW + days * DAY);
  d.setHours(hour, 0, 0, 0);
  return d;
};
const ago = (days, hour = 10) => at(-days, hour);

/* ── People ──────────────────────────────────────────────────── */

const PEOPLE = [
  ["Murali", "Vijay", "admin", "Head of Engineering", "Leadership", "Austin, TX", "#0f172a", "Runs engineering at Catalyst. Owner of the platform roadmap and the workspace."],
  ["Sarah", "Mitchell", "manager", "Engineering Manager", "Engineering", "New York, NY", "#2563eb", "Leads the payments team. Ask me about reviews, hiring and release trains."],
  ["James", "Carter", "manager", "Senior Product Manager", "Product", "San Francisco, CA", "#0891b2", "Mobile and web product. I live in Figma comments and customer calls."],
  ["Emily", "Brooks", "member", "Senior Frontend Engineer", "Engineering", "Seattle, WA", "#7c3aed", "React, design systems and accessibility."],
  ["Michael", "Turner", "member", "Backend Engineer", "Engineering", "Chicago, IL", "#1d4ed8", "APIs, queues and anything with a webhook."],
  ["Olivia", "Bennett", "member", "Lead Product Designer", "Design", "London, UK", "#db2777", "Design systems, research and prototypes."],
  ["Daniel", "Hayes", "member", "DevOps Engineer", "Platform", "Denver, CO", "#16a34a", "Kubernetes, CI/CD and keeping the pager quiet."],
  ["Grace", "Sullivan", "member", "QA Engineer", "Quality", "Boston, MA", "#ea580c", "Test strategy, automation and release sign-off."],
  ["Hannah", "Price", "member", "Data Analyst", "Analytics", "Austin, TX", "#0d9488", "Dashboards, funnels and experiment readouts."],
  ["Ryan", "Cooper", "guest", "Client Stakeholder, Northwind", "External", "Toronto, ON", "#64748b", "Product owner at Northwind Traders."],
];

(async () => {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/catalyst";
  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);

  // Drop everything from the old schema too (modules, task groups, docs, ...)
  const existing = await mongoose.connection.db.listCollections().toArray();
  for (const { name } of existing) await mongoose.connection.db.collection(name).drop().catch(() => {});
  await Promise.all([User, Project, Task, Channel, Message, Memory, Notification].map((M) => M.syncIndexes()));
  console.log("Cleared old data");

  const users = [];
  for (const [firstName, lastName, role, title, department, location, avatarColor, bio] of PEOPLE) {
    users.push(
      await User.create({
        firstName,
        lastName,
        username: `${firstName}.${lastName}`.toLowerCase(),
        email: `${firstName}.${lastName}@catalyst.dev`.toLowerCase(),
        password: `${firstName.toLowerCase()}123`,
        role,
        title,
        department,
        location,
        avatarColor,
        bio,
        lastSeenAt: ago(Math.random() * 2, 9 + Math.floor(Math.random() * 8)),
      })
    );
  }
  const [murali, sarah, james, emily, michael, olivia, daniel, grace, hannah, ryan] = users;
  console.log(`Users: ${users.length}`);

  /* ── Projects ─────────────────────────────────────────────── */

  const label = (name, color) => ({ name, color });
  const projectDefs = [
    {
      name: "Payments Platform",
      key: "PAY",
      color: "#2563eb",
      description:
        "Move billing from the legacy Charges API to Stripe Payment Intents, add SCA support and ship Invoicing v2 for enterprise customers.",
      owner: sarah,
      members: [[sarah, "owner"], [murali, "manager"], [michael, "member"], [emily, "member"], [grace, "member"], [daniel, "member"], [hannah, "member"], [ryan, "viewer"]],
      milestones: [["Stripe migration", 9, false], ["Invoicing v2", 34, false], ["Discovery", -20, true]],
      labels: [label("Bug", "#dc2626"), label("Feature", "#2563eb"), label("Security", "#7c3aed"), label("Tech debt", "#64748b")],
      requireApproval: true,
      start: -45,
      target: 40,
    },
    {
      name: "Mobile App 2.0",
      key: "MOB",
      color: "#0891b2",
      description: "Rebuild onboarding, add offline mode and ship the new navigation for iOS and Android.",
      owner: james,
      members: [[james, "owner"], [olivia, "manager"], [emily, "member"], [grace, "member"], [hannah, "member"]],
      milestones: [["Beta", 14, false], ["Public launch", 45, false]],
      labels: [label("Bug", "#dc2626"), label("iOS", "#0f172a"), label("Android", "#16a34a"), label("Design", "#db2777")],
      requireApproval: true,
      start: -30,
      target: 45,
    },
    {
      name: "Website Redesign",
      key: "WEB",
      color: "#0f172a",
      description: "New marketing site on the design system: faster pages, clearer pricing and a self-serve demo.",
      owner: james,
      members: [[james, "owner"], [olivia, "manager"], [emily, "member"], [hannah, "member"], [ryan, "viewer"]],
      milestones: [["Content freeze", 6, false], ["Launch", 21, false]],
      labels: [label("Content", "#0891b2"), label("Design", "#db2777"), label("SEO", "#16a34a"), label("Bug", "#dc2626")],
      requireApproval: false,
      start: -25,
      target: 21,
    },
    {
      name: "Platform & Infrastructure",
      key: "OPS",
      color: "#16a34a",
      description: "Kubernetes upgrade, observability, cost reduction and on-call health.",
      owner: murali,
      members: [[murali, "owner"], [daniel, "manager"], [michael, "member"], [sarah, "member"], [grace, "member"]],
      milestones: [["K8s 1.31 upgrade", 12, false], ["Cost review Q4", 50, false]],
      labels: [label("Infra", "#16a34a"), label("Observability", "#2563eb"), label("Incident", "#dc2626"), label("Cost", "#ea580c")],
      requireApproval: false,
      start: -60,
      target: 60,
    },
  ];

  const projects = {};
  for (const def of projectDefs) {
    projects[def.key] = await Project.create({
      name: def.name,
      key: def.key,
      color: def.color,
      description: def.description,
      owner: def.owner._id,
      members: def.members.map(([u, role]) => ({ user: u._id, role, addedAt: ago(def.start * -1) })),
      milestones: def.milestones.map(([name, due, done]) => ({ name, dueDate: at(due), done })),
      labels: def.labels,
      requireApproval: def.requireApproval,
      startDate: at(def.start),
      targetDate: at(def.target),
      status: "active",
    });
  }
  console.log(`Projects: ${Object.keys(projects).length}`);

  /* ── Tasks ────────────────────────────────────────────────── */
  // [title, status, priority, assignee, creator, labels, milestone, startOffset, dueOffset, estimate, description, checklist, comments, extra]

  const TASKS = {
    PAY: [
      ["Migrate checkout to Payment Intents API", "in_progress", "urgent", michael, sarah, ["Feature"], "Stripe migration", -12, 3, 8,
        "Replace `charges.create` with Payment Intents in the checkout service. Keep the old path behind the `legacy_charges` flag until the migration milestone closes.\n\n- Create intent on cart confirmation\n- Confirm on the client with Stripe.js\n- Handle `requires_action` for 3DS",
        [["Create intent on cart confirm", true], ["Client-side confirmation", true], ["3DS / requires_action flow", false], ["Remove legacy flag", false]],
        [[sarah, "We decided to keep idempotency keys on every intent creation — use the cart id + attempt number. That prevents double charges on retries.", 6], [michael, "3DS flow works in test mode. Turns out the `return_url` must be absolute or Stripe rejects it.", 2]]],
      ["Webhook handler retries and dead-letter queue", "in_review", "high", michael, sarah, ["Feature"], "Stripe migration", -9, 1, 5,
        "Process Stripe webhooks asynchronously. Failed events go to a dead-letter queue after 5 attempts with exponential backoff.",
        [["Verify signatures", true], ["Queue + worker", true], ["DLQ after 5 attempts", true]],
        [[michael, "Root cause of the duplicate emails last sprint was synchronous webhook processing — Stripe retried while we were still sending. Moving to the queue fixes it.", 3]],
        { approval: { state: "pending", requestedBy: michael, requestedAt: ago(1) } }],
      ["SCA compliance audit for EU cards", "todo", "high", grace, sarah, ["Security"], "Stripe migration", 0, 7, 3,
        "Run the EU test card matrix against the new checkout and document which flows trigger strong customer authentication.", [["Test card matrix", false], ["Document exemptions", false]], []],
      ["Refund endpoint returns 500 for partial refunds", "in_progress", "urgent", michael, grace, ["Bug"], "Stripe migration", -2, -1, 2,
        "Partial refunds on multi-item orders fail with a 500. Stack trace points at the amount rounding in `refundService.calculate`.",
        [], [[grace, "Repro: order with 3 items, refund 1 item with a coupon applied. Amount ends up as 1999.9999.", 2], [michael, "Fix is to keep money in integer cents end to end. Never use floats for currency.", 1]]],
      ["Invoice PDF template v2", "todo", "medium", emily, sarah, ["Feature"], "Invoicing v2", 5, 18, 5,
        "New invoice layout with line-item tax breakdown and the customer's PO number.", [], []],
      ["Tax calculation via Stripe Tax", "backlog", "medium", null, sarah, ["Feature"], "Invoicing v2", null, 28, 8,
        "Evaluate Stripe Tax versus our in-house tables for US sales tax and EU VAT.", [], []],
      ["Billing settings page redesign", "todo", "low", emily, james, ["Feature"], "Invoicing v2", 3, 20, 3, "Implement the new billing settings layout from the design file.", [], []],
      ["Rotate Stripe restricted keys", "done", "high", daniel, sarah, ["Security"], "Stripe migration", -15, -8, 1,
        "Rotate all restricted API keys and move them into the secrets manager.", [["Generate new keys", true], ["Update secrets", true], ["Revoke old keys", true]],
        [[daniel, "Done. From now on keys rotate every 90 days via the scheduled job in OPS.", 8]], { completed: -8 }],
      ["Payment failure analytics dashboard", "in_review", "medium", hannah, sarah, ["Feature"], null, -6, 2, 3,
        "Decline reasons by card brand and country, refreshed hourly.", [], [], { approval: { state: "pending", requestedBy: hannah, requestedAt: ago(0.5) } }],
      ["Remove legacy Charges code paths", "backlog", "low", null, michael, ["Tech debt"], "Stripe migration", null, 30, 3, "Delete the old charges client once 100% of traffic is on Payment Intents.", [], []],
      ["Load test checkout at 3x peak", "todo", "high", grace, sarah, [], "Stripe migration", 2, 6, 3,
        "k6 scenario at 3x Black Friday peak against staging.", [["Write k6 scenario", false], ["Run against staging", false], ["Share report", false]], []],
      ["Discovery: enterprise invoicing interviews", "done", "medium", james, james, [], "Discovery", -40, -22, 5,
        "Interview 8 enterprise customers about invoicing pain points.", [], [[james, "Key insight: finance teams need PO numbers on every invoice, or the invoice gets rejected by their AP system.", 22]], { completed: -22 }],
      ["Security review for Payment Intents rollout", "todo", "urgent", murali, sarah, ["Security"], "Stripe migration", -3, -1, 2,
        "Review the threat model and key handling before we move the last 20% of traffic.", [["Threat model", false], ["Key handling", false]], []],
    ],
    MOB: [
      ["New onboarding flow (3 screens)", "in_progress", "high", emily, james, ["Design"], "Beta", -8, 5, 5,
        "Replace the 7-step onboarding with 3 screens: value prop, permissions, personalisation.",
        [["Screen 1 — value prop", true], ["Screen 2 — permissions", true], ["Screen 3 — personalise", false]],
        [[olivia, "We agreed to ask for notification permission only after the user completes their first task, not during onboarding. Opt-in rates are much higher that way.", 5]]],
      ["Offline mode for task list", "todo", "urgent", emily, james, ["iOS", "Android"], "Beta", 1, 12, 8,
        "Cache the last 200 tasks and queue edits made offline. Conflict resolution: last write wins per field.", [], []],
      ["Crash on Android 14 when opening camera", "in_progress", "urgent", emily, grace, ["Bug", "Android"], "Beta", -3, -2, 2,
        "Crash in `CameraX` initialisation on Pixel devices running Android 14.", [], [[grace, "Only happens when the app was backgrounded during permission prompt.", 3]]],
      ["Bottom navigation redesign", "in_review", "medium", olivia, james, ["Design"], "Beta", -10, 2, 3,
        "Five tabs to four. Search moves into the top bar.", [], [], { approval: { state: "pending", requestedBy: olivia, requestedAt: ago(1, 15) } }],
      ["Push notification preferences", "todo", "medium", null, james, ["iOS", "Android"], "Public launch", null, 25, 3, "Per-category notification toggles in settings.", [], []],
      ["App Store screenshots and copy", "backlog", "low", olivia, james, ["Design"], "Public launch", null, 38, 2, "", [], []],
      ["Beta test plan", "done", "high", grace, james, [], "Beta", -14, -6, 2,
        "TestFlight and Play internal track groups, test matrix and feedback form.", [], [], { completed: -6 }],
      ["Instrument onboarding funnel", "in_progress", "medium", hannah, james, [], "Beta", -4, 4, 2,
        "Events for each onboarding step, permission accept/decline and first task created.", [], [[hannah, "Naming convention for events is object_action in snake_case, e.g. onboarding_step_viewed.", 2]]],
      ["Dark mode color tokens", "todo", "low", olivia, olivia, ["Design"], "Public launch", 10, 30, 2, "", [], []],
      ["Biometric login", "backlog", "medium", null, james, ["iOS", "Android"], "Public launch", null, 40, 5, "Face ID / fingerprint login with secure enclave storage.", [], []],
    ],
    WEB: [
      ["Pricing page copy and layout", "in_progress", "high", olivia, james, ["Content", "Design"], "Content freeze", -6, 4, 3,
        "Three plans, annual toggle, FAQ. Copy reviewed by marketing.", [], [[james, "Decision: we show annual pricing by default with monthly as a toggle. Northwind feedback was that monthly-first looked expensive.", 4]]],
      ["Migrate blog to MDX", "done", "medium", emily, james, ["Content"], null, -20, -10, 3, "", [], [], { completed: -10 }],
      ["Lighthouse score above 95 on mobile", "todo", "high", emily, james, ["SEO"], "Launch", 2, 14, 5,
        "Image optimisation, font subsetting and removing unused JS.", [["Optimise hero images", false], ["Subset fonts", false], ["Code-split demo widget", false]], []],
      ["Self-serve demo signup", "in_progress", "medium", emily, james, [], "Launch", -2, 12, 5, "Create a sandbox workspace on signup with sample data.", [], []],
      ["Customer logos and case studies", "todo", "low", olivia, james, ["Content"], "Content freeze", 1, 5, 2, "", [], []],
      ["Broken links on legacy docs", "todo", "medium", hannah, olivia, ["Bug", "SEO"], "Launch", 0, 9, 1, "Crawl report lists 43 broken links.", [], []],
      ["Analytics consent banner", "backlog", "medium", null, james, [], "Launch", null, 18, 2, "GDPR-compliant consent with granular categories.", [], []],
      ["Homepage hero animation", "in_review", "low", olivia, olivia, ["Design"], "Launch", -5, 3, 2, "", [], []],
    ],
    OPS: [
      ["Upgrade production cluster to Kubernetes 1.31", "in_progress", "high", daniel, murali, ["Infra"], "K8s 1.31 upgrade", -7, 10, 8,
        "Staging first, then production node pools one at a time during the Tuesday maintenance window.",
        [["Upgrade staging", true], ["Run conformance tests", true], ["Prod pool A", false], ["Prod pool B", false]],
        [[daniel, "We decided to do production upgrades only on Tuesdays 6-8am ET. Lowest traffic and the whole team is online.", 5]]],
      ["Set up SLO dashboards for checkout", "todo", "high", daniel, murali, ["Observability"], null, 2, 11, 3,
        "99.9% availability and p95 latency under 400ms for checkout API.", [], []],
      ["Postmortem: API outage on the 14th", "done", "urgent", michael, murali, ["Incident"], null, -18, -16, 2,
        "Connection pool exhaustion after a deploy doubled the worker count.", [],
        [[murali, "Lesson learned: every deploy that changes worker counts must also adjust the DB pool size. Added to the release checklist.", 16]], { completed: -16 }],
      ["Reduce staging cloud spend by 30%", "todo", "medium", daniel, murali, ["Cost"], "Cost review Q4", 5, 40, 5,
        "Scale staging to zero overnight and on weekends.", [], []],
      ["Pager rotation for Q4", "done", "medium", sarah, murali, [], null, -12, -9, 1, "", [], [], { completed: -9 }],
      ["Alert on webhook queue depth", "in_progress", "medium", michael, daniel, ["Observability"], null, -2, 5, 2,
        "Page when the Stripe webhook queue has more than 500 messages for 10 minutes.", [], []],
      ["Centralised logging retention policy", "backlog", "low", null, daniel, ["Cost", "Observability"], null, null, 45, 2, "", [], []],
      ["Database backup restore drill", "todo", "high", daniel, murali, ["Infra"], "K8s 1.31 upgrade", 3, 8, 2,
        "Restore last night's snapshot into an isolated environment and verify row counts.", [], []],
      ["Review Kubernetes upgrade runbook", "todo", "high", murali, daniel, ["Infra"], "K8s 1.31 upgrade", 0, 0, 1,
        "Sign off on the production upgrade runbook before the Tuesday maintenance window.",
        [["Read runbook", true], ["Confirm rollback plan", false], ["Sign off in #ops", false]],
        [[daniel, "@murali.vijay the runbook is ready for your review. Rollback plan is in section 4.", 1]]],
      ["Define SLOs for core APIs", "in_progress", "high", murali, murali, ["Observability"], null, -4, 4, 3,
        "Availability and latency objectives for auth, tasks and checkout APIs, with error budgets.", [["Auth API", true], ["Tasks API", false], ["Checkout API", false]], []],
      ["Approve Q4 infrastructure budget", "in_progress", "medium", murali, murali, ["Cost"], "Cost review Q4", -3, 2, 2,
        "Review the Q4 cloud budget with finance. Target: 20% reduction versus Q3.", [], []],
      ["Final interviews for senior SRE", "done", "medium", murali, murali, [], null, -9, -2, 3, "", [], [], { completed: -2 }],
    ],
  };

  const taskByRef = {};
  for (const [key, list] of Object.entries(TASKS)) {
    const project = projects[key];
    let number = 0;
    for (const row of list) {
      const [title, status, priority, assignee, creator, labels, milestoneName, startOff, dueOff, estimate, description, checklist, comments, extra = {}] = row;
      number++;
      const createdAt = ago(Math.max(3, -(startOff ?? -10) + 3 + (number % 4)));
      const milestone = milestoneName ? project.milestones.find((m) => m.name === milestoneName)?._id : undefined;
      const activity = [{ actor: creator._id, action: "created", at: createdAt }];
      if (assignee) activity.push({ actor: creator._id, action: "updated", field: "assignee", to: String(assignee._id), at: new Date(createdAt.getTime() + 3600000) });
      const statusPath = { backlog: [], todo: [], in_progress: ["in_progress"], in_review: ["in_progress", "in_review"], done: ["in_progress", "done"], canceled: ["canceled"] }[status];
      let prev = "todo";
      statusPath.forEach((s, i) => {
        activity.push({ actor: (assignee || creator)._id, action: "updated", field: "status", from: prev, to: s, at: new Date(createdAt.getTime() + (i + 1) * DAY) });
        prev = s;
      });
      const taskComments = (comments || []).map(([author, text, daysAgo]) => ({ author: author._id, text, createdAt: ago(daysAgo, 11 + (text.length % 6)) }));
      taskComments.forEach((c) => activity.push({ actor: c.author, action: "commented", at: c.createdAt }));

      const doc = await Task.create({
        number,
        projectId: project._id,
        title,
        description,
        status,
        priority,
        assignee: assignee?._id,
        createdBy: creator._id,
        labels,
        milestone,
        startDate: startOff == null ? undefined : at(startOff, 9),
        dueDate: dueOff == null ? undefined : at(dueOff),
        estimate,
        checklist: (checklist || []).map(([text, done]) => ({ text, done })),
        comments: taskComments,
        activity: activity.sort((a, b) => a.at - b.at),
        approval: extra.approval
          ? { ...extra.approval, requestedBy: extra.approval.requestedBy._id }
          : status === "done" && project.requireApproval
            ? { state: "approved", requestedBy: assignee?._id, requestedAt: ago(-(extra.completed || -2) + 1), reviewedBy: project.owner, reviewedAt: at(extra.completed || -2) }
            : { state: "none" },
        order: number * 1000,
        completedAt: status === "done" ? at(extra.completed ?? -3, 15) : undefined,
      });
      await Task.collection.updateOne({ _id: doc._id }, { $set: { createdAt, updatedAt: activity[activity.length - 1].at } });
      taskByRef[`${key}-${number}`] = doc;
    }
    await Project.updateOne({ _id: project._id }, { taskSeq: number });
  }
  console.log(`Tasks: ${Object.keys(taskByRef).length}`);

  /* ── Channels & messages ──────────────────────────────────── */

  const staff = users.filter((u) => u.role !== "guest");
  const projMembers = (key) => [projects[key].owner, ...projects[key].members.map((m) => m.user)].map(String).filter((v, i, a) => a.indexOf(v) === i);
  const channelDefs = [
    { name: "general", topic: "Company-wide chatter and wins", kind: "public", members: staff.map((u) => u._id) },
    { name: "announcements", topic: "Official updates from leadership", kind: "public", locked: true, members: staff.map((u) => u._id) },
    { name: "engineering", topic: "Architecture, reviews and releases", kind: "public", members: [murali, sarah, emily, michael, daniel, grace].map((u) => u._id) },
    { name: "design", topic: "Critique, systems and research", kind: "public", members: [olivia, james, emily].map((u) => u._id) },
    { name: "pay", topic: "Discussion for Payments Platform", kind: "private", projectId: projects.PAY._id, members: projMembers("PAY") },
    { name: "mob", topic: "Discussion for Mobile App 2.0", kind: "private", projectId: projects.MOB._id, members: projMembers("MOB") },
    { name: "web", topic: "Discussion for Website Redesign", kind: "private", projectId: projects.WEB._id, members: projMembers("WEB") },
    { name: "ops", topic: "Discussion for Platform & Infrastructure", kind: "private", projectId: projects.OPS._id, members: projMembers("OPS") },
    { name: "murali.vijay-sarah.mitchell", kind: "dm", members: [murali._id, sarah._id] },
  ];
  const channels = {};
  for (const def of channelDefs) channels[def.name] = await Channel.create({ ...def, createdBy: murali._id });

  const MESSAGES = {
    general: [
      [murali, "Welcome to Catalyst, everyone. This workspace is where projects, discussions and our knowledge base live together.", 12],
      [sarah, "Payments team hit 80% of checkout traffic on Payment Intents this week 🎉", 3],
      [james, "Reminder: customer advisory board is next Thursday. Northwind and two other enterprise accounts are joining.", 2],
      [olivia, "New design system tokens are live in Figma. Dark mode tokens are next.", 1],
    ],
    announcements: [
      [murali, "From now on, every production deploy needs a linked task and a green CI run. No exceptions, including hotfixes.", 20],
      [murali, "Q4 priorities: 1) finish the Stripe migration, 2) Mobile 2.0 beta, 3) cut infrastructure cost by 20%.", 9],
      [sarah, "Release freeze for the payments service from Nov 24 to Dec 2 for peak season.", 4],
    ],
    engineering: [
      [michael, "Heads up: the staging database was reset last night. Re-run seeds if your branch depends on fixtures.", 7],
      [sarah, "We decided to standardise on Postgres for all new services. Mongo stays for the existing workspace data only.", 6],
      [daniel, "Turns out the flaky CI failures were caused by a shared Redis between parallel jobs. Each job now gets its own Redis container.", 5],
      [emily, "PR reviews: please keep PRs under 400 lines. Anything bigger gets split before review.", 4],
      [grace, "Make sure every bug fix ships with a regression test. I'll start blocking releases that don't have one.", 3],
      [michael, "The staging URL moved to https://staging.catalyst.dev — update your env files.", 1],
    ],
    design: [
      [olivia, "Critique on Thursday: new onboarding and the bottom nav. Bring your questions.", 4],
      [james, "Let's go with the 4-tab navigation. The usability tests showed people never found search in the 5th tab.", 3],
      [emily, "Design tokens are now exported automatically to the web and mobile repos on every Figma publish.", 2],
    ],
    pay: [
      [sarah, "Final call on retries: webhooks get 5 attempts with exponential backoff, then go to the dead-letter queue.", 6],
      [michael, "The refund bug was float rounding. We will keep all money as integer cents end to end.", 1],
      [grace, "Load test scenario is ready for review. Target is 3x last Black Friday peak.", 1],
      [ryan, "From the Northwind side: PO numbers on invoices are a must-have for our finance team.", 2],
    ],
    mob: [
      [james, "Beta goes to 200 TestFlight users on the 15th. We agreed on a 2-week beta before public launch.", 4],
      [olivia, "Permission prompts only after the first completed task — decided in critique.", 5],
      [hannah, "Onboarding completion is at 61% on the old flow. Goal for the new one is 75%.", 2],
    ],
    web: [
      [james, "Annual pricing shown by default. Decision is final after the Northwind review.", 4],
      [olivia, "Content freeze is in 6 days. After that only bug fixes go in.", 2],
    ],
    ops: [
      [daniel, "Production upgrades only on Tuesdays 6-8am ET from now on.", 5],
      [murali, "Postmortem action item: always adjust the DB pool size when worker counts change.", 16],
      [daniel, "Staging will scale to zero on weekends starting next week. Ping me if you need it.", 2],
    ],
    "murali.vijay-sarah.mitchell": [
      [murali, "Can you review Hannah's payment failure dashboard before Friday?", 1],
      [sarah, "Yes — it's in my approvals queue. Will do tomorrow morning.", 1],
    ],
  };
  let messageCount = 0;
  for (const [name, list] of Object.entries(MESSAGES)) {
    let last = null;
    for (const [sender, text, daysAgo] of list) {
      const createdAt = ago(daysAgo, 9 + (messageCount % 8));
      const m = await Message.create({ channelId: channels[name]._id, sender: sender._id, text });
      await Message.collection.updateOne({ _id: m._id }, { $set: { createdAt, updatedAt: createdAt } });
      last = createdAt > (last || 0) ? createdAt : last;
      messageCount++;
    }
    await Channel.updateOne({ _id: channels[name]._id }, { lastMessageAt: last });
  }
  console.log(`Channels: ${channelDefs.length}, messages: ${messageCount}`);

  /* ── Knowledge base ───────────────────────────────────────── */
  // [key, title, type, content, tags, entities, importance, projectKey|null, visibility, author, verifiedBy|null, verifiedDaysAgo, pinned, tasks[], links[]]

  const MEMORIES = [
    ["release", "Production release checklist", "process",
      `Every production deploy follows this checklist.

1. Link the deploy to a task in Catalyst and make sure CI is green.
2. Announce the deploy in #engineering with the task reference.
3. If the change touches worker counts, adjust the database connection pool size in the same deploy.
4. Deploy to staging first and run the smoke test suite.
5. Deploy to production behind a feature flag where possible.
6. Watch the checkout SLO dashboard for 15 minutes after deploy.
7. Roll back immediately if error rate exceeds 1% — don't debug in production.

Hotfixes follow the same checklist. The only exception is the rollback itself.`,
      ["release", "deploy", "checklist", "ci"], ["Murali Vijay", "Catalyst"], 5, null, "workspace", murali, murali, 10, true, ["OPS-3"], ["pool", "rollback"]],
    ["pool", "Adjust DB pool size whenever worker counts change", "insight",
      `During the API outage on the 14th, a deploy doubled the number of API workers but left the database connection pool at 20 per worker. Postgres hit max_connections within minutes and every request queued.

Lesson learned: worker count and pool size must change together. The total connections (workers × pool size) must stay below 80% of max_connections. This is now step 3 of the release checklist.`,
      ["incident", "database", "postmortem", "release"], ["Postgres", "Michael Turner"], 5, "OPS", "workspace", murali, daniel, 15, false, ["OPS-3"], ["release"]],
    ["intents", "Use Payment Intents with idempotency keys", "decision",
      `We are moving checkout from the legacy Charges API to Stripe Payment Intents. Every intent creation uses an idempotency key built from the cart id plus the attempt number (for example cart_123:2). This prevents double charges when the client or a queue retries.

Payment Intents are required for Strong Customer Authentication (SCA) in the EU. The legacy charges path stays behind the legacy_charges feature flag until the Stripe migration milestone closes.`,
      ["payments", "stripe", "idempotency", "sca"], ["Stripe", "Sarah Mitchell", "Michael Turner"], 5, "PAY", "project", sarah, sarah, 6, true, ["PAY-1", "PAY-10"], ["webhooks", "cents"]],
    ["webhooks", "Stripe webhooks: 5 retries then dead-letter queue", "decision",
      `Stripe webhooks are verified, acknowledged immediately and processed asynchronously by a worker. A failed event is retried 5 times with exponential backoff (1m, 5m, 15m, 1h, 6h) and then moved to the dead-letter queue.

Root cause this fixes: synchronous processing caused Stripe to retry while we were still sending emails, which produced duplicate receipts. An alert fires when the webhook queue has more than 500 messages for 10 minutes.`,
      ["payments", "stripe", "webhooks", "queue"], ["Stripe", "Michael Turner"], 4, "PAY", "project", michael, sarah, 4, false, ["PAY-2", "OPS-6"], ["intents"]],
    ["cents", "Money is always integer cents", "decision",
      `All monetary amounts are stored and calculated as integer cents end to end — in the database, in APIs and in the frontend until display. Never use floating point numbers for currency.

This came from the partial refund bug, where 19.99 × 1 with a coupon became 1999.9999 cents and the refund endpoint returned a 500. Format amounts only at the edge with Intl.NumberFormat.`,
      ["payments", "currency", "bug", "conventions"], ["Michael Turner", "Grace Sullivan"], 5, "PAY", "workspace", michael, sarah, 1, false, ["PAY-4"], ["intents"]],
    ["po", "Enterprise invoices must include PO numbers", "insight",
      `From 8 enterprise customer interviews: finance teams reject invoices without a purchase order (PO) number because their accounts payable systems can't match them. Northwind confirmed this is a must-have.

Invoicing v2 adds an optional PO number on the customer record, printed on every invoice PDF and included in the invoice email subject line.`,
      ["invoicing", "enterprise", "research", "customers"], ["Northwind", "James Carter", "Ryan Cooper"], 4, "PAY", "project", james, sarah, 20, false, ["PAY-12", "PAY-5"], []],
    ["postgres", "Postgres for all new services", "decision",
      `We standardised on Postgres for every new service. MongoDB remains only for the existing Catalyst workspace data.

Reasons: transactions across payment tables, mature tooling for migrations, and the team's experience. New services get a managed Postgres instance from the platform team — request it with a task in the OPS project.`,
      ["database", "architecture", "postgres"], ["Postgres", "MongoDB", "Sarah Mitchell"], 4, null, "workspace", sarah, murali, 40, false, [], ["pool"]],
    ["k8s", "Production upgrades only on Tuesdays 6–8am ET", "decision",
      `Kubernetes and other production infrastructure upgrades happen only during the Tuesday maintenance window, 6–8am Eastern. Traffic is lowest and the whole platform team is online.

Upgrade staging first, run conformance tests, then upgrade production node pools one at a time. Announce in #ops 24 hours ahead.`,
      ["infrastructure", "kubernetes", "maintenance", "deploy"], ["Daniel Hayes", "Kubernetes"], 4, "OPS", "workspace", daniel, murali, 5, false, ["OPS-1"], ["release"]],
    ["ci", "Flaky CI fixed: one Redis per job", "insight",
      `The flaky CI failures in September were caused by parallel jobs sharing a single Redis instance and overwriting each other's keys. Each CI job now starts its own Redis container.

If you see a test that only fails in CI, check for shared state first: Redis, temp directories or a shared database schema.`,
      ["ci", "testing", "redis"], ["Daniel Hayes", "Redis"], 3, null, "workspace", daniel, sarah, 25, false, [], []],
    ["prs", "Pull requests stay under 400 lines", "process",
      `Keep pull requests under 400 changed lines. Larger changes get split into a stack before review.

- One reviewer for small changes, two for anything touching payments or auth.
- Reviews within one working day.
- The author merges after approval and owns the deploy.`,
      ["code-review", "pr", "conventions"], ["Emily Brooks"], 3, null, "workspace", emily, sarah, 120, false, [], ["release"]],
    ["regression", "Every bug fix ships with a regression test", "process",
      `QA blocks releases where a bug fix doesn't include a regression test that fails before the fix and passes after it. Link the test in the task before moving it to review.`,
      ["testing", "qa", "bug", "release"], ["Grace Sullivan"], 4, null, "workspace", grace, sarah, 3, false, ["PAY-4"], ["release"]],
    ["staging", "Environments and URLs", "fact",
      `Production: https://app.catalyst.dev
Staging: https://staging.catalyst.dev (moved from the old staging-2 host)
Preview builds: one per pull request at https://pr-<number>.preview.catalyst.dev

Staging scales to zero on weekends and overnight to save cost. The staging database is reset weekly on Sunday night — re-run seeds if your branch depends on fixtures.`,
      ["environments", "staging", "urls"], ["Catalyst"], 3, null, "workspace", michael, daniel, 1, true, [], []],
    ["oncall", "On-call rotation and escalation", "process",
      `On-call rotates weekly on Monday at 10am ET. Primary acknowledges pages within 5 minutes; secondary is paged after 15 minutes.

Escalation: primary → secondary → engineering manager (Sarah Mitchell) → Head of Engineering (Murali Vijay).
Every page that wakes someone up gets a follow-up task in the OPS project within one working day.`,
      ["oncall", "incident", "escalation"], ["Sarah Mitchell", "Murali Vijay", "PagerDuty"], 4, "OPS", "workspace", sarah, murali, 100, false, ["OPS-5"], ["pool"]],
    ["notif", "Ask for notification permission after the first task", "decision",
      `In the new mobile onboarding we only request push notification permission after the user completes their first task — never during onboarding.

Usability sessions showed people decline prompts they don't yet understand. Asking after a moment of value roughly doubled opt-in in the prototype test.`,
      ["mobile", "onboarding", "notifications", "research"], ["Olivia Bennett", "James Carter"], 4, "MOB", "project", olivia, james, 5, false, ["MOB-1", "MOB-5"], ["onboarding-goal"]],
    ["nav", "Mobile navigation: four tabs, search in the top bar", "decision",
      `The mobile app moves from five bottom tabs to four: Home, Tasks, Inbox, Profile. Search moves into the top bar on every screen.

In usability tests, 7 of 10 participants never found search in the fifth tab.`,
      ["mobile", "navigation", "design", "research"], ["James Carter", "Olivia Bennett"], 3, "MOB", "project", james, olivia, 3, false, ["MOB-4"], []],
    ["onboarding-goal", "Onboarding completion goal: 75%", "fact",
      `The old 7-step onboarding completes at 61%. The goal for the new 3-screen onboarding is 75% completion in the beta.

Measured with the onboarding_step_viewed and onboarding_completed events in the analytics dashboard.`,
      ["mobile", "onboarding", "metrics"], ["Hannah Price"], 3, "MOB", "project", hannah, null, 0, false, ["MOB-8", "MOB-1"], ["events"]],
    ["events", "Analytics event naming convention", "process",
      `Analytics events use object_action in snake_case: onboarding_step_viewed, task_created, invoice_downloaded.

- Object first, then a past-tense verb.
- Properties are snake_case too.
- Never put personal data (emails, names) in event properties.`,
      ["analytics", "conventions", "tracking"], ["Hannah Price"], 3, null, "workspace", hannah, james, 30, false, ["MOB-8"], []],
    ["pricing", "Show annual pricing by default", "decision",
      `The new pricing page shows annual prices by default with a toggle for monthly. Northwind and two other prospects said monthly-first made the product look expensive.

Annual is displayed as the monthly equivalent ("$24/mo, billed annually") with the savings percentage next to the toggle.`,
      ["pricing", "website", "marketing"], ["James Carter", "Northwind"], 4, "WEB", "project", james, olivia, 4, false, ["WEB-1"], []],
    ["freeze", "Website content freeze rules", "process",
      `After content freeze only bug fixes and approved legal copy changes go into the website. Anything else goes into the backlog for after launch.

Content freeze for the redesign is six days before launch QA starts.`,
      ["website", "release", "content"], ["Olivia Bennett"], 2, "WEB", "project", olivia, null, 0, false, [], []],
    ["tokens", "Design tokens are exported automatically", "reference",
      `Design tokens (color, type, spacing, radius) live in the Figma library "Catalyst DS". Every Figma publish triggers a pipeline that exports tokens to the web and mobile repos and opens a pull request.

Figma: https://figma.com/file/catalyst-ds
Token pipeline: https://github.com/catalyst/design-tokens`,
      ["design-system", "figma", "tokens"], ["Figma", "Olivia Bennett", "Emily Brooks"], 3, null, "workspace", emily, olivia, 2, false, ["MOB-9"], []],
    ["keys", "Stripe keys rotate every 90 days", "process",
      `Stripe restricted keys rotate every 90 days via the scheduled rotation job. Keys live only in the secrets manager — never in .env files, CI variables or chat.

If a key leaks: revoke it in the Stripe dashboard first, then rotate, then post in #pay.`,
      ["security", "stripe", "secrets"], ["Stripe", "Daniel Hayes"], 5, "PAY", "project", daniel, sarah, 8, false, ["PAY-8"], ["intents"]],
    ["freeze-pay", "Payments release freeze for peak season", "fact",
      `The payments service is frozen from November 24 to December 2. Only P0 fixes approved by Sarah Mitchell may deploy during the freeze.`,
      ["payments", "release", "freeze"], ["Sarah Mitchell"], 4, "PAY", "workspace", sarah, murali, 4, false, [], ["release"]],
    ["q4", "Q4 engineering priorities", "fact",
      `1. Finish the Stripe migration (Payment Intents for 100% of traffic).
2. Ship the Mobile 2.0 beta to 200 TestFlight users.
3. Reduce infrastructure cost by 20%, starting with staging.`,
      ["roadmap", "priorities", "q4"], ["Murali Vijay"], 5, null, "workspace", murali, murali, 9, true, [], []],
    ["beta", "Mobile beta lasts two weeks", "decision",
      `The Mobile 2.0 beta runs for two weeks with 200 TestFlight and Play internal testers before public launch. Exit criteria: crash-free sessions above 99.5% and onboarding completion above 75%.`,
      ["mobile", "beta", "release"], ["James Carter"], 4, "MOB", "project", james, null, 0, false, ["MOB-7"], ["onboarding-goal"]],
    ["camera", "Android 14 camera crash after backgrounding", "insight",
      `The CameraX crash on Android 14 only happens when the app is backgrounded while the camera permission prompt is open. On resume, the camera provider is initialised twice. Guard initialisation with a lifecycle check.`,
      ["android", "bug", "camera"], ["Grace Sullivan", "Emily Brooks"], 3, "MOB", "project", grace, null, 0, false, ["MOB-3"], []],
    ["onboard-new", "New engineer onboarding guide", "process",
      `Week one for new engineers:

1. Get access: GitHub, Figma, Stripe test mode, PagerDuty (shadow only).
2. Read the Production release checklist and the PR guidelines.
3. Ship a small bug fix to production by Friday with a buddy.
4. Shadow one on-call shift in week two.

Your manager creates an onboarding task list in Catalyst on day one.`,
      ["onboarding", "engineering", "people"], ["GitHub", "Figma", "PagerDuty"], 3, null, "workspace", sarah, murali, 150, false, [], ["release", "prs", "oncall"]],
    ["private-note", "1:1 notes — growth plan ideas", "note",
      `Ideas for the team growth plan: rotate tech-lead duties per project, run a monthly architecture review, and budget conference talks for Q1.`,
      ["people", "growth"], [], 2, null, "private", murali, null, 0, false, [], []],
    ["cost", "Staging scales to zero overnight and weekends", "fact",
      `To reduce cloud spend, staging scales to zero from 9pm to 7am ET and all weekend. The first request wakes it within about 90 seconds. Ask Daniel Hayes in #ops if you need it held up for a demo.`,
      ["infrastructure", "cost", "staging"], ["Daniel Hayes"], 2, "OPS", "workspace", daniel, null, 0, false, ["OPS-4"], ["staging"]],
  ];

  const memByKey = {};
  for (const row of MEMORIES) {
    const [k, title, type, content, tags, entities, importance, projectKey, visibility, author, verifier, verifiedAgo, pinned, taskRefs] = row;
    const created = ago(Math.max(verifiedAgo + 2, 3 + (title.length % 20)), 11);
    const doc = await Memory.create({
      title,
      type,
      content,
      summary: content.split(/(?<=[.!?])\s+/)[0].replace(/^\d+\.\s*/, "").slice(0, 220),
      tags,
      entities,
      importance,
      projectId: projectKey ? projects[projectKey]._id : undefined,
      visibility,
      pinned,
      verified: verifier ? { by: verifier._id, at: ago(verifiedAgo, 14) } : undefined,
      reviewEveryDays: 90,
      enrichedBy: "local",
      source: { kind: "manual" },
      tasks: taskRefs.map((r) => taskByRef[r]?._id).filter(Boolean),
      helpful: users.filter((_u, i) => (title.length + i) % 3 === 0 && i !== users.indexOf(author)).slice(0, importance).map((u) => u._id),
      views: 4 + ((title.length * 7) % 60),
      createdBy: author._id,
      updatedBy: author._id,
    });
    await Memory.collection.updateOne({ _id: doc._id }, { $set: { createdAt: created, updatedAt: verifier ? ago(verifiedAgo, 14) : created } });
    memByKey[k] = doc;
  }
  for (const row of MEMORIES) {
    const links = (row[14] || []).map((k) => memByKey[k]?._id).filter(Boolean);
    if (links.length) await Memory.updateOne({ _id: memByKey[row[0]]._id }, { $set: { links } }, { timestamps: false });
  }
  // Two messages were already saved to the knowledge base
  const savedFrom = [
    ["engineering", "flaky CI", "ci"],
    ["pay", "integer cents", "cents"],
  ];
  for (const [ch, needle, k] of savedFrom) {
    await Message.updateOne({ channelId: channels[ch]._id, text: new RegExp(needle, "i") }, { $set: { memoryId: memByKey[k]._id } });
  }
  console.log(`Knowledge: ${MEMORIES.length}`);

  /* ── Notifications ────────────────────────────────────────── */

  const N = (user, actor, type, title, body, link, hoursAgo, read = false) => ({
    user: user._id,
    actor: actor?._id,
    type,
    title,
    body,
    link,
    read,
    createdAt: new Date(NOW - hoursAgo * 3600000),
  });
  const notes = [
    N(murali, michael, "approval_requested", "Michael submitted PAY-2 for review", "Webhook handler retries and dead-letter queue", { kind: "task", id: "PAY-2", projectId: "PAY" }, 20),
    N(murali, hannah, "approval_requested", "Hannah submitted PAY-9 for review", "Payment failure analytics dashboard", { kind: "task", id: "PAY-9", projectId: "PAY" }, 11),
    N(murali, sarah, "mentioned", "Sarah mentioned you in #engineering", "@murali.vijay can we make Postgres the default for the new invoicing service?", { kind: "channel", id: String(channels.engineering._id) }, 6),
    N(murali, daniel, "commented", "Daniel commented on OPS-1", "We decided to do production upgrades only on Tuesdays 6-8am ET.", { kind: "task", id: "OPS-1", projectId: "OPS" }, 30, true),
    N(murali, sarah, "message", "Sarah sent you a message", "Yes — it's in my approvals queue. Will do tomorrow morning.", { kind: "channel", id: String(channels["murali.vijay-sarah.mitchell"]._id) }, 22),
    N(murali, grace, "status_changed", "OPS-3 moved to Done", "Postmortem: API outage on the 14th", { kind: "task", id: "OPS-3", projectId: "OPS" }, 70, true),
    N(murali, null, "kb_review", "3 knowledge items are due for review", "Verified knowledge older than its review cycle needs a fresh check.", { kind: "kb", id: "review" }, 3),
    N(sarah, michael, "approval_requested", "Michael submitted PAY-2 for review", "Webhook handler retries and dead-letter queue", { kind: "task", id: "PAY-2", projectId: "PAY" }, 20),
    N(sarah, hannah, "approval_requested", "Hannah submitted PAY-9 for review", "Payment failure analytics dashboard", { kind: "task", id: "PAY-9", projectId: "PAY" }, 11),
    N(michael, sarah, "assigned", "Sarah assigned you PAY-4", "Refund endpoint returns 500 for partial refunds", { kind: "task", id: "PAY-4", projectId: "PAY" }, 40),
    N(michael, sarah, "kb_verified", "Sarah verified “Money is always integer cents”", "", { kind: "memory", id: String(memByKey.cents._id) }, 18),
    N(emily, james, "assigned", "James assigned you MOB-2", "Offline mode for task list", { kind: "task", id: "MOB-2", projectId: "MOB" }, 30),
    N(james, olivia, "approval_requested", "Olivia submitted MOB-4 for review", "Bottom navigation redesign", { kind: "task", id: "MOB-4", projectId: "MOB" }, 26),
  ];
  const inserted = await Notification.insertMany(notes);
  await Promise.all(inserted.map((n, i) => Notification.collection.updateOne({ _id: n._id }, { $set: { createdAt: notes[i].createdAt } })));
  console.log(`Notifications: ${notes.length}`);

  console.log("\nSeed complete. Sign in with any of:");
  PEOPLE.forEach(([f, l, role]) => console.log(`  ${`${f.toLowerCase()}.${l.toLowerCase()}@catalyst.dev`.padEnd(32)} ${`${f.toLowerCase()}123`.padEnd(12)} ${role}`));
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error("Seed failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
