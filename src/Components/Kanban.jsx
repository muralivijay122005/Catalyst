// src/Components/Kanban.jsx
import React, { useState, useEffect, useRef } from "react";
import { GoCalendar } from "react-icons/go";
import { IoMdArrowForward, IoMdArrowBack } from "react-icons/io";
import { fetchTasks } from "../BACKEND/utils/api";

import TaskDetails from "./TaskDetails";

const Kanban = ({ projectId }) => {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isAtRight, setIsAtRight] = useState(false);
  const scrollRef = useRef(null);

  const statuses = [
    "Ongoing",
    "Not Started",
    "Pending",
    "Halted",
    "Completed",
    "Waiting for Approval",
  ];

  useEffect(() => {
    (async () => {
      if (!projectId) return;
      const data = await fetchTasks({ projectId });
      setTasks(data);
    })();
  }, [projectId]);

  useEffect(() => {
    const el = scrollRef.current;
    const handler = () => {
      if (el) {
        setIsAtRight(el.scrollLeft + el.clientWidth >= el.scrollWidth - 10);
      }
    };
    el?.addEventListener("scroll", handler);
    return () => el?.removeEventListener("scroll", handler);
  }, []);

  const scroll = (right) => {
    scrollRef.current?.scrollTo({
      left: right ? scrollRef.current.scrollWidth : 0,
      behavior: "smooth",
    });
  };

  const priorityColors = {
    Urgent: "red",
    Normal: "amber",
    Low: "emerald",
  };

  const colorCls = {
    red: "bg-red-600/15 text-red-800 ",
    amber: "bg-amber-600/15 text-amber-800 ",
    emerald: "bg-emerald-600/15 text-emerald-800 ",
  };

  const formatShortDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

// Improved Avatar - Neutral Colors Only
const getAvatar = (assignee) => {
    if (!assignee) return null;

    if (assignee.profilePicture) {
        return (
            <img
                src={assignee.profilePicture}
                alt={assignee.firstName}
                className="w-7 h-7 rounded-full object-cover"
            />
        );
    }

    const initials = `${assignee.firstName?.[0] || ""}${assignee.lastName?.[0] || ""
        }`.toUpperCase();

    return (
        <div className="w-7 h-7 bg-neutral-300 text-neutral-600 rounded-full flex items-center justify-center text-xs">
            {initials || "?"}
        </div>
    );
};

  return (
    <>
      <div className="flex flex-col w-full h-full">
        {/* Extended Height */}
        <div className="relative w-full h-[calc(100vh-6rem)]">
          <div
            ref={scrollRef}
            className="flex flex-row gap-3 overflow-x-auto flex-nowrap w-full h-[calc(100vh-11rem)] custom-scroll-hidden pb-8"
          >
            {statuses
              .filter((s) => tasks.some((t) => t.status === s))
              .map((s) => {
                const list = tasks.filter((t) => t.status === s);

                return (
                  <div
                    key={s}
                    className="flex flex-col shrink-0 w-[290px] h-fit rounded-xl  bg-neutral-100 p-2"
                  >
                    {/* Column Header - Black Accent */}
                    <div className="px-3 py-1 mb-1 text-black bg-neutral-100  flex items-center justify-between sticky top-0 z-10">
                      <div className="flex items-center gap-3">
                       
                        <span className="text-sm">{s}</span>
                      </div>
                      <span className="text-xs bg-neutral-200 px-2 py-1 rounded-full">
                        {list.length}
                      </span>
                    </div>

                    {/* Task Cards */}
                    <div className="flex flex-col gap-4">
                      {list.map((t) => {
                        const col = priorityColors[t.priority] || "amber";

                        return (
                          <div
                            key={t._id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(t);
                            }}
                            className="bg-white border border-neutral-200 hover:border hover:border-neutral-200 rounded-xl p-3 transition-all duration-200 cursor-pointer"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-xs px-2 py-1 bg-white text-black rounded border border-neutral-300 truncate max-w-[170px]">
                                {t.moduleId?.name || "No Module"}
                              </span>

                              <span
                                className={`text-xs px-2 py-1 rounded flex items-center gap-1.5 ${colorCls[col]}`}
                              >
                                <span
                                  className={`w-1.25 h-1.25 rounded-full ${
                                    col === "red"
                                      ? "bg-red-800"
                                      : col === "amber"
                                      ? "bg-amber-800"
                                      : "bg-emerald-800"
                                  }`}
                                />
                                {t.priority}
                              </span>
                            </div>

                            <p className="text-sm ms-1 mb-1 line-clamp-3">
                              {t.name}
                            </p>

                            <hr className="border-neutral-300 my-3" />

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-sm text-neutral-500">
                                <GoCalendar size={16} strokeWidth={0.5}/>
                                <span className="mt-0.5 tracking-tighter">{formatShortDate(t.dueDate)}</span>
                              </div>

                              <div className="flex -space-x-2">
                                {t.assignee ? (
                                  getAvatar(t.assignee)
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-neutral-300 text-neutral-600 flex items-center justify-center text-sm border-1.5 border-white">
                                    ?
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Scroll Buttons - Black Accent */}
          {!isAtRight && (
            <button
              onClick={() => scroll(true)}
              className="absolute right-6 top-1/2 -translate-y-1/2 bg-neutral-100 p-2 rounded-2xl z-30 hover:bg-neutral-50 transition-all active:scale-95"
            >
              <IoMdArrowForward size={16} className="text-black" />
            </button>
          )}

          {isAtRight && (
            <button
              onClick={() => scroll(false)}
              className="absolute left-6 top-1/2 -translate-y-1/2 bg-neutral-100 p-2 rounded-2xl z-30 hover:bg-neutral-50 transition-all active:scale-95"
            >
              <IoMdArrowBack size={16} className="text-black" />
            </button>
          )}
        </div>
      </div>

      {/* Task Details Panel */}
      {selectedTask && (
        <TaskDetails
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  );
};

export default Kanban;