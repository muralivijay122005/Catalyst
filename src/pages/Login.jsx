// src/pages/Login.jsx
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LuArrowRight, LuEye, LuEyeOff, LuSparkles, LuBadgeCheck, LuShieldCheck, LuKanban, LuBrain, LuCircleCheck } from "react-icons/lu";
import { useAuth } from "../context/AuthContext";
import { Logo, StatusIcon, PriorityIcon } from "../components/ui/icons";
import { Avatar } from "../components/ui/Avatar";
import { RoleBadge, Spinner } from "../components/ui/primitives";

const DEMO = [
  { name: "Murali Vijay", email: "murali.vijay@catalyst.dev", password: "murali123", role: "admin", title: "Head of Engineering", color: "#0f172a" },
  { name: "Sarah Mitchell", email: "sarah.mitchell@catalyst.dev", password: "sarah123", role: "manager", title: "Engineering Manager", color: "#2563eb" },
  { name: "Emily Brooks", email: "emily.brooks@catalyst.dev", password: "emily123", role: "member", title: "Senior Frontend Engineer", color: "#7c3aed" },
  { name: "Ryan Cooper", email: "ryan.cooper@catalyst.dev", password: "ryan123", role: "guest", title: "Client, Northwind", color: "#64748b" },
];

const PREVIEW_COLUMNS = [
  {
    status: "todo",
    label: "Todo",
    cards: [
      { ref: "PAY-3", title: "SCA compliance audit", priority: "high", label: ["Security", "#7c3aed"], user: { firstName: "Grace", lastName: "Sullivan", avatarColor: "#ea580c" } },
      { ref: "PAY-5", title: "Invoice PDF template v2", priority: "medium", label: ["Feature", "#2563eb"], user: { firstName: "Emily", lastName: "Brooks", avatarColor: "#7c3aed" } },
    ],
  },
  {
    status: "in_progress",
    label: "In progress",
    cards: [{ ref: "PAY-1", title: "Migrate checkout to Payment Intents", priority: "urgent", label: ["Feature", "#2563eb"], user: { firstName: "Michael", lastName: "Turner", avatarColor: "#1d4ed8" }, progress: 2 }],
  },
  {
    status: "in_review",
    label: "In review",
    cards: [{ ref: "PAY-2", title: "Webhook retries & dead-letter queue", priority: "high", label: ["Feature", "#2563eb"], user: { firstName: "Michael", lastName: "Turner", avatarColor: "#1d4ed8" }, review: true }],
  },
];

const FEATURES = [
  { icon: LuKanban, title: "Plan & track", text: "Boards, timelines and a calendar for every project." },
  { icon: LuShieldCheck, title: "Built-in approvals", text: "Finished work is reviewed before it counts as done." },
  { icon: LuBrain, title: "Knowledge that answers", text: "Decisions captured as you work, with cited answers." },
];

function PreviewCard({ c, delay }) {
  return (
    <div className="rounded-lg bg-white p-2.5" style={{ boxShadow: "var(--shadow-card)", animation: `enter 600ms var(--ease-out-expo) ${delay}ms both` }}>
      <div className="flex items-center gap-1.5 text-[10px] text-faint">
        <span className="tabular-nums">{c.ref}</span>
        {c.review && <LuShieldCheck size={10} className="text-accent" />}
        <span className="ml-auto">
          <PriorityIcon priority={c.priority} size={11} />
        </span>
      </div>
      <p className="mt-1 text-[11.5px] font-medium leading-[15px] text-ink">{c.title}</p>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 h-4 px-1.5 rounded bg-subtle text-[9.5px] font-medium text-ink-2">
          <span className="size-1.5 rounded-full" style={{ background: c.label[1] }} />
          {c.label[0]}
        </span>
        {c.progress != null && <span className="text-[9.5px] text-faint tabular-nums">{c.progress}/4</span>}
        <span className="ml-auto">
          <Avatar user={c.user} size={16} />
        </span>
      </div>
    </div>
  );
}

function Showcase() {
  return (
    <div
      className="relative hidden lg:flex flex-col overflow-hidden rounded-2xl bg-surface px-12 pt-12 pb-10"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Blue blurred glow + faint grid */}
      <div className="pointer-events-none absolute -top-48 -right-40 size-[560px] rounded-full bg-accent/25 blur-[120px]" style={{ animation: "float 14s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute -bottom-56 -left-32 size-[460px] rounded-full bg-sky-300/30 blur-[120px]" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgb(10 10 11 / 0.04) 1px, transparent 1px), linear-gradient(90deg, rgb(10 10 11 / 0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, black, transparent)",
        }}
      />

      {/* Headline */}
      <div className="relative max-w-[460px]">
        <span className="inline-flex items-center gap-1.5 h-7 pl-1 pr-3 rounded-full bg-white/80 text-[12px] font-medium text-ink-2 backdrop-blur" style={{ boxShadow: "var(--shadow-card)" }}>
          <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-accent text-white text-[10.5px] font-semibold">New</span>
          Ask your Knowledge Base anything
        </span>
        <h2 className="mt-5 text-[38px] leading-[1.08] font-semibold tracking-[-0.035em] text-ink">
          Plan the work.
          <br />
          <span className="text-blue-600">Remember why.</span>
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">
          Projects, approvals and a Knowledge Base that captures your team's decisions as you work — and answers questions from them.
        </p>
      </div>

      {/* Product preview */}
      <div className="relative h-[350px] shrink-0 my-auto pt-8">
        <div
          className="absolute left-0 right-10 top-0 rounded-2xl bg-white/75 backdrop-blur-xl overflow-hidden"
          style={{ boxShadow: "0 1px 2px rgb(10 10 11 / 0.04), 0 24px 60px -20px rgb(37 99 235 / 0.25), 0 0 0 1px rgb(10 10 11 / 0.06)", animation: "var(--animate-rise)" }}
        >
          {/* window chrome */}
          <div className="flex items-center gap-2 h-9 px-3.5 border-b border-line bg-white/70">
            <span className="flex gap-1.5">
              {["#e4e4e7", "#e4e4e7", "#e4e4e7"].map((c, i) => (
                <span key={i} className="size-2.5 rounded-full" style={{ background: c }} />
              ))}
            </span>
            <span className="ml-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-2">
              <span className="grid place-items-center size-4 rounded bg-accent text-white text-[8px] font-bold">P</span>
              Payments Platform
            </span>
            <span className="ml-auto flex -space-x-1.5">
              {[["Sarah", "Mitchell", "#2563eb"], ["Michael", "Turner", "#1d4ed8"], ["Emily", "Brooks", "#7c3aed"]].map(([f, l, c]) => (
                <Avatar key={f} user={{ firstName: f, lastName: l, avatarColor: c }} size={18} ring />
              ))}
            </span>
          </div>
          {/* mini board */}
          <div className="grid grid-cols-3 gap-2.5 p-3 bg-canvas/60">
            {PREVIEW_COLUMNS.map((col, ci) => (
              <div key={col.status} className="min-w-0">
                <p className="flex items-center gap-1.5 px-1 pb-2 text-[11px] font-semibold text-ink">
                  <StatusIcon status={col.status} size={11} />
                  {col.label}
                  <span className="font-normal text-faint">{col.cards.length}</span>
                </p>
                <div className="space-y-2">
                  {col.cards.map((c, i) => (
                    <PreviewCard key={c.ref} c={c} delay={250 + ci * 90 + i * 70} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Knowledge answer, overlapping the window */}
        <div
          className="absolute right-0 bottom-0 w-[300px] rounded-xl bg-white p-4"
          style={{ boxShadow: "var(--shadow-pop)", animation: "enter 700ms var(--ease-out-expo) 650ms both" }}
        >
          <div style={{ animation: "float 8s ease-in-out 1.5s infinite" }}>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-accent">
              <span className="grid place-items-center size-5 rounded-md bg-accent text-white">
                <LuSparkles size={11} />
              </span>
              How often are webhooks retried?
            </p>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-2">
              5 times with exponential backoff, then the event moves to the dead-letter queue.
              <span className="ml-1 inline-grid place-items-center min-w-[16px] h-4 px-1 rounded bg-accent-soft text-[10px] font-semibold text-accent align-middle">1</span>
            </p>
            <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted">
              <LuBadgeCheck size={12} className="text-accent" /> Verified decision · Sarah Mitchell
            </p>
          </div>
        </div>

        {/* Approval toast */}
        <div
          className="absolute -left-4 bottom-10 flex items-center gap-2.5 rounded-xl bg-white pl-2.5 pr-3.5 py-2.5"
          style={{ boxShadow: "var(--shadow-pop)", animation: "enter 700ms var(--ease-out-expo) 900ms both" }}
        >
          <span className="grid place-items-center size-7 rounded-full bg-green-50 text-ok">
            <LuCircleCheck size={15} />
          </span>
          <span>
            <span className="block text-[12px] font-medium text-ink">PAY-2 approved</span>
            <span className="block text-[11px] text-muted">by Sarah Mitchell · just now</span>
          </span>
        </div>
      </div>

      {/* Features */}
      <div className="relative grid grid-cols-3 gap-6 mt-8 pt-6 border-t border-line/80">
        {FEATURES.map((f) => (
          <div key={f.title}>
            <f.icon size={16} className="text-accent" />
            <p className="mt-2 text-[13px] font-semibold text-ink">{f.title}</p>
            <p className="mt-0.5 text-[12px] leading-[18px] text-muted">{f.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const after = () => navigate(location.state?.from || "/home", { replace: true });

  const submit = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form);
      after();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const quick = async (d) => {
    setForm((f) => ({ ...f, email: d.email, password: d.password }));
    setError("");
    setLoading(true);
    try {
      await login(d.email, d.password);
      after();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-2 p-2 bg-canvas">
      <div className="flex flex-col justify-center px-6 sm:px-12 py-10">
        <div className="w-full max-w-[380px] mx-auto" style={{ animation: "var(--animate-rise)" }}>
          <div className="flex items-center gap-2.5 mb-10">
            <Logo size={30} />
            <span className="text-[19px] font-semibold tracking-[-0.03em] font-sans text-ink select-none">
              Catalyst
            </span>
          </div>
          <h1 className="h-display text-[26px]">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1.5 text-[14px] text-muted">{mode === "login" ? "Sign in to your Catalyst workspace." : "Join your team's workspace in seconds."}</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">First name</label>
                  <input className="field" value={form.firstName} onChange={set("firstName")} required autoComplete="given-name" />
                </div>
                <div>
                  <label className="label">Last name</label>
                  <input className="field" value={form.lastName} onChange={set("lastName")} required autoComplete="family-name" />
                </div>
              </div>
            )}
            <div>
              <label className="label">{mode === "login" ? "Email or username" : "Work email"}</label>
              <input className="field h-10" value={form.email} onChange={set("email")} required autoFocus autoComplete="username" placeholder="you@company.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="field h-10 pr-1.5">
                <input
                  type={show ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  required
                  minLength={mode === "register" ? 8 : undefined}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder={mode === "register" ? "At least 8 characters" : "••••••••"}
                />
                <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
                  {show ? <LuEyeOff size={15} /> : <LuEye size={15} />}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-[13px] text-danger" style={{ animation: "var(--animate-enter)" }}>
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary btn-lg w-full group" disabled={loading}>
              {loading ? <Spinner size={15} /> : null}
              {mode === "login" ? "Sign in" : "Create account"}
              {!loading && <LuArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>

          <p className="mt-5 text-[13px] text-muted text-center">
            {mode === "login" ? "New to Catalyst? " : "Already have an account? "}
            <button className="link font-medium" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>

          {mode === "login" && (
            <div className="mt-10">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex-1 border-t border-line" />
                <span className="eyebrow">Demo workspace</span>
                <span className="flex-1 border-t border-line" />
              </div>
              <div className="grid gap-1.5 stagger">
                {DEMO.map((d, i) => (
                  <button
                    key={d.email}
                    onClick={() => quick(d)}
                    disabled={loading}
                    style={{ "--i": i }}
                    className="group flex items-center gap-3 w-full p-2 rounded-lg text-left bg-surface card-hover"
                  >
                    <Avatar user={{ firstName: d.name.split(" ")[0], lastName: d.name.split(" ")[1], avatarColor: d.color }} size={30} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-medium text-ink">{d.name}</span>
                      <span className="block text-[11.5px] text-muted truncate">{d.title}</span>
                    </span>
                    <RoleBadge role={d.role} />
                    <LuArrowRight size={14} className="text-faint transition-all group-hover:text-ink group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11.5px] text-faint text-center">Each role sees and can do different things — try a few.</p>
            </div>
          )}
        </div>
      </div>
      <Showcase />
    </div>
  );
}
