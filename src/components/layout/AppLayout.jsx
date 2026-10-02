// src/components/layout/AppLayout.jsx
import { useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { WorkspaceProvider, useWorkspace } from "../../context/WorkspaceContext";
import Sidebar from "./Sidebar";
import CommandPalette from "./CommandPalette";
import ShortcutsDialog from "./ShortcutsDialog";
import TaskPanel from "../task/TaskPanel";
import CreateTaskModal from "../task/CreateTaskModal";
import { ConfirmHost } from "../ui/confirm";
import { isTypingTarget, usePersistentState } from "../../lib/hooks";
import { overlayOpen } from "../../lib/escape";

const GO = { h: "/home", i: "/inbox", t: "/my-tasks", a: "/approvals", k: "/kb", c: "/channels", p: "/team", s: "/settings" };

function Shell() {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = usePersistentState("catalyst.sidebar.collapsed", false);
  const pendingG = useRef(0);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ws.setPaletteOpen((o) => !o);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || overlayOpen()) return;
      const key = e.key.toLowerCase();
      if (Date.now() - pendingG.current < 900 && GO[key]) {
        e.preventDefault();
        pendingG.current = 0;
        navigate(GO[key]);
        return;
      }
      if (key === "g") {
        pendingG.current = Date.now();
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        ws.setPaletteOpen(true);
      } else if (e.key === "?") {
        e.preventDefault();
        ws.setShortcutsOpen(true);
      } else if (key === "c" && !e.shiftKey && !location.pathname.startsWith("/channels")) {
        if (ws.creatableProjects.length) {
          e.preventDefault();
          const key = /^\/projects\/([A-Z]+)/.exec(location.pathname)?.[1];
          ws.openCreateTask({ projectKey: key });
        }
      } else if (e.key === "[") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ws, navigate, location.pathname, setCollapsed]);

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main className="flex-1 min-w-0 h-full overflow-hidden py-2 pr-2">
        <div className="h-full bg-surface rounded-xl overflow-hidden flex flex-col" style={{ boxShadow: "var(--shadow-card)" }}>
          <Outlet />
        </div>
      </main>
      {ws.activeTask && <TaskPanel key={ws.activeTask} taskRef={ws.activeTask} onClose={ws.closeTask} />}
      {ws.createTaskState && <CreateTaskModal defaults={ws.createTaskState} onClose={ws.closeCreateTask} />}
      {ws.paletteOpen && <CommandPalette onClose={() => ws.setPaletteOpen(false)} />}
      {ws.shortcutsOpen && <ShortcutsDialog onClose={() => ws.setShortcutsOpen(false)} />}
      <ConfirmHost />
    </div>
  );
}

export default function AppLayout() {
  return (
    <WorkspaceProvider>
      <Shell />
    </WorkspaceProvider>
  );
}
