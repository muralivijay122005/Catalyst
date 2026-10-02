// src/pages/Settings.jsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LuSettings, LuUser, LuSlidersHorizontal, LuKeyRound, LuKeyboard, LuCheck } from "react-icons/lu";
import PageHeader from "../components/layout/PageHeader";
import { Avatar } from "../components/ui/Avatar";
import { RoleBadge, Segmented, Spinner, Switch } from "../components/ui/primitives";
import { toast } from "../components/ui/toast";
import { ShortcutList } from "../components/layout/ShortcutsDialog";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { AVATAR_COLORS } from "../lib/constants";
import { formatDate } from "../lib/format";

const TABS = [
  { id: "profile", label: "Profile", icon: LuUser },
  { id: "preferences", label: "Preferences", icon: LuSlidersHorizontal },
  { id: "security", label: "Security", icon: LuKeyRound },
  { id: "shortcuts", label: "Shortcuts", icon: LuKeyboard },
];

function Row({ label, hint, children }) {
  return (
    <div className="grid sm:grid-cols-[220px_1fr] gap-x-8 gap-y-2 py-5 border-b border-line last:border-0">
      <div>
        <p className="text-[13px] font-medium text-ink">{label}</p>
        {hint && <p className="text-xs text-muted mt-0.5 leading-5">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Profile() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    title: user.title || "",
    department: user.department || "",
    location: user.location || "",
    bio: user.bio || "",
    avatarColor: user.avatarColor,
  });
  const [saving, setSaving] = useState(false);
  const dirty = Object.entries(form).some(([k, v]) => (user[k] || "") !== v);

  return (
    <div>
      <div className="flex items-center gap-4 pb-6 border-b border-line">
        <Avatar user={{ ...user, ...form }} size={64} />
        <div>
          <p className="text-[17px] font-semibold tracking-tight">
            {form.firstName} {form.lastName}
          </p>
          <p className="text-[13px] text-muted flex items-center gap-2 mt-0.5">
            {user.email} <RoleBadge role={user.role} />
          </p>
          <p className="text-xs text-faint mt-1">Member since {formatDate(user.createdAt)}</p>
        </div>
      </div>
      <Row label="Name">
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <input className="field" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <input className="field" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </div>
      </Row>
      <Row label="Title & department" hint="Shown on your profile and in pickers.">
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <input className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" />
          <input className="field" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Department" />
        </div>
      </Row>
      <Row label="Location">
        <input className="field max-w-md" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City, Country" />
      </Row>
      <Row label="Bio" hint="A line or two about what you work on.">
        <textarea className="field max-w-md" rows={3} maxLength={280} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        <p className="hint">{form.bio.length}/280</p>
      </Row>
      <Row label="Avatar color">
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setForm({ ...form, avatarColor: c })}
              className="grid place-items-center size-8 rounded-full transition-transform hover:scale-110"
              style={{ background: c, boxShadow: form.avatarColor === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : undefined }}
              aria-label={`Color ${c}`}
            >
              {form.avatarColor === c && <LuCheck size={14} className="text-white" />}
            </button>
          ))}
        </div>
      </Row>
      <div className="flex justify-end pt-5">
        <button
          className="btn btn-primary"
          disabled={!dirty || saving}
          onClick={async () => {
            setSaving(true);
            try {
              await updateProfile(form);
              toast.success("Profile saved");
            } catch (err) {
              toast.error(err.message);
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving && <Spinner size={13} />} Save profile
        </button>
      </div>
    </div>
  );
}

function Preferences() {
  const { user, updateProfile } = useAuth();
  const prefs = user.preferences || {};
  const set = async (patch) => {
    try {
      await updateProfile({ preferences: { ...prefs, ...patch } });
      toast.success("Preference saved");
    } catch (err) {
      toast.error(err.message);
    }
  };
  return (
    <div>
      <Row label="Default project view" hint="What opens when you click a project.">
        <Segmented
          size="sm"
          value={prefs.defaultProjectView || "board"}
          onChange={(v) => set({ defaultProjectView: v })}
          options={["board", "list", "calendar", "timeline"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))}
        />
      </Row>
      <Row label="Week starts on" hint="Used by the calendar.">
        <Segmented
          size="sm"
          value={prefs.weekStartsOn ?? 1}
          onChange={(v) => set({ weekStartsOn: v })}
          options={[
            { value: 1, label: "Monday" },
            { value: 0, label: "Sunday" },
          ]}
        />
      </Row>
      <Row label="Reduce motion" hint="Turn off animations and transitions.">
        <Switch checked={Boolean(prefs.reduceMotion)} onChange={(v) => set({ reduceMotion: v })} label="Reduce motion" />
      </Row>
      <Row label="Daily email digest" hint="A morning summary of what's due and what changed.">
        <Switch checked={prefs.emailDigest !== false} onChange={(v) => set({ emailDigest: v })} label="Email digest" />
      </Row>
    </div>
  );
}

function Security() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const mismatch = form.confirm && form.newPassword !== form.confirm;
  return (
    <div>
      <Row label="Change password" hint="At least 8 characters.">
        <div className="space-y-3 max-w-sm">
          <input className="field" type="password" autoComplete="current-password" placeholder="Current password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
          <input className="field" type="password" autoComplete="new-password" placeholder="New password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
          <input className="field" type="password" autoComplete="new-password" placeholder="Confirm new password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          {mismatch && <p className="text-xs text-danger">Passwords don't match</p>}
          <button
            className="btn btn-primary"
            disabled={!form.currentPassword || form.newPassword.length < 8 || mismatch || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await api.post("/auth/me/password", form);
                toast.success("Password changed");
                setForm({ currentPassword: "", newPassword: "", confirm: "" });
              } catch (err) {
                toast.error(err.message);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving && <Spinner size={13} />} Update password
          </button>
        </div>
      </Row>
    </div>
  );
}

export default function Settings() {
  const { tab = "profile" } = useParams();
  const navigate = useNavigate();
  return (
    <>
      <PageHeader icon={<LuSettings size={15} />} title="Settings" subtitle="Your profile and preferences">
        <nav className="flex gap-5 -mb-px">
          {TABS.map((t) => (
            <button key={t.id} className="tab" data-active={tab === t.id} onClick={() => navigate(`/settings/${t.id}`)}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </nav>
      </PageHeader>
      <div className="flex-1 scroll">
        <div key={tab} className="max-w-[820px] mx-auto px-6 py-6" style={{ animation: "var(--animate-enter)" }}>
          {tab === "profile" && <Profile />}
          {tab === "preferences" && <Preferences />}
          {tab === "security" && <Security />}
          {tab === "shortcuts" && <ShortcutList />}
        </div>
      </div>
    </>
  );
}
