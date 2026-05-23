// src/components/PendingApproval.jsx
import React, { useState, useEffect } from "react";
import { RxDragHandleDots2 } from "react-icons/rx";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import { FaCheck } from "react-icons/fa6";
import { RxCross2 } from "react-icons/rx";
import { fetchTasks } from "../BACKEND/utils/api";
import { useAuth } from "../context/AuthContext";

const truncate = (t, l) => (t?.length <= l ? t : t?.slice(0, l) + "...");

const apiCall = async (url, method = "GET", body = null) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) {
    alert("Not logged in! Redirecting...");
    window.location.href = "/login";
    return null;
  }

  const res = await fetch(`http://localhost:5000/api${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : null,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Server error" }));
    throw new Error(error.message || "Request failed");
  }
  return res.json();
};

const PendingApproval = ({ projectId, moduleId, taskGroupId }) => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const [groups, setGroups] = useState([]);
  const [open, setOpen] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    loadPendingTasks();
  }, [projectId, moduleId, taskGroupId]);

  const loadPendingTasks = async () => {
    try {
      setLoading(true);
      let tasks = await fetchTasks({ projectId });

      // Filter only Pending tasks
      tasks = tasks.filter((t) => t.status === "Pending");

      // Exact same filtering logic as InProgress.jsx
      if (taskGroupId && !taskGroupId.includes("-")) {
        tasks = tasks.filter(
          (t) => (t.groupId?._id || t.groupId) === taskGroupId
        );
      } else if (moduleId && !taskGroupId) {
        tasks = tasks.filter(
          (t) => (t.moduleId?._id || t.moduleId) === moduleId
        );
      }

      // Group by Task Group
      const grouped = tasks.reduce((acc, task) => {
        const groupId = task.groupId?._id || task.groupId || "ungrouped";
        const groupName = task.groupId?.title || "Ungrouped Pending Tasks";

        if (!acc[groupId]) {
          acc[groupId] = { id: groupId, name: groupName, items: [] };
        }
        acc[groupId].items.push(task);
        return acc;
      }, {});

      const result = Object.values(grouped);
      setGroups(result);

      const openState = {};
      result.forEach((g) => (openState[g.id] = true));
      setOpen(openState);
    } catch (err) {
      console.error("Failed to load pending tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (taskId, status) => {
    try {
      await apiCall(`/tasks/${taskId}`, "PUT", { status });
      loadPendingTasks();
    } catch (err) {
      alert(err.message || "Failed to update status");
    }
  };

  const toggle = (id) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading)
    return (
      <div className="text-center py-8 text-neutral-700">Loading pending tasks...</div>
    );

  if (groups.length === 0)
    return (
      <div className="text-center py-8 text-neutral-700">
        No pending tasks
      </div>
    );

  return (
    <div className="text-sm sf-regular tracking-tight pb-2">
      <table className="w-full border-collapse table-fixed ">
        <thead>
          <tr className="text-left border-b border-black/15 opacity-75">
            <th className="w-[23%] py-2 px-8 sf-regular">Task</th>
            <th className="w-[20%] py-2 px-2 sf-regular">Description</th>
            <th className="w-[10%] py-2 px-2 sf-regular">Assignee</th>
            <th className="w-[10%] py-2 px-2 sf-regular">Due Date</th>
            <th className="w-[10%] py-2 px-2 sf-regular">Priority</th>
            <th className="w-[13%] py-2 px-2 sf-regular">Status</th>
            <th className="w-[11%] py-2 px-2 sf-regular">Start Date</th>
            {isAdmin && (
              <th className="w-[10%] py-2 px-2 text-center sf-regular">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <React.Fragment key={g.id}>
              {/* Group Header */}
              <tr
                className="cursor-pointer hover:bg-neutral-50"
                onClick={() => toggle(g.id)}
              >
                <td
                  colSpan={isAdmin ? 8 : 7}
                  className="py-2 px-2"
                >
                  <div className="flex items-center gap-2">
                    {open[g.id] ? <FiChevronDown /> : <FiChevronRight />}
                    <span className="">{g.name}</span>
                  </div>
                </td>
              </tr>

              {/* Pending Tasks Rows */}
              {open[g.id] &&
                g.items.map((t) => (
                  <tr key={t._id} className="hover:bg-neutral-100 align-middle">
                    <td className="px-2 py-1 flex items-center gap-2 ps-4">
                      <RxDragHandleDots2 className="opacity-50" />
                      {truncate(t.name, 20)}
                    </td>
                    <td className="px-2 py-1 align-middle">
                      {truncate(t.description || "", 20)}
                    </td>
                    <td className="px-2 py-1 align-middle">
                      {t.assignee?.firstName || t.assignee?.name || "—"}
                    </td>
                    <td className="px-2 py-1 align-middle">
                      {t.dueDate
                        ? new Date(t.dueDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-2 py-1 align-middle">
                      <div
                        className={`flex items-center gap-1 rounded px-2 py-0.5 w-fit ${t.priority === "High" || t.priority === "Urgent"
                          ? "bg-red-600/15"
                          : t.priority === "Medium" || t.priority === "Normal"
                            ? "bg-amber-600/15"
                            : "bg-green-600/15"
                          }`}
                      >
                        <span
                          className={`w-[5px] h-[5px] rounded-full ${t.priority === "High" || t.priority === "Urgent"
                            ? "bg-red-800"
                            : t.priority === "Medium" || t.priority === "Normal"
                              ? "bg-amber-800"
                              : "bg-green-800"
                            }`}
                        />
                        <span
                          className={`${t.priority === "High" || t.priority === "Urgent"
                            ? "text-red-800"
                            : t.priority === "Medium" || t.priority === "Normal"
                              ? "text-amber-800"
                              : "text-green-800"
                            }`}
                        >
                          {t.priority}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-1 align-middle">
                      <span className="block text-center rounded w-fit px-1.5 py-0.5 bg-blue-100 text-blue-800">
                        Pending
                      </span>
                    </td>
                    <td className="px-2 py-1 align-middle">
                      {t.startDate
                        ? new Date(t.startDate).toLocaleDateString()
                        : "—"}
                    </td>

                    {isAdmin && (
                      <td className="px-2 py-1 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => updateStatus(t._id, "Ongoing")}
                            className="bg-white text-black w-6 h-6 rounded flex items-center justify-center
                                       hover:bg-neutral-200 border border-neutral-200 transition"
                          >
                            <FaCheck size={10} className="leading-none" />
                          </button>

                          <button
                            onClick={() => updateStatus(t._id, "Halted")}
                            className="bg-white text-black w-6 h-6 rounded flex items-center justify-center
                                       hover:bg-neutral-200 border border-neutral-200 transition"
                          >
                            <RxCross2 size={12} className="leading-none" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PendingApproval;