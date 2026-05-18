// src/MainApp.jsx
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "./Components/Sidebar";
import InProgress from "./Components/InProgress";
import PendingApproval from "./Components/PendingApproval";
import Calendar from "./Components/Calendar";
import Kanban from "./Components/Kanban";
import Inbox from "./Components/Inbox";
import Dashboard from "./Components/Dashboard";

import { IoIosArrowForward } from "react-icons/io";
import { FiUser } from "react-icons/fi";
import { IoLogOutOutline } from "react-icons/io5";
import { CiViewTable } from "react-icons/ci";
import { LuCalendar } from "react-icons/lu";
import { HiOutlineCollection, HiOutlineFolder } from "react-icons/hi";
import { TbProgress, TbHourglassEmpty } from "react-icons/tb";
import { FiPlus } from "react-icons/fi";

import { useAuth } from "./context/AuthContext";

const MainApp = () => {
  const [view, setView] = useState("spreadsheet");
  const [projectId, setProjectId] = useState(null);
  const [moduleId, setModuleId] = useState(null);
  const [taskGroupId, setTaskGroupId] = useState(null);
  const [projectName, setProjectName] = useState("Select a project");
  const [moduleName, setModuleName] = useState("");
  const [taskGroupName, setTaskGroupName] = useState("");

  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = currentUser?.role === "admin";
  const isProjectManager = currentUser?.role === "projectManager";
  const canAssignTasks = isAdmin || isProjectManager;

  const handleSelect = useCallback((projId, modId, groupId, projName, modName, groupTitle) => {
    setProjectId(projId);
    setModuleId(modId);
    setTaskGroupId(groupId);
    setProjectName(projName);
    setModuleName(modName);
    setTaskGroupName(groupTitle);
    setView("spreadsheet");
  }, []);

  const handleInboxClick = () => {
    setView("inbox");
    setProjectId(null);
    setProjectName("Inbox");
    setModuleName("");
    setTaskGroupName("");
  };

  const handleDashboardClick = () => {
    setView("dashboard");
    setProjectId(null);
    setProjectName("Dashboard");
    setModuleName("");
    setTaskGroupName("");
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const viewTabs = [
    { mode: "spreadsheet", icon: CiViewTable, label: "Spreadsheet" },
    { mode: "calendar", icon: LuCalendar, label: "Calendar" },
    { mode: "kanban", icon: HiOutlineCollection, label: "Kanban" },
  ];

  const roleBadge = {
    admin: { container: "bg-indigo-100 text-indigo-800" },
    projectManager: { container: "bg-amber-100 text-amber-800" },
    teamMember: { container: "bg-green-100 text-green-800" },
  };

  const currentRole = currentUser?.role || "teamMember";
  const badgeStyle = roleBadge[currentRole] || roleBadge.teamMember;

  // Full name for display
  const fullName = currentUser 
    ? `${currentUser.firstName} ${currentUser.lastName}` 
    : "User";

  return (
    <div className="flex bg-neutral-200 min-h-screen sf-regular tracking-tight">
      <Sidebar
        onSelect={handleSelect}
        onInboxClick={handleInboxClick}
        onDashboardClick={handleDashboardClick}
      />

      <div className="flex-1 flex justify-center p-4 ps-0 max-w-[82%]">
        <div className="w-full h-[94vh] bg-white rounded-lg flex flex-col overflow-hidden">
          {view === "inbox" ? (
            <div className="flex-1 h-full">
              <Inbox />
            </div>
          ) : view === "dashboard" ? (
            <div className="flex-1 h-full">
              <Dashboard />
            </div>
          ) : (
            <>
              {/* HEADER */}
              <div className="shrink-0 p-6 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm ps-2">
                    <HiOutlineFolder size={20} strokeWidth={1.5} />
                    <span>{projectName}</span>
                    {moduleName && (
                      <>
                        <IoIosArrowForward size={14} />
                        <span>{moduleName}</span>
                      </>
                    )}
                    {taskGroupName && (
                      <>
                        <IoIosArrowForward size={14} />
                        <span className="text-xs">{taskGroupName}</span>
                      </>
                    )}
                  </div>

                  {/* USER INFO + ROLE + LOGOUT */}
                  <div className="flex items-center gap-3">
                    {/* Logged-in Username */}
                    <div className="flex items-center gap-2 text-sm">
                      <FiUser size={18} className="text-neutral-600" />
                      <span className="font-medium text-neutral-800">{fullName}</span>
                    </div>

                    {/* Role Badge */}
                    <div
                      className={`px-3 py-1 flex items-center gap-1.5 rounded text-sm ${badgeStyle.container} capitalize`}
                    >
                      {currentRole === "projectManager" ? "Manager" : currentRole}
                    </div>

                    {/* Logout Button */}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1.5 text-sm px-3 py-1 rounded border border-neutral-300 hover:bg-neutral-100 transition text-neutral-700"
                    >
                      <IoLogOutOutline size={18} />
                      Logout
                    </button>
                  </div>
                </div>

                <hr className="my-4 opacity-15" />

                {/* VIEW TABS */}
                <div className="flex text-sm bg-neutral-200 w-fit rounded-md">
                  {viewTabs.map(({ mode, icon: Icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => setView(mode)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-md ${
                        view === mode
                          ? "bg-white border border-neutral-300 text-black"
                          : "text-neutral-600 hover:bg-neutral-300"
                      }`}
                    >
                      <Icon
                        size={mode === "calendar" || mode === "kanban" ? 17 : 19}
                        strokeWidth={mode === "spreadsheet" ? 0.3 : 1.5}
                      />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* MAIN CONTENT */}
              <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
                {!projectId ? (
                  <div className="flex flex-col items-center justify-center h-full text-neutral-500 sf-regular">
                    <p className="text-lg mb-3">No project selected</p>
                    <p className="text-lg">Pick one from the sidebar to get started</p>
                  </div>
                ) : (
                  <>
                    {view === "spreadsheet" && (
                      <div className="flex flex-col gap-6">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1 text-sm p-1 px-2 rounded-md border border-amber-700/40 text-amber-900 bg-amber-500/15">
                              <TbProgress size={16} />
                              In Progress
                            </div>
                            {canAssignTasks && projectId && moduleId && (
                              <button
                                onClick={() => {
                                  const event = new CustomEvent("openAssignModal", {
                                    detail: { projectId, moduleId },
                                  });
                                  window.dispatchEvent(event);
                                }}
                                className="bg-white text-black text-sm ps-2 pe-3 py-1 border border-neutral-300 rounded-md flex items-center gap-1 hover:bg-neutral-100 transition"
                              >
                                <FiPlus size={16} strokeWidth={1.5} />
                                Assign Tasks
                              </button>
                            )}
                          </div>
                          <div className="overflow-x-auto rounded-lg border border-neutral-200">
                            <InProgress
                              projectId={projectId}
                              moduleId={moduleId}
                              taskGroupId={taskGroupId}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-1 text-sm p-1 px-2 mb-3 rounded-md border border-purple-700/40 text-purple-900 bg-purple-500/15 w-fit">
                            <TbHourglassEmpty size={16} />
                            Pending Approval
                          </div>
                          <div className="overflow-x-auto rounded-lg border border-neutral-200">
                            <PendingApproval
                              projectId={projectId}
                              moduleId={moduleId}
                              taskGroupId={taskGroupId}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {view === "calendar" && (
                      <Calendar projectId={projectId} moduleId={moduleId} taskGroupId={taskGroupId} />
                    )}

                    {view === "kanban" && (
                      <Kanban projectId={projectId} moduleId={moduleId} taskGroupId={taskGroupId} />
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainApp;