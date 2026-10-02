// src/context/WorkspaceContext.jsx
// Workspace-wide state: projects, people, unread count, and app-level actions (open task, create task, palette).
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";

const WorkspaceContext = createContext(null);
export const useWorkspace = () => useContext(WorkspaceContext);

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [people, setPeople] = useState([]);
  const [unread, setUnread] = useState(0);
  const [kbStatus, setKbStatus] = useState({ ai: false, engine: "local" });
  // Bumped whenever a task changes anywhere so lists can refetch
  const [taskVersion, setTaskVersion] = useState(0);
  const [createTaskState, setCreateTaskState] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const refreshProjects = useCallback(async () => {
    try {
      setProjects(await api("/projects"));
    } finally {
      setProjectsLoaded(true);
    }
  }, []);
  const refreshPeople = useCallback(async () => setPeople(await api("/users")), []);
  const refreshUnread = useCallback(async () => {
    try {
      const { unread: n } = await api("/notifications/unread-count");
      setUnread(n);
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    refreshProjects();
    refreshPeople().catch(() => {});
    refreshUnread();
    api("/memories/status").then(setKbStatus).catch(() => {});
    const t = setInterval(refreshUnread, 30000);
    return () => clearInterval(t);
  }, [user, refreshProjects, refreshPeople, refreshUnread]);

  const taskChanged = useCallback(() => {
    setTaskVersion((v) => v + 1);
    refreshProjects();
  }, [refreshProjects]);

  const openTask = useCallback(
    (ref) =>
      setParams(
        (p) => {
          const next = new URLSearchParams(p);
          next.set("task", ref);
          return next;
        },
        { replace: false }
      ),
    [setParams]
  );
  const closeTask = useCallback(
    () =>
      setParams((p) => {
        const next = new URLSearchParams(p);
        next.delete("task");
        return next;
      }),
    [setParams]
  );

  const projectByKey = useCallback((key) => projects.find((p) => p.key === key), [projects]);
  const creatableProjects = useMemo(() => projects.filter((p) => p.can?.createTask && p.status !== "archived"), [projects]);
  const canApproveAnywhere = useMemo(() => projects.some((p) => p.can?.approve), [projects]);

  const value = useMemo(
    () => ({
      projects,
      projectsLoaded,
      projectByKey,
      creatableProjects,
      canApproveAnywhere,
      refreshProjects,
      people,
      refreshPeople,
      unread,
      setUnread,
      refreshUnread,
      kbStatus,
      taskVersion,
      taskChanged,
      activeTask: params.get("task"),
      openTask,
      closeTask,
      createTaskState,
      openCreateTask: (defaults = {}) => setCreateTaskState(defaults),
      closeCreateTask: () => setCreateTaskState(null),
      paletteOpen,
      setPaletteOpen,
      shortcutsOpen,
      setShortcutsOpen,
    }),
    [
      projects,
      projectsLoaded,
      projectByKey,
      creatableProjects,
      canApproveAnywhere,
      refreshProjects,
      people,
      refreshPeople,
      unread,
      refreshUnread,
      kbStatus,
      taskVersion,
      taskChanged,
      params,
      openTask,
      closeTask,
      createTaskState,
      paletteOpen,
      shortcutsOpen,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
