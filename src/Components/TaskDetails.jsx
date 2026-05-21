// src/Components/TaskDetails.jsx

import React, { useState, useEffect } from "react";
import {
  LuPaperclip,
  LuMessageSquare,
  LuDownload,
} from "react-icons/lu";
import { FiArrowUpRight } from "react-icons/fi";
import { IoIosArrowForward } from "react-icons/io";
import { HiXMark } from "react-icons/hi2";
import { useAuth } from "../context/AuthContext";
import { HiOutlineFolder } from "react-icons/hi";
import { AiOutlineFileText } from "react-icons/ai";

const TaskDetails = ({ task, onClose }) => {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState("attachments");

  useEffect(() => {
    const handleEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!task) return null;



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
  const NeutralAvatar = ({ user, size = 28 }) => {
    const initials = getInitials(user);
    return (
      <div
        className="bg-neutral-300 text-neutral-800 rounded-full flex items-center justify-center text-xs "
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {initials}
      </div>
    );
  };

  const attachments = task.attachments || [];

  const [comments, setComments] = useState(() => {
    if (task.comments && task.comments.length > 0) {
      return task.comments;
    }
    const saved = localStorage.getItem(`comments_${task._id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
  });

  // Sync state if task prop changes
  useEffect(() => {
    if (task.comments) {
      setComments(task.comments);
    } else {
      const saved = localStorage.getItem(`comments_${task._id}`);
      if (saved) {
        try {
          setComments(JSON.parse(saved));
        } catch (e) {
          setComments([]);
        }
      } else {
        setComments([]);
      }
    }
  }, [task._id, task.comments]);

  // Database persistence function
  const saveCommentsToDb = async (updatedComments) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      await fetch(`http://localhost:5000/api/tasks/${task._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comments: updatedComments }),
      });
    } catch (err) {
      console.error("Failed to save comments to database:", err);
    }
  };

  useEffect(() => {
    localStorage.setItem(`comments_${task._id}`, JSON.stringify(comments));
  }, [comments, task._id]);

  const [commentInput, setCommentInput] = useState("");

  const handleSendComment = () => {
    if (!commentInput.trim()) return;
    const newComment = {
      id: Date.now().toString(),
      user: currentUser || { firstName: "You", lastName: "" },
      text: commentInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isYou: true,
      reactions: {},
    };
    const updated = [...comments, newComment];
    setComments(updated);
    saveCommentsToDb(updated);
    setCommentInput("");
  };

  const handleToggleReaction = (commentId, emoji) => {
    const updated = comments.map((c) => {
      if (c.id !== commentId) return c;
      const currentReactions = c.reactions || {};
      const userHasReacted = currentReactions[emoji]?.includes(currentUser?._id || "me");

      const updatedUsers = userHasReacted
        ? (currentReactions[emoji] || []).filter((u) => u !== (currentUser?._id || "me"))
        : [...(currentReactions[emoji] || []), (currentUser?._id || "me")];

      return {
        ...c,
        reactions: {
          ...currentReactions,
          [emoji]: updatedUsers,
        },
      };
    });
    setComments(updated);
    saveCommentsToDb(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-md bg-white flex flex-col h-full border-l border-black/10 shadow-2xl"
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

        <div className="flex-1 overflow-y-auto custom-scroll-hidden px-6 pt-6 pb-8">
          {/* META SECTION */}
          <div className="space-y-4 mb-4">
            <div className="flex items-center">
              <span className="text-sm text-neutral-500 w-28 shrink-0">Status</span>
              <span className="text-sm text-black">
                {task.status}
              </span>
            </div>

            <div className="flex items-center">
              <span className="text-sm text-neutral-500 w-28 shrink-0">Due Date</span>
              <span className="text-sm text-black">
                {formatDate(task.dueDate)}
              </span>
            </div>

            <div className="flex items-center">
              <span className="text-sm text-neutral-500 w-28 shrink-0">Priority</span>
              <span className="text-sm text-black">
                {task.priority}
              </span>
            </div>

            <div className="flex items-center">
              <span className="text-sm text-neutral-500 w-28 shrink-0">Assignee</span>
              <span className="text-sm text-black">
                {hasAssignee
                  ? `${assignee.firstName} ${assignee.lastName || ""}`
                  : "Unassigned"}
              </span>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="mb-6">
            <p className="text-sm text-neutral-500 mb-4">Description</p>
            <div className="bg-neutral-200/60 p-3 rounded-lg text-sm tracking-tight leading-relaxed whitespace-pre-line">
              {task.description || "No description provided."}
            </div>
          </div>

          {/* TABS */}
          <div className="pt-6">
            {/* TAB HEADER */}
            <div className="relative flex border-b border-neutral-200 mb-6 w-full ">
              {/* Sliding Bottom Border */}
              <span
                className={`absolute bottom-0 h-[2px] bg-black transition-all duration-500 ease-in-out w-1/2 ${
                  activeTab === "attachments" ? "left-0" : "left-1/2"
                }`}
              />

              {/* ATTACHMENTS TAB */}
              <button
                onClick={() => setActiveTab("attachments")}
                className={`flex-1 pb-3 text-sm flex items-center justify-center gap-2 transition-all duration-500 ${
                  activeTab === "attachments" ? "text-black" : "text-neutral-500"
                }`}
              >
                <LuPaperclip size={15} />
                Attachments
              </button>

              {/* COMMENTS TAB */}
              <button
                onClick={() => setActiveTab("comments")}
                className={`flex-1 pb-3 text-sm flex items-center justify-center gap-2 transition-all duration-500 ${
                  activeTab === "comments" ? "text-black" : "text-neutral-500"
                }`}
              >
                <LuMessageSquare size={15} />
                Comments
              </button>
            </div>

            {/* ATTACHMENTS TAB CONTENT */}
            {activeTab === "attachments" && (
              <div className="space-y-3">
                {attachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 py-1 bg-indigo-600/15 border-l-4 border-indigo-900"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3  rounded-lg">
                        <AiOutlineFileText size={22} className="text-indigo-900" />
                      </div>
                      <div>
                        <p className="text-sm truncate max-w-40">{file.name}</p>
                        <p className="text-xs text-black/60">
                          {file.type} • {file.size}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-black/60">
                      <span className="capitalize">
                        {file.user} • {file.time}
                      </span>
                      <button className="p-2 me-2 hover:bg-indigo-900/15 rounded-xl transition-all duration-500">
                        <LuDownload size={18} className="text-indigo-900" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* COMMENTS TAB CONTENT */}
            {activeTab === "comments" && (
              <div className="space-y-4">
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scroll-hidden">
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className={`flex gap-3 ${c.isYou ? "flex-row-reverse" : ""}`}
                    >
                      <NeutralAvatar user={c.user} size={28} />

                      <div className={c.isYou ? "text-right" : ""}>
                        <div
                          className={`inline-block px-3 py-2 rounded-lg max-w-xs text-sm ${
                            c.isYou ? "bg-neutral-300 text-black" : "bg-neutral-100"
                          }`}
                        >
                          {c.text}
                        </div>

                        {/* Reactions display */}
                        {c.reactions && Object.keys(c.reactions).some(k => c.reactions[k]?.length > 0) && (
                          <div className={`flex flex-wrap gap-1 mt-1 ${c.isYou ? "justify-end" : "justify-start"}`}>
                            {Object.entries(c.reactions).map(([emoji, users]) => {
                              if (!users || users.length === 0) return null;
                              const hasReacted = users.includes(currentUser?._id || "me");
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleToggleReaction(c.id, emoji)}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition ${
                                    hasReacted
                                      ? "bg-neutral-200 text-neutral-800 "
                                      : "bg-neutral-200 text-neutral-700"
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  <span>{users.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className={`flex items-center gap-2 mt-1 ${c.isYou ? "justify-end flex-row-reverse" : "justify-start"}`}>
                          <p className="text-xs text-neutral-500">
                            {c.isYou
                              ? "You"
                              : `${c.user.firstName} ${c.user.lastName || ""}`}{" "}
                            • {c.time}
                          </p>

                          {/* Reaction Picker Trigger */}
                          <div className="relative group/picker">
                            <button className="text-neutral-400 hover:text-neutral-600 text-xs px-1 hover:bg-neutral-100 rounded transition font-bold">
                              ＋
                            </button>

                            {/* Hover Tooltip Emoji Picker */}
                            <div className={`absolute bottom-full mb-1 hidden group-hover/picker:flex items-center gap-1 bg-white border border-neutral-200 shadow-md rounded-full p-1 z-10 ${c.isYou ? "right-0" : "left-0"}`}>
                              {["👍", "❤️", "🔥", "😂", "🚀", "👀"].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleToggleReaction(c.id, emoji)}
                                  className="hover:scale-125 transition px-1 text-sm"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* COMMENT INPUT */}
                <div className="flex gap-3 pt-4 border-t border-neutral-100">
                  <NeutralAvatar user={currentUser} size={32} />
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                      placeholder="Add a comment..."
                      className="flex-1 px-3 py-1 bg-neutral-200  rounded-lg text-sm focus:outline-none placeholder-neutral-700"
                    />
                    <button
                      onClick={handleSendComment}
                      className="p-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg transition-all flex items-center justify-center shrink-0 shadow-sm"
                    >
                      <FiArrowUpRight size={18} />
                    </button>
                  </div>
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