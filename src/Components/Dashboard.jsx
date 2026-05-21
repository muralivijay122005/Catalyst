// src/Components/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchProjects, fetchUsers } from "../BACKEND/utils/api";
import {
  FiUsers,
  FiInbox,
  FiTrendingUp,
} from "react-icons/fi";
import { LuChartLine } from "react-icons/lu";
import { IoIosTrendingUp, IoIosTrendingDown } from "react-icons/io";
import { RiPieChartLine } from "react-icons/ri";
import { GoCalendar } from "react-icons/go";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // States
  const [activeTab, setActiveTab] = useState("my-tasks"); // "my-tasks" | "all-tasks"
  const [chartMetric, setChartMetric] = useState("completion"); // "completion" | "velocity"
  const [hoveredDataPoint, setHoveredDataPoint] = useState(null);

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

  const completedMyTasksCount = myTasks.filter((t) => t.status === "Completed").length;
  const activeMyTasksCount = myTasks.filter((t) => t.status !== "Completed").length;
  const urgentMyTask = myTasks.find(
    (t) => t.priority === "Urgent" && t.status !== "Completed"
  ) || myTasks.find((t) => t.status !== "Completed");

  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const safeCompletionRate = Math.min(completionRate, 100);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // Sparkline history reacting dynamically to completion counts
  const historyDataPoints = [
    { label: "Mon", completion: 25, velocity: 15 },
    { label: "Tue", completion: 40, velocity: 28 },
    { label: "Wed", completion: 35, velocity: 42 },
    { label: "Thu", completion: 60, velocity: 58 },
    { label: "Fri", completion: Math.max(45, safeCompletionRate - 5), velocity: Math.max(50, safeCompletionRate - 10) },
    { label: "Sat", completion: Math.max(55, safeCompletionRate), velocity: Math.max(65, safeCompletionRate) }
  ];

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center h-full bg-slate-50">
        <div className="relative flex items-center justify-center">
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-neutral-300 border-t-black" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white h-full overflow-hidden p-5 lg:p-6 tracking-tight select-none">
      
      {/* 1. COMPACT ROW: HEADER & WORKSPACE INDEX */}
      <div className="shrink-0 flex items-center justify-between mb-4 pb-3 border-b border-neutral-200">
        <div>
          <h1 className="text-sm tracking-tight flex items-center gap-1.5">
            <LuChartLine size={16} />
            <span>Workspace Dashboard</span>            
          </h1>
        </div>
      </div>

      {/* 2. BODY LAYOUT - STRICT SINGLE SCREEN SYSTEM */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden">
        
        {/* ================= LEFT SECTION (col-span-8) ================= */}
        <div className="lg:col-span-8 flex flex-col gap-4 h-full min-h-0 overflow-hidden">
          
          {/* HIGH-FIDELITY COMPACT GRAPH SECTION */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shrink-0 h-[150px] flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm flex items-center gap-1.5">
                  <FiTrendingUp size={14}  />
                  <span>Activity & Velocity Trends</span>
                </h3>
              </div>

              {/* Chart Metric Segment Selector */}
              <div className="flex bg-neutral-200 rounded text-sm border border-neutral-300">
                <button
                  onClick={() => setChartMetric("completion")}
                  className={`px-2.5 py-0.5 rounded transition ${chartMetric === "completion" ? "bg-white" : "text-neutral-600"}`}
                >
                  Completion
                </button>
                <button
                  onClick={() => setChartMetric("velocity")}
                  className={`px-2.5 py-0.5 rounded transition ${chartMetric === "velocity" ? "bg-white" : "text-neutral-600"}`}
                >
                  Velocity Curve
                </button>
              </div>
            </div>

            {/* Sparkline Canvas */}
            <div className="relative w-full h-[95px] bg-slate-50/50 rounded-lg border border-slate-100 p-2 overflow-hidden">
              <svg viewBox="0 0 500 100" className="w-full h-full overflow-visible">
                <defs>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="#4F46E5" floodOpacity="0.2"/>
                  </filter>
                  <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.1"/>
                    <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                <line x1="0" y1="20" x2="500" y2="20" stroke="#E2E8F0" strokeWidth="0.75" strokeDasharray="3,3" />
                <line x1="0" y1="55" x2="500" y2="55" stroke="#E2E8F0" strokeWidth="0.75" strokeDasharray="3,3" />
                <line x1="0" y1="90" x2="500" y2="90" stroke="#E2E8F0" strokeWidth="0.75" strokeDasharray="3,3" />

                {/* Spline Area Fill */}
                <path
                  d={`M 0 100 
                      L 0 ${100 - historyDataPoints[0][chartMetric]} 
                      C 100 ${100 - historyDataPoints[1][chartMetric]}, 150 ${100 - historyDataPoints[2][chartMetric]}, 200 ${100 - historyDataPoints[2][chartMetric]}
                      C 250 ${100 - historyDataPoints[2][chartMetric]}, 300 ${100 - historyDataPoints[3][chartMetric]}, 350 ${100 - historyDataPoints[4][chartMetric]}
                      C 400 ${100 - historyDataPoints[4][chartMetric]}, 450 ${100 - historyDataPoints[5][chartMetric]}, 500 ${100 - historyDataPoints[5][chartMetric]}
                      L 500 100 Z`}
                  fill="url(#chart-grad)"
                />

                {/* Spline Stroke Line */}
                <path
                  d={`M 0 ${100 - historyDataPoints[0][chartMetric]} 
                      C 100 ${100 - historyDataPoints[1][chartMetric]}, 150 ${100 - historyDataPoints[2][chartMetric]}, 200 ${100 - historyDataPoints[2][chartMetric]}
                      C 250 ${100 - historyDataPoints[2][chartMetric]}, 300 ${100 - historyDataPoints[3][chartMetric]}, 350 ${100 - historyDataPoints[4][chartMetric]}
                      C 400 ${100 - historyDataPoints[4][chartMetric]}, 450 ${100 - historyDataPoints[5][chartMetric]}, 500 ${100 - historyDataPoints[5][chartMetric]}`}
                  fill="none"
                  stroke="#4F46E5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  filter="url(#glow)"
                />

                {/* Nodes */}
                {historyDataPoints.map((pt, idx) => {
                  const x = idx * 100;
                  const y = 100 - pt[chartMetric];
                  const isHovered = hoveredDataPoint === idx;
                  
                  return (
                    <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredDataPoint(idx)} onMouseLeave={() => setHoveredDataPoint(null)}>
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? "4.5" : "3"}
                        fill={isHovered ? "#4F46E5" : "white"}
                        stroke="#4F46E5"
                        strokeWidth="1.5"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Chart Tooltips */}
              {hoveredDataPoint !== null && (
                <div className="absolute bg-black text-white rounded-lg p-1.5 text-xs z-20 pointer-events-none select-none"
                     style={{ left: `${hoveredDataPoint * 18 + 4}%`, top: "5%" }}>
                  <div className="text-neutral-400 uppercase">{historyDataPoints[hoveredDataPoint].label}</div>
                  <div >{chartMetric === "completion" ? "Completion" : "Velocity"}: {historyDataPoints[hoveredDataPoint][chartMetric]}%</div>
                </div>
              )}
            </div>
          </div>

          {/* ASSIGNED TO ME & ALL TEAM TASKS SECTION (Scrolling is strictly internal) */}
          <div className="flex-1 bg-white rounded-xl border border-neutral-200 p-4 flex flex-col overflow-hidden shadow-sm min-h-0">
            
            <div className="shrink-0 flex items-center justify-between mb-3 select-none">
              
              {/* Tab Navigation segmented controllers */}
              <div className="flex bg-neutral-200 rounded text-sm border border-neutral-300">
                <button
                  onClick={() => setActiveTab("my-tasks")}
                  className={`px-2.5 py-0.5 rounded transition ${activeTab === "my-tasks" ? "bg-white" : "text-neutral-600"}`}
                >
                  Assigned to Me
                </button>
                <button
                  onClick={() => setActiveTab("all-tasks")}
                  className={`px-2.5 py-0.5 rounded transition ${activeTab === "all-tasks" ? "bg-white" : "text-neutral-600 "}`}
                >
                  All Team Tasks
                  </button>
              </div>

              {/* Status details */}
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-600"></span>Ongoing: {ongoingTasks}</span>
                <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-600"></span>Done: {completedTasks}</span>
              </div>
            </div>

            {/* Scrolling inside the list only */}
            <div className="flex-1 overflow-y-auto pr-1 custom-scroll-hidden select-text min-h-0">
              {((activeTab === "my-tasks" ? myTasks : tasks).length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center py-12 text-center select-none">
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200/50 flex items-center justify-center text-slate-300 mb-2 shadow-sm">
                    <FiInbox size={18} />
                  </div>
                  <h4 className="text-sm">No Action Items Found</h4>
                  <p className="text-sm mt-0.5 max-w-[180px]">
                    Desk clean! All task deliverables completed.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col">
                  
                  {/* Row headers */}
                  <div className="flex items-center py-1.5 px-3 text-sm text-neutral-600 border-b border-neutral-200 mb-2.5 select-none ">
                    <div className="flex-1 min-w-0 pr-4 text-left">Task Description</div>
                    <div className="w-40 shrink-0 text-left">Module Scope</div>
                    <div className="w-24 shrink-0 text-left ps-2">Due Date</div>
                    <div className="w-24 shrink-0 text-left ps-4">Priority</div>
                    <div className="w-24 shrink-0 text-left ps-2">Status</div>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-1">
                    {(activeTab === "my-tasks" ? myTasks : tasks).map((task) => {
                      const isCompleted = task.status === "Completed";
                      const isUrgent = task.priority === "Urgent";
                      const isNormal = task.priority === "Normal";

                      let priorityStyle = "border-neutral-200 text-neutral-800 bg-neutral-600/15";
                      let priorityDot = "bg-neutral-800";
                      if (isUrgent) {
                        priorityStyle = "border-red-200 text-red-800 bg-red-600/15";
                        priorityDot = "bg-red-800";
                      } else if (isNormal) {
                        priorityStyle = "border-amber-200 text-amber-800 bg-amber-600/15";
                        priorityDot = "bg-amber-800";
                      } else {
                        priorityStyle = "border-green-200 text-green-800 bg-green-600/15";
                        priorityDot = "bg-green-800";
                      }

                      let statusStyle = "text-neutral-800 bg-neutral-600/15";
                      if (task.status === "Completed") statusStyle = "text-green-800 bg-green-600/15";
                      else if (task.status === "Ongoing") statusStyle = "text-blue-800 bg-blue-600/15";
                      else if (task.status === "Pending") statusStyle = "text-amber-800 bg-amber-600/15";
                      else if (task.status === "Pending Approval") statusStyle = "text-indigo-800 bg-indigo-600/15";

                      return (
                        <div
                          key={task._id}
                          className="group flex items-center p-2.5 py-1.5 bg-white hover:bg-neutral-200 rounded transition"
                        >
                          {/* Title */}
                          <div className="flex-1 min-w-0 pr-4 text-left">
                            <p className="text-sm truncate transition flex items-center gap-1.5" title={task.name}>
                              <span className="truncate">{task.name}</span>
                            </p>
                          </div>

                          {/* Module scope */}
                          <div className="w-40 shrink-0 text-sm text-left truncate flex items-center gap-1" title={task.moduleId?.name || "Global Scope"}>
                            <span className="truncate">{task.moduleId?.name || "Global Scope"}</span>
                          </div>

                          {/* Due Date */}
                          <div className="w-24 shrink-0 flex items-center justify-start ps-2 gap-1 text-sm text-left">
                            <GoCalendar size={14} strokeWidth={0.25}/>
                            <span>{formatDate(task.dueDate)}</span>
                          </div>

                          {/* Priority Pill */}
                          <div className="w-24 shrink-0 flex items-center justify-start ps-4 text-left">
                            <span className={`inline-flex items-center gap-1 text-sm px-1.5 rounded ${priorityStyle}`}>
                              <span className={`h-1 w-1 rounded-full ${priorityDot}`} />
                              {task.priority}
                            </span>
                          </div>

                          {/* Status Pill */}
                          <div className="w-24 shrink-0 flex items-center justify-start ps-2 text-left">
                            <span className={`text-sm px-1.5 rounded ${statusStyle}`}>
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

        </div>

        {/* ================= RIGHT SECTION (col-span-4) ================= */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full min-h-0 overflow-hidden">
          
          {/* ================= UPDATED PORTFOLIO PULSE SECTION ================= */}
          <div className="rounded-xl border border-neutral-200 p-4 shrink-0 h-[150px] flex flex-col justify-between">
            
            <div className="flex items-center justify-between">
              <h3 className="text-sm flex items-center gap-1.5">
                <RiPieChartLine size={16} />
                <span>Project Status</span>
              </h3>
              <span className="text-sm text-neutral-500">{totalProjects} Total Projects</span>
            </div>

{/* Clean Split Stats */}
<div className="grid grid-cols-3 divide-x divide-neutral-200 h-full mt-2">

  {/* Ongoing */}
  <div className="flex flex-col justify-center px-4">
    <span className="text-sm text-neutral-500 mb-1">
      Ongoing
    </span>

    <div className="flex items-center gap-2">
      <span className="text-2xl">
        {ongoingTasks}
      </span>

      <span className="text-xs flex flex-row gap-1 items-center px-1 py-0.5 rounded bg-green-100 text-green-800 ">
        <IoIosTrendingUp />
        2%
      </span>
    </div>
  </div>

  {/* Completed */}
  <div className="flex flex-col justify-center px-4">
    <span className="text-sm text-neutral-500 mb-1">
      Completed
    </span>

    <div className="flex items-center gap-2">
      <span className="text-2xl">
        {completedTasks}
      </span>

      <span className="text-xs flex flex-row gap-1 items-center px-1 py-0.5 rounded bg-green-100 text-green-800 ">
        <IoIosTrendingUp />
        8%
      </span>
    </div>
  </div>

  {/* Pending */}
  <div className="flex flex-col justify-center px-4">
    <span className="text-sm text-neutral-500 mb-1">
      Pending
    </span>

    <div className="flex items-center gap-2">
      <span className="text-2xl">
        {pendingTasks}
      </span>

      <span className="text-xs flex flex-row gap-1 items-center px-1 py-0.5 rounded bg-red-100 text-red-800 ">
        <IoIosTrendingDown />
        1%
      </span>
    </div>
  </div>
</div>
</div>

          {/* ACTIVE TEAM DIRECTORY (Scrolling is strictly internal) */}
          <div className="flex-1 min-h-0 bg-white rounded-xl border border-neutral-200 p-4 flex flex-col overflow-hidden">
            
            <div className="shrink-0 flex items-center justify-between mb-3 pb-2 select-none">
              <h3 className="flex items-center text-sm gap-1.5">
                <FiUsers size={13} />
                <span>Team Directory</span>
              </h3>
              <span className="text-xs border border-neutral-200 px-2 py-0.5 rounded">{users.length} Active</span>
            </div>

            {/* Scrollable List container */}
            <div className="flex-1 overflow-y-auto space-y-2.5  select-text min-h-0 custom-scroll-hidden">
              {users.map((u) => {
                const avatarStyles = "bg-neutral-200 text-neutral-600";
                
                let jobTitle = "Member";
                if (u.role === "admin") jobTitle = "Admin";
                else if (u.role === "projectManager") jobTitle = "Manager";

                return (
                  <div key={u._id} className="group flex items-center gap-2.5">
                    {/* Avatar with Online Indicator */}
<div className="relative shrink-0">
  <div
    className={`w-7.5 h-7.5 rounded-full flex items-center justify-center text-sm select-none shadow-sm transition group-hover:scale-105 duration-150 ${avatarStyles}`}
  >
    {u.firstName?.[0] || "?"}
  </div>

  {/* Online Dot */}
  <span className="absolute top-5 left-5 w-3 h-3 bg-green-600 border-2 border-white rounded-full " />
</div>

                    {/* Name & Job */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm  truncate transition">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {jobTitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;