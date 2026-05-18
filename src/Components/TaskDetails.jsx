// src/Components/TaskDetails.jsx

import React, { useState, useEffect } from "react";
import {
  LuPaperclip,
  LuMessageSquare,
  LuDownload,
  LuFileText,
} from "react-icons/lu";
import { IoIosArrowForward } from "react-icons/io";
import { HiXMark } from "react-icons/hi2";
import { useAuth } from "../context/AuthContext";
import { HiOutlineFolder } from "react-icons/hi";

const TaskDetails = ({ task, onClose }) => {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState("attachments");

  useEffect(() => {
    const handleEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!task) return null;

  const priorityColors = {
    Urgent: {
      bg: "bg-red-100",
      text: "text-red-700",
      dot: "bg-red-700",
    },
    Normal: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      dot: "bg-amber-700",
    },
    Low: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      dot: "bg-emerald-700",
    },
  };

  const p = priorityColors[task.priority] || priorityColors.Normal;

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "—";

  const assignee = task.assignee;
  const hasAssignee = !!assignee;

  const getInitials = (user) => {
    if (!user) return "?";
    return `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "?";
  };

  // Neutral Avatar Helper
  const NeutralAvatar = ({ user, size = 32 }) => {
    const initials = getInitials(user);
    return (
      <div
        className="bg-neutral-300 text-neutral-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {initials}
      </div>
    );
  };

  const fakeAttachments = [
    {
      id: 1,
      name: "design_mockup_v2.fig",
      type: "Figma",
      size: "2.4 MB",
      user: "Alex",
      time: "2h ago",
    },
    {
      id: 2,
      name: "user_flow.pdf",
      type: "PDF",
      size: "890 KB",
      user: "Sarah",
      time: "yesterday",
    },
  ];

  const realComments = [
    {
      user: task.assignee || { firstName: "Michael", lastName: "Davis" },
      text: "This looks solid! Just waiting on the API keys from backend.",
      time: "1h ago",
      isYou: false,
    },
    {
      user: currentUser || { firstName: "You", lastName: "" },
      text: "On it! Pushing the changes in 10 🚀",
      time: "30min ago",
      isYou: true,
    },
    {
      user: { firstName: "Sarah", lastName: "Johnson" },
      text: "Can we bump priority to Urgent? Client wants this by EOD.",
      time: "2h ago",
      isYou: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-lg bg-white flex flex-col h-full border-l border-black/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between pt-6 pb-2 border-b border-neutral-300 mx-6">
          <div className="flex items-center gap-2 text-sm">
            <HiOutlineFolder size={20} strokeWidth={1.5} />
            <span>{task.moduleId?.name || "Module"}</span>
            <IoIosArrowForward size={12} />
            <span className="truncate max-w-[200px]">{task.name}</span>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full transition"
          >
            <HiXMark size={18} className="text-black" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll px-6 pt-6 pb-8">
          {/* META SECTION */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center">
              <span className="text-sm text-neutral-500 w-28 shrink-0">Status</span>
              <span className="px-2 py-1 text-sm border border-neutral-200 rounded-lg">
                {task.status}
              </span>
            </div>

            <div className="flex items-center">
              <span className="text-sm text-neutral-500 w-28 shrink-0">Due Date</span>
              <div className="flex items-center gap-2 text-sm">
                <span>{formatDate(task.dueDate)}</span>
              </div>
            </div>

            <div className="flex items-center">
              <span className="text-sm text-neutral-500 w-28 shrink-0">Priority</span>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm ${p.bg} ${p.text}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                {task.priority}
              </div>
            </div>

            <div className="flex items-center">
              <span className="text-sm text-neutral-500 w-28 shrink-0">Assignee</span>
              <div className="flex items-center gap-3">
                {hasAssignee ? (
                  <>
                    <NeutralAvatar user={assignee} size={32} />
                    <span className="text-sm">
                      {assignee.firstName} {assignee.lastName || ""}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-neutral-500">Unassigned</span>
                )}
              </div>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="mb-10">
            <p className="text-sm text-neutral-500 mb-2">Description</p>
            <div className="bg-neutral-100 border border-neutral-200 p-3 rounded-xl text-sm leading-relaxed">
              {task.description || "No description provided."}
            </div>
          </div>

          {/* TABS */}
          <div className="border-t border-neutral-200 pt-6">
            {/* TAB HEADER */}
            <div className="relative inline-flex border-b border-neutral-200 mb-6">
              {/* Sliding Bottom Border */}
              <span
                className={`absolute bottom-0 h-[2px] bg-black transition-all duration-400 ease-in-out ${
                  activeTab === "attachments"
                    ? "left-0 w-[150px]"
                    : "left-[150px] w-[150px]"
                }`}
              />

              {/* ATTACHMENTS TAB */}
              <button
                onClick={() => setActiveTab("attachments")}
                className={`relative px-3 pb-3 text-sm flex items-center gap-2 transition-colors duration-300 ${
                  activeTab === "attachments" ? "text-black" : "text-neutral-500"
                }`}
              >
                <LuPaperclip size={15} />
                Attachments
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full transition-all duration-300 ${
                    activeTab === "attachments" ? "bg-black text-white" : "bg-neutral-200"
                  }`}
                >
                  {fakeAttachments.length}
                </span>
              </button>

              {/* COMMENTS TAB */}
              <button
                onClick={() => setActiveTab("comments")}
                className={`relative px-3 pb-3 text-sm flex items-center gap-2 transition-colors duration-300 ${
                  activeTab === "comments" ? "text-black" : "text-neutral-500"
                }`}
              >
                <LuMessageSquare size={15} />
                Comments
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full transition-all duration-300 ${
                    activeTab === "comments" ? "bg-black text-white" : "bg-neutral-200"
                  }`}
                >
                  {realComments.length}
                </span>
              </button>
            </div>

            {/* ATTACHMENTS TAB CONTENT */}
            {activeTab === "attachments" && (
              <div className="space-y-3">
                {fakeAttachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 bg-neutral-200 rounded-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-lg">
                        <LuFileText size={22} className="text-neutral-700" />
                      </div>
                      <div>
                        <p className="text-sm">{file.name}</p>
                        <p className="text-xs text-neutral-500">
                          {file.type} • {file.size}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span>
                        {file.user} • {file.time}
                      </span>
                      <button className="p-2 hover:bg-white rounded-xl transition">
                        <LuDownload size={18} className="text-black" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* COMMENTS TAB CONTENT */}
            {activeTab === "comments" && (
              <div className="space-y-4">
                {realComments.map((c, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${c.isYou ? "flex-row-reverse" : ""}`}
                  >
                    <NeutralAvatar user={c.user} size={32} />

                    <div className={c.isYou ? "text-right" : ""}>
                      <div
                        className={`inline-block px-3 py-2 rounded-lg max-w-xs text-sm ${
                          c.isYou ? "bg-black text-white" : "bg-neutral-100"
                        }`}
                      >
                        {c.text}
                      </div>
                      <p className="text-xs text-neutral-500 mt-1.5">
                        {c.isYou
                          ? "You"
                          : `${c.user.firstName} ${c.user.lastName || ""}`}{" "}
                        • {c.time}
                      </p>
                    </div>
                  </div>
                ))}

                {/* COMMENT INPUT */}
                <div className="flex gap-3 pt-4">
                  <NeutralAvatar user={currentUser} size={32} />
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 bg-neutral-200 rounded-lg text-sm focus:outline-none focus:border-black placeholder-neutral-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetails;