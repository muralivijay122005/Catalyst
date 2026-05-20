// src/Components/Dashboard.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchProjects, fetchUsers } from "../BACKEND/utils/api";
import { TfiMenuAlt } from "react-icons/tfi";
import { LuUser } from "react-icons/lu";
import { TbProgressHelp } from "react-icons/tb";
import { RxDashboard } from "react-icons/rx";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGlobalTasks = async () => {
    const token = localStorage.getItem("token");
    if (!token) return [];
    try {
      const res = await fetch("http://localhost:5000/api/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error("Failed to fetch tasks globally", err);
    }
    return [];
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [projData, userData, taskData] = await Promise.all([
          fetchProjects(),
          fetchUsers(),
          fetchGlobalTasks(),
        ]);
        setProjects(projData || []);
        setUsers(userData || []);
        setTasks(taskData || []);
      } catch (err) {
        console.error("Error loading dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const currentUserId = currentUser?._id?.toString() || currentUser?.id?.toString();

  const totalProjects = projects.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const ongoingTasks = tasks.filter((t) => t.status === "Ongoing").length;
  const pendingTasks = tasks.filter((t) =>
    ["Pending", "Not Started", "Pending Approval"].includes(t.status)
  ).length;

  const myTasks = tasks.filter((t) => {
    const assigneeId =
      t.assignee?._id?.toString() ||
      t.assignee?.id?.toString() ||
      t.assignee?.toString();
    return assigneeId === currentUserId;
  });

  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const safeCompletionRate = Math.min(completionRate, 100);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center h-full bg-neutral-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-200 border-t-neutral-800" />
        <p className="text-sm mt-4 tracking-tight">Loading Dashboard</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col sf-regular text-sm bg-neutral-100 h-full overflow-hidden p-6 lg:p-8 tracking-tight select-none">
      {/* Header */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-neutral-300">
        <div className="flex items-center gap-2">
          <RxDashboard size={16}/>
          <h1 className="tracking-tight">Dashboard</h1>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm bg-white rounded-lg px-4 py-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-600"></span>
            <span>Projects</span>
            <span>{totalProjects}</span>
          </div>
          <div className="h-3 bg-neutral-200 hidden sm:block"></div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            <span>Ongoing</span>
            <span>{ongoingTasks}</span>
          </div>
          <div className="h-3 bg-neutral-200 hidden sm:block"></div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <span>Completed</span>
            <span>{completedTasks}/{totalTasks}</span>
          </div>
          <div className="h-3 bg-neutral-200 hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <span>Progress</span>
            <div className="flex items-center gap-1.5">
              <div className="w-16 bg-neutral-100 h-1 overflow-hidden">
                <div
                  className="bg-black h-full transition-all duration-700"
                  style={{ width: `${safeCompletionRate}%` }}
                ></div>
              </div>
              <span>{safeCompletionRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN - My Tasks */}
        <div className="lg:col-span-8 bg-white rounded-lg p-5 flex flex-col h-full overflow-hidden">
          <div className="shrink-0 flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 border border-amber-800/30 text-amber-800 bg-amber-600/15 px-2 py-0.5 rounded-md">
              <TfiMenuAlt size={15} />
              <h2>Tasks Assigned to Me</h2>
            </div>
            <p className="text-xs text-neutral-900 bg-neutral-500/15 px-1.5 py-1 rounded-full">{myTasks.length}</p>

          </div>

          <div className="flex-1 overflow-y-auto pr-1 custom-scroll-hidden">
            {myTasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400 py-12">
                <p className="text-sm text-neutral-500">All caught up! No tasks assigned.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {/* Table Header */}
                <div className="flex items-center py-2 px-3 text-sm text-neutral-500 border-b border-neutral-200 mb-2">
                  <div className="flex-1 min-w-0">Task Name</div>
                  <div className="w-44 shrink-0">Module</div>   {/* Increased width */}
                  <div className="w-24 shrink-0">Priority</div>
                  <div className="w-32 shrink-0">Status</div>
                </div>

                {/* Tasks List */}
                <div className="space-y-1">
                  {myTasks.map((task) => {
                    const isCompleted = task.status === "Completed";

                    return (
                      <div
                        key={task._id}
                        className="flex items-center p-3 py-1 hover:bg-neutral-100 rounded transition-all duration-200"
                      >
                        {/* Task Name - Slightly Reduced Width */}
                        <div className="flex-1 min-w-0 max-w-[38%]">
                          <p className="truncate">
                            {task.name}
                          </p>
                        </div>

                        {/* Module - Increased Width */}
                        <div className="w-44 shrink-0 text-neutral-600">
                          {task.moduleId?.name || "—"}
                        </div>

                        {/* Priority */}
                        <div className="w-24 shrink-0">
                          <span
                            className={`inline-flex items-center gap-1.5 text-sm px-2 py-0.5 rounded ${
                              task.priority === "Urgent"
                                ? "bg-red-600/15 text-red-800"
                                : task.priority === "Normal"
                                ? "bg-amber-600/15 text-amber-800"
                                : "bg-emerald-600/15 text-emerald-800"
                            }`}
                          >
                            <span
                              className={`h-1.25 w-1.25 rounded-full ${
                                task.priority === "Urgent"
                                  ? "bg-red-800"
                                  : task.priority === "Normal"
                                  ? "bg-amber-800"
                                  : "bg-emerald-800"
                              }`}
                            />
                            {task.priority}
                          </span>
                        </div>

                        {/* Status */}
                        <div className="w-32 shrink-0">
                          <span
                            className="text-sm px-2 py-1 rounded bg-blue-100 text-blue-700"
                          >
                            {task.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Unchanged as per your request */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full overflow-hidden">
          {/* Progress Breakdown Card */}
          <div className="shrink-0 bg-white rounded-lg p-5">
            <div className="flex justify-between">
              <h3 className="text-sm mb-4">Task Breakdown</h3>
              <TbProgressHelp size={18} />
            </div>

            <div className="space-y-3">
              {[
                { label: "Completed", count: completedTasks, color: "emerald" },
                { label: "Ongoing", count: ongoingTasks, color: "blue" },
                { label: "Pending", count: pendingTasks, color: "amber" },
              ].map((item, i) => {
                const pct = totalTasks > 0 ? Math.round((item.count / totalTasks) * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.label}</span>
                      <span className="text-neutral-600">
                        {item.count} tasks • {pct}%
                      </span>
                    </div>
                    <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-black transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team Members Card */}
          <div className="flex-1 min-h-0 bg-white rounded-lg p-5 flex flex-col overflow-hidden">
            <div className="shrink-0 flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm text-neutral-850">Team Members</h3>
              </div>
              <LuUser size={16} />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scroll-hidden">
              {users.map((u) => (
                <div key={u._id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-200 text-neutral-700 text-sm ">
                    {u.firstName?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {u.firstName} {u.lastName}
                    </p>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;