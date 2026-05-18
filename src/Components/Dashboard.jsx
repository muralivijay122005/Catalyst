// src/Components/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchProjects, fetchUsers } from "../BACKEND/utils/api";
import {
  HiOutlineFolder,
  HiOutlineClipboardList,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineUserGroup,
  HiOutlineCalendar
} from "react-icons/hi";

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
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 105) : 0;
  const safeCompletionRate = Math.min(completionRate, 100);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center h-full bg-neutral-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-200 border-t-neutral-800" />
        <p className="text-xs text-neutral-400 mt-3 tracking-tight">
          Loading workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col sf-regular text-sm bg-neutral-100 h-full overflow-hidden p-6 lg:p-8 sf-regular tracking-tight select-none">
      {/* Premium Minimal Header */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-neutral-300">
        <div>
          <h1 className="tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Welcome back, {currentUser?.firstName || "User"}. Here is an overview of the workspace.
          </p>
        </div>

        {/* Minimal Horizontal Metric Bar */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs bg-white rounded-lg px-4 py-2">
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
              <div className="w-16 bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${safeCompletionRate}%` }}
                ></div>
              </div>
              <span >{safeCompletionRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Content Layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN - My Tasks */}
        <div className="lg:col-span-8 bg-white rounded-lg p-5 flex flex-col h-full overflow-hidden">
          <div className="shrink-0 flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
            <div>
              <h3 className=" text-sm text-neutral-850">
                Assigned to Me
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Tasks allocated to your account • {myTasks.filter(t => t.status !== "Completed").length} pending
              </p>
            </div>
            <span className="text-[11px] bg-neutral-100 px-2.5 py-1 rounded-full text-neutral-500">
              {myTasks.length} total
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 custom-scroll">
            {myTasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400 py-12">
                
                <p className="text-xs text-neutral-500">All caught up! No tasks assigned.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myTasks.map((task) => {
                  const isCompleted = task.status === "Completed";
                  const isOverdue =
                    task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;

                  return (
                    <div
                      key={task._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5"
                        
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                          task.priority === "Urgent" ? "bg-red-500" :
                          task.priority === "Normal" ? "bg-amber-500" : "bg-emerald-500"
                        }`} />
                        
                        <div className="min-w-0 flex-1">
                          <p className={` text-neutral-800 truncate ${
                            isCompleted ? "text-neutral-400" : ""
                          }`}>
                            {task.name}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1">
                            <span className=" text-neutral-500">{task.moduleId?.name || "Module"}</span>
                            <span>•</span>
                            <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500 " : ""}`}>
                              <HiOutlineCalendar size={11} />
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No date"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 self-end sm:self-center">
                        <span className={`text-xs tracking-tight px-2 py-0.5 rounded ${
                          task.priority === "Urgent" ? "bg-red-50 text-red-700 " :
                          task.priority === "Normal" ? "bg-amber-50 text-amber-700" :
                          "bg-emerald-50 text-emerald-700 "
                        }`}>
                          {task.priority}
                        </span>

                        <span className={`text-xs px-2 py-0.5 rounded ${
                          isCompleted ? "bg-emerald-50 text-emerald-700 " :
                          task.status === "Ongoing" ? "bg-blue-50 text-blue-700 " :
                          "bg-neutral-50 text-neutral-600"
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Stats & Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full overflow-hidden">
          {/* Progress Breakdown Card */}
          <div className="shrink-0 bg-white rounded-lg border border-neutral-200/60 p-5">
            <h3 className="text-sm mb-0.5">
              Task Breakdown
            </h3>
            <p className="text-[11px] text-neutral-400 mb-4">
              Status distribution across team tasks
            </p>

            <div className="space-y-3">
              {[
                { label: "Completed", count: completedTasks, color: "emerald", pct: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0 },
                { label: "Ongoing", count: ongoingTasks, color: "blue", pct: totalTasks > 0 ? Math.round((ongoingTasks / totalTasks) * 100) : 0 },
                { label: "Pending", count: pendingTasks, color: "amber", pct: totalTasks > 0 ? Math.round((pendingTasks / totalTasks) * 100) : 0 },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{item.label}</span>
                    <span className="text-[11px] text-neutral-400 ">{item.count} tasks • {item.pct}%</span>
                  </div>
                  <div className="h-1 bg-neutral-100 overflow-hidden">
                    <div
                      className={`h-full bg-${item.color}-500 transition-all`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Members Card */}
          <div className="flex-1 min-h-0 bg-white rounded-lg p-5 flex flex-col overflow-hidden">
            <div className="shrink-0 flex items-center justify-between mb-4">
              <div>
                <h3 className=" text-sm text-neutral-850">
                  Team Members
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Assigned members in database
                </p>
              </div>
              <HiOutlineUserGroup className="text-neutral-400" size={18} />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scroll">
              {users.map((u) => (
                <div key={u._id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-300/50 text-neutral-700 text-xs">
                    {u.firstName?.[0]?.toUpperCase() || "?"}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-800 truncate">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-[10px] text-neutral-400 capitalize">
                      {u.role === "projectManager" ? "Project Manager" : u.role}
                    </p>
                  </div>

                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
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