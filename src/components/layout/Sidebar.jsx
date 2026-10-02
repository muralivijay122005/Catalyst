// src/components/layout/Sidebar.jsx
import { NavLink, useNavigate } from "react-router-dom";
import {
  LuHouse,
  LuInbox,
  LuCircleCheck,
  LuShieldCheck,
  LuBrain,
  LuMessagesSquare,
  LuUsers,
  LuSettings,
  LuSearch,
  LuPlus,
  LuSquarePen,
  LuStar,
  LuLogOut,
  LuKeyboard,
  LuUser,
  LuPanelLeft,
  LuChevronDown,
  LuFolderKanban,
} from "react-icons/lu";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { Avatar } from "../ui/Avatar";
import { Logo } from "../ui/icons";
import Popover from "../ui/Popover";
import { Kbd, ProgressRing, RoleBadge, Tooltip, ProjectMark } from "../ui/primitives";
import { fullName } from "../../lib/format";
import { usePersistentState } from "../../lib/hooks";

function NavItem({ to, icon: Icon, label, badge, collapsed, keys, end }) {
  const link = (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group relative flex items-center gap-2.5 h-8 rounded-lg text-[13px] font-medium outline-none transition-[background-color,color,box-shadow] duration-150 focus-visible:shadow-[var(--shadow-focus)]
        ${collapsed ? "justify-center w-9 mx-auto" : "px-2.5"}
        ${isActive ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-2/80 hover:bg-black/[0.04] hover:text-ink"}`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={16} className={`shrink-0 transition-colors ${isActive ? "text-accent" : "text-muted group-hover:text-ink-2"}`} />
          {!collapsed && <span className="flex-1 truncate">{label}</span>}
          {badge > 0 &&
            (collapsed ? (
              <span className="absolute top-1 right-1 size-2 rounded-full bg-accent ring-2 ring-canvas" />
            ) : (
              <span className={`badge ${isActive ? "bg-accent text-white" : "bg-accent-soft text-accent"}`} style={{ animation: "var(--animate-pop)" }}>
                {badge > 99 ? "99+" : badge}
              </span>
            ))}
        </>
      )}
    </NavLink>
  );
  return collapsed ? (
    <Tooltip label={label} keys={keys} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function ProjectLink({ project, collapsed, favorite, onToggleFavorite }) {
  const link = (
    <NavLink
      to={`/projects/${project.key}`}
      className={({ isActive }) =>
        `group flex items-center gap-2.5 h-8 rounded-lg text-[13px] outline-none transition-colors duration-150 focus-visible:shadow-[var(--shadow-focus)]
        ${collapsed ? "justify-center w-9 mx-auto" : "px-2.5"}
        ${isActive ? "bg-surface text-ink font-medium shadow-[var(--shadow-card)]" : "text-ink-2/80 hover:bg-black/[0.04] hover:text-ink"}`
      }
    >
      <ProjectMark project={project} size={16} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{project.name}</span>
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(project._id);
            }}
            className={`icon-btn size-5 ${favorite ? "text-amber-500" : "opacity-0 group-hover:opacity-100"}`}
            aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
          >
            <LuStar size={12} className={favorite ? "fill-current" : ""} />
          </span>
          <span className="group-hover:hidden">
            <ProgressRing value={project.stats?.progress || 0} size={14} stroke={2} color={project.color} />
          </span>
        </>
      )}
    </NavLink>
  );
  return collapsed ? (
    <Tooltip label={project.name} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout, can, updateProfile } = useAuth();
  const ws = useWorkspace();
  const navigate = useNavigate();
  const [projectsOpen, setProjectsOpen] = usePersistentState("catalyst.sidebar.projects", true);
  const favorites = user?.favorites || [];
  const active = ws.projects.filter((p) => p.status !== "archived");
  const favProjects = active.filter((p) => favorites.includes(p._id));

  const toggleFavorite = (id) => {
    const next = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
    updateProfile({ favorites: next }).catch(() => { });
  };

  return (
    <aside
      className={`shrink-0 h-full flex flex-col bg-canvas transition-[width] duration-300 ${collapsed ? "w-[60px]" : "w-[248px]"}`}
      style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
    >
      {/* Workspace header */}
      <div className={`flex items-center h-14 shrink-0 ${collapsed ? "justify-center" : "px-4 gap-2.5"}`}>
        <button onClick={collapsed ? onToggle : () => navigate("/home")} className="flex items-center gap-1 min-w-0 rounded-lg outline-none focus-visible:shadow-[var(--shadow-focus)]" aria-label="Catalyst Home">
          <Logo size={collapsed ? 22 : 24} className="transition-transform duration-300 hover:rotate-[-4deg]" />
          {!collapsed && (
            <span className="text-[17px] font-semibold tracking-[-0.03em] font-sans text-ink select-none">
              catalyst
            </span>
          )}
        </button>
        {!collapsed && (
          <div className="ml-auto flex items-center gap-0.5">
            <Tooltip label="Collapse sidebar" keys={["["]}>
              <button className="icon-btn" onClick={onToggle} aria-label="Collapse sidebar">
                <LuPanelLeft size={15} />
              </button>
            </Tooltip>
            {ws.creatableProjects.length > 0 && (
              <Tooltip label="New task" keys={["C"]}>
                <button className="icon-btn" onClick={() => ws.openCreateTask({})} aria-label="New task">
                  <LuSquarePen size={15} />
                </button>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      <div className={`shrink-0 ${collapsed ? "px-2.5" : "px-3"} pb-2`}>
        {collapsed ? (
          <Tooltip label="Search" keys={["mod", "K"]} side="right">
            <button onClick={() => ws.setPaletteOpen(true)} className="icon-btn w-9 h-8 mx-auto flex" aria-label="Search">
              <LuSearch size={16} />
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={() => ws.setPaletteOpen(true)}
            className="flex items-center gap-2 w-full h-8 px-2.5 rounded-lg bg-surface text-[13px] text-faint outline-none transition-shadow hover:shadow-[var(--shadow-raised)] focus-visible:shadow-[var(--shadow-focus)]"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <LuSearch size={14} />
            <span className="flex-1 text-left">Search or jump to…</span>
            <Kbd keys={["mod", "K"]} />
          </button>
        )}
      </div>

      <nav className="flex-1 min-h-0 scroll no-scrollbar px-3 pb-3">
        <div className="space-y-0.5">
          <NavItem to="/home" icon={LuHouse} label="Home" collapsed={collapsed} keys={["G", "H"]} />
          <NavItem to="/inbox" icon={LuInbox} label="Inbox" badge={ws.unread} collapsed={collapsed} keys={["G", "I"]} />
          <NavItem to="/my-tasks" icon={LuCircleCheck} label="My tasks" collapsed={collapsed} keys={["G", "T"]} />
          {ws.canApproveAnywhere && <NavItem to="/approvals" icon={LuShieldCheck} label="Approvals" collapsed={collapsed} keys={["G", "A"]} />}
        </div>

        <div className="mt-5 space-y-0.5">
          {!collapsed && <p className="eyebrow px-2.5 mb-1.5">Workspace</p>}
          <NavLink
            to="/kb"
            className={({ isActive }) =>
              `group relative flex items-center gap-2.5 h-8 rounded-lg text-[13px] font-medium outline-none transition-all duration-150
              ${collapsed ? "justify-center w-9 mx-auto" : "px-2.5"}
              ${isActive ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-2/80 hover:bg-black/[0.04] hover:text-ink"}`
            }
            title={collapsed ? "Knowledge Base" : undefined}
          >
            {({ isActive }) => (
              <>
                <span className={`grid place-items-center size-[18px] rounded-[5px] ${isActive ? "bg-accent text-white" : "bg-accent-soft text-accent"} transition-colors`}>
                  <LuBrain size={12} />
                </span>
                {!collapsed && (
                  <>
                    <span className="flex-1">Knowledge Base</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-accent/80">{ws.kbStatus.ai ? "AI" : ""}</span>
                  </>
                )}
              </>
            )}
          </NavLink>
          <NavItem to="/channels" icon={LuMessagesSquare} label="Channels" collapsed={collapsed} keys={["G", "C"]} />
          <NavItem to="/team" icon={LuUsers} label="People" collapsed={collapsed} keys={["G", "P"]} />
        </div>

        {favProjects.length > 0 && (
          <div className="mt-5 space-y-0.5">
            {!collapsed && <p className="eyebrow px-2.5 mb-1.5">Favorites</p>}
            {favProjects.map((p) => (
              <ProjectLink key={p._id} project={p} collapsed={collapsed} favorite onToggleFavorite={toggleFavorite} />
            ))}
          </div>
        )}

        <div className="mt-5 space-y-0.5">
          {!collapsed && (
            <div className="group flex items-center px-2.5 mb-1.5">
              <button onClick={() => setProjectsOpen((o) => !o)} className="eyebrow flex items-center gap-1 hover:text-muted">
                Projects
                <LuChevronDown size={12} className={`transition-transform duration-200 ${projectsOpen ? "" : "-rotate-90"}`} />
              </button>
              <span className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Tooltip label="All projects">
                  <button className="icon-btn size-5" onClick={() => navigate("/projects")} aria-label="All projects">
                    <LuFolderKanban size={12} />
                  </button>
                </Tooltip>
                {can("project.create") && (
                  <Tooltip label="New project">
                    <button className="icon-btn size-5" onClick={() => navigate("/projects?new=1")} aria-label="New project">
                      <LuPlus size={13} />
                    </button>
                  </Tooltip>
                )}
              </span>
            </div>
          )}
          {(projectsOpen || collapsed) && (
            <div className="space-y-0.5 stagger">
              {active
                .filter((p) => !favorites.includes(p._id))
                .map((p, i) => (
                  <div key={p._id} style={{ "--i": i }}>
                    <ProjectLink project={p} collapsed={collapsed} favorite={false} onToggleFavorite={toggleFavorite} />
                  </div>
                ))}
              {!ws.projectsLoaded &&
                [0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2.5 h-8 px-2.5">
                    <span className="skeleton size-4" />
                    {!collapsed && <span className="skeleton h-3 w-24" />}
                  </div>
                ))}
              {ws.projectsLoaded && !active.length && !collapsed && <p className="px-2.5 py-1 text-xs text-faint">No projects yet</p>}
            </div>
          )}
        </div>
      </nav>

      {/* Account */}
      <div className={`shrink-0 p-3 pt-2 ${collapsed ? "px-2.5" : ""}`}>
        <Popover
          placement="bottom-start"
          width={232}
          content={({ close }) => (
            <div className="menu">
              <div className="flex items-center gap-2.5 px-2 py-2">
                <Avatar user={user} size={32} />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink truncate">{fullName(user)}</p>
                  <p className="text-xs text-muted truncate">{user?.email}</p>
                </div>
              </div>
              <div className="menu-sep" />
              {[
                { icon: LuUser, label: "Profile", to: "/settings/profile" },
                { icon: LuSettings, label: "Preferences", to: "/settings/preferences" },
              ].map((item) => (
                <button
                  key={item.label}
                  className="menu-item"
                  onClick={() => {
                    close();
                    navigate(item.to);
                  }}
                >
                  <item.icon size={14} className="text-muted" />
                  {item.label}
                </button>
              ))}
              <button
                className="menu-item"
                onClick={() => {
                  close();
                  ws.setShortcutsOpen(true);
                }}
              >
                <LuKeyboard size={14} className="text-muted" />
                <span className="flex-1">Keyboard shortcuts</span>
                <Kbd keys={["?"]} />
              </button>
              <div className="menu-sep" />
              <button
                className="menu-item"
                onClick={() => {
                  close();
                  logout();
                  navigate("/login");
                }}
              >
                <LuLogOut size={14} className="text-muted" />
                Sign out
              </button>
            </div>
          )}
        >
          {({ ref, toggle, open }) => (
            <button
              ref={ref}
              onClick={toggle}
              className={`flex items-center gap-2.5 w-full rounded-lg outline-none transition-colors focus-visible:shadow-[var(--shadow-focus)] ${collapsed ? "justify-center p-1" : "p-1.5"
                } ${open ? "bg-black/[0.05]" : "hover:bg-black/[0.04]"}`}
            >
              <Avatar user={user} size={collapsed ? 28 : 30} />
              {!collapsed && (
                <>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block text-[13px] font-medium text-ink truncate">{fullName(user)}</span>
                    <span className="block text-[11.5px] text-muted truncate">{user?.title || "Catalyst"}</span>
                  </span>
                  <RoleBadge role={user?.role} />
                </>
              )}
            </button>
          )}
        </Popover>
      </div>
    </aside>
  );
}
