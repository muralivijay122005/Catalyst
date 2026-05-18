// src/Components/InProgress.jsx
import React, { useState, useEffect } from "react";
import { RxDragHandleDots2 } from "react-icons/rx";
import { IoTrashOutline } from "react-icons/io5";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import { FaCheck } from "react-icons/fa6";
import { RxCross2 } from "react-icons/rx";
import { fetchTasks, fetchUsers } from "../BACKEND/utils/api";
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

const InProgress = ({ projectId, moduleId, taskGroupId }) => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const isProjectManager = currentUser?.role === "projectManager";

  const canChangePriority = isAdmin || isProjectManager;

  const [groups, setGroups] = useState([]);
  const [open, setOpen] = useState({});
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [newTasks, setNewTasks] = useState([
    {
      name: "",
      description: "",
      assignee: "",
      dueDate: "",
      priority: "Low",
      status: "Not Started",
      startDate: new Date().toISOString().split("T")[0],
    },
    {
      name: "",
      description: "",
      assignee: "",
      dueDate: "",
      priority: "Low",
      status: "Not Started",
      startDate: new Date().toISOString().split("T")[0],
    },
  ]);

  useEffect(() => {
    const handleOpenModal = (e) => {
      if (e.detail.projectId === projectId && e.detail.moduleId === moduleId) {
        setShowAssignModal(true);
      }
    };
    window.addEventListener("openAssignModal", handleOpenModal);
    return () => window.removeEventListener("openAssignModal", handleOpenModal);
  }, [projectId, moduleId]);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    loadTasks();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, moduleId, taskGroupId]);

  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      let tasks = await fetchTasks({ projectId });

      if (taskGroupId?.endsWith("-inprogress")) {
        tasks = tasks.filter((t) => t.status === "Ongoing");
        if (moduleId)
          tasks = tasks.filter(
            (t) => (t.moduleId?._id || t.moduleId) === moduleId
          );
      } else if (taskGroupId && !taskGroupId.includes("-")) {
        tasks = tasks.filter(
          (t) => (t.groupId?._id || t.groupId) === taskGroupId
        );
      } else if (moduleId && !taskGroupId) {
        tasks = tasks.filter(
          (t) =>
            (t.moduleId?._id || t.moduleId) === moduleId &&
            t.status !== "Pending"
        );
      } else {
        tasks = tasks.filter((t) => t.status !== "Pending");
      }

      const grouped = tasks.reduce((acc, task) => {
        const groupId = task.groupId?._id || task.groupId || "ungrouped";
        const groupName = task.groupId?.title || "Ungrouped Tasks";
        if (!acc[groupId])
          acc[groupId] = { id: groupId, name: groupName, items: [] };
        acc[groupId].items.push(task);
        return acc;
      }, {});

      const result = Object.values(grouped);
      setGroups(result);

      const openState = {};
      result.forEach((g) => (openState[g.id] = true));
      setOpen(openState);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (taskId, status) => {
    try {
      await apiCall(`/tasks/${taskId}`, "PUT", { status });
      loadTasks();
    } catch (err) {
      alert(err.message || "Failed to update status");
    }
  };

  const handleAssignTasks = async () => {
    if (!newGroupTitle.trim()) return alert("Task Group Title required!");
    if (newTasks.some((t) => !t.name.trim()))
      return alert("All tasks need a name!");

    try {
      const group = await apiCall("/taskgroups", "POST", {
        title: newGroupTitle,
        projectId,
        moduleId,
      });
      const groupId = group._id;

      await Promise.all(
        newTasks.map((task) =>
          apiCall("/tasks", "POST", { ...task, projectId, moduleId, groupId })
        )
      );

      alert("Tasks assigned successfully!");
      setShowAssignModal(false);
      setNewGroupTitle("");
      setNewTasks([
        {
          name: "",
          description: "",
          assignee: "",
          dueDate: "",
          priority: "Low",
          status: "Not Started",
          startDate: new Date().toISOString().split("T")[0],
        },
        {
          name: "",
          description: "",
          assignee: "",
          dueDate: "",
          priority: "Low",
          status: "Not Started",
          startDate: new Date().toISOString().split("T")[0],
        },
      ]);
      loadTasks();
    } catch (err) {
      alert(err.message || "Failed to assign tasks");
    }
  };

  const toggle = (id) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  const removeTask = (index) => {
    if (newTasks.length === 1) return; // Keep at least one task
    setNewTasks((prev) => prev.filter((_, idx) => idx !== index));
  };

  if (loading)
    return (
      <div className="text-center py-8 text-neutral-500">Loading tasks...</div>
    );
  if (!groups.length)
    return (
      <div className="text-center py-8 text-neutral-500">
        No in-progress tasks
      </div>
    );

  return (
    <div className="text-sm sf-regular tracking-tight">
      <table className="w-full border-collapse table-fixed">
        <thead>
          <tr className="text-left border-b border-black/15 opacity-60">
            <th className="w-[23%] py-2 px-8 sf-regular ">Task</th>
            <th className="w-[20%] py-2 px-2 sf-regular ">Description</th>
            <th className="w-[10%] py-2 px-2 sf-regular ">Assignee</th>
            <th className="w-[10%] py-2 px-2 sf-regular ">Due Date</th>
            {canChangePriority && (
              <th className="w-[10%] py-2 px-2 sf-regular ">Priority</th>
            )}
            <th className="w-[13%] py-2 px-2 sf-regular ">Status</th>
            <th className="w-[11%] py-2 px-2 sf-regular ">Start Date</th>
            {isAdmin && (
              <th className="w-[10%] py-2 px-2 text-center sf-regular ">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <React.Fragment key={g.id}>
              <tr
                className="cursor-pointer hover:bg-neutral-50"
                onClick={() => toggle(g.id)}
              >
                <td
                  colSpan={canChangePriority ? (isAdmin ? 8 : 7) : 7}
                  className="py-2 px-2"
                >
                  <div className="flex items-center gap-2 mt-2">
                    {open[g.id] ? <FiChevronDown /> : <FiChevronRight />}
                    <span className="">{g.name}</span>
                  </div>
                </td>
              </tr>

              {open[g.id] &&
                g.items.map((t) => {
                  const due = t.dueDate ? new Date(t.dueDate) : null;
                  const isOverdue =
                    due && due < new Date() && t.status !== "Completed";

                  return (
                    <tr key={t._id} className="hover:bg-neutral-100 align-middle">
                      <td className="px-2 py-2 flex items-center gap-2 ps-4">
                        <RxDragHandleDots2 className="opacity-50" />
                        {truncate(t.name, 20)}
                      </td>
                      <td className="px-2 py-2 align-middle">
                        {truncate(t.description || "", 20)}
                      </td>
                      <td className="px-2 py-2 align-middle">
                        {t.assignee?.firstName || "—"}
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <span
                          className={
                            isOverdue ? "text-red-600 " : ""
                          }
                        >
                          {t.dueDate ? due.toLocaleDateString() : "—"}
                        </span>
                      </td>
                      {canChangePriority && (
                        <td className="px-2 py-2 align-middle">
                          <div
                            className={`flex items-center gap-1 rounded px-2 py-0.5 w-fit ${t.priority === "Urgent"
                              ? "bg-red-600/15"
                              : t.priority === "Normal"
                                ? "bg-amber-600/15"
                                : "bg-green-600/15"
                              }`}
                          >
                            <span
                              className={`w-[5px] h-[5px] rounded-full ${t.priority === "Urgent"
                                ? "bg-red-800"
                                : t.priority === "Normal"
                                  ? "bg-amber-800"
                                  : "bg-green-800"
                                }`}
                            />
                            <span
                              className={`${t.priority === "Urgent"
                                ? "text-red-800"
                                : t.priority === "Normal"
                                  ? "text-amber-800"
                                  : "text-green-800"
                                }`}
                            >
                              {t.priority}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="px-2 py-2 align-middle">
                        <span className="block text-center rounded w-fit px-1.5 py-0.5 bg-blue-100 text-blue-800">
                          {t.status}
                        </span>
                      </td>
                      <td className="px-2 py-2 align-middle">
                        {t.startDate
                          ? new Date(t.startDate).toLocaleDateString()
                          : "—"}
                      </td>

                      {isAdmin && (
                        <td className="px-2 py-2 text-center">
                          {t.status === "Ongoing" && (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => updateStatus(t._id, "Completed")}
                                className="bg-white text-black w-6 h-6 rounded flex items-center justify-center
                                           hover:bg-neutral-100 border border-neutral-200 transition"
                              >
                                <FaCheck size={10} className="leading-none" />
                              </button>

                              <button
                                onClick={() => updateStatus(t._id, "Halted")}
                                className="bg-white text-black w-6 h-6 rounded flex items-center justify-center
                                           hover:bg-neutral-100 border border-neutral-200 transition"
                              >
                                <RxCross2 size={12} className="leading-none" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* ASSIGN TASKS MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60  flex items-center justify-center z-50">
          <div className="bg-white custom-scroll p-8 rounded-xl shadow-2xl w-[700px] max-h-screen overflow-y-auto relative">
            {/* Close X Button - Top Right of Modal */}
            <button
              onClick={() => setShowAssignModal(false)}
              className="absolute border border-neutral-300  rounded-full p-1 top-6 right-6 text-black hover:bg-neutral-100 transition"
            >
              <RxCross2 size={16} />
            </button>

            <h2 className="text-md mb-6">Assign New Tasks</h2>

            <input
              placeholder="Task Group Title"
              value={newGroupTitle}
              onChange={(e) => setNewGroupTitle(e.target.value)}
              className="w-full px-4 py-2 bg-neutral-200 rounded-md mb-6 placeholder-neutral-700 focus:outline-none"
            />

            {newTasks.map((task, i) => (
              <div key={i} className="border border-neutral-200  p-4 rounded-lg mb-4 relative">
                {/* Task Title + Bin Button */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm">Task {i + 1}</h3>

                  {/* Delete Bin Button */}
                  {newTasks.length > 1 && (
                    <button
                      onClick={() => removeTask(i)}
                      className="border border-neutral-300 hover:border-red-400 text-red-500 hover:text-red-600 
                                 p-1.5 rounded transition-all"
                      title="Remove this task"
                    >
                      <IoTrashOutline size={16} />
                    </button>
                  )}
                </div>

                <input
                  placeholder="Task Name"
                  value={task.name}
                  onChange={(e) => {
                    const updated = [...newTasks];
                    updated[i].name = e.target.value;
                    setNewTasks(updated);
                  }}
                  className="w-full px-3 py-2 bg-neutral-200 rounded mb-2 placeholder-neutral-700 focus:outline-none"
                />
                <textarea
                  placeholder="Description"
                  value={task.description}
                  onChange={(e) => {
                    const updated = [...newTasks];
                    updated[i].description = e.target.value;
                    setNewTasks(updated);
                  }}
                  className="w-full px-3 py-2 bg-neutral-200 rounded mb-2 placeholder-neutral-700 focus:outline-none"
                />
                <select
                  value={task.assignee}
                  onChange={(e) => {
                    const updated = [...newTasks];
                    updated[i].assignee = e.target.value;
                    setNewTasks(updated);
                  }}
                  className="w-full px-3 py-2 bg-neutral-200 rounded mb-2 placeholder-neutral-700 focus:outline-none"
                >
                  <option value="">Select Assignee</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.firstName} {u.lastName}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={task.dueDate}
                  onChange={(e) => {
                    const updated = [...newTasks];
                    updated[i].dueDate = e.target.value;
                    setNewTasks(updated);
                  }}
                  className="w-full px-3 py-2 bg-neutral-200 rounded mb-2 placeholder-neutral-700 focus:outline-none"
                />
              </div>
            ))}

            {newTasks.length < 6 && (
              <button
                onClick={() =>
                  setNewTasks((prev) => [
                    ...prev,
                    {
                      name: "",
                      description: "",
                      assignee: "",
                      dueDate: "",
                      priority: "Low",
                      status: "Not Started",
                      startDate: new Date().toISOString().split("T")[0],
                    },
                  ])
                }
                className="text-sm hover:underline mb-4"
              >
                + Add Task (Max 6)
              </button>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleAssignTasks}
                className="flex-1 bg-black text-white py-2 rounded-md"
              >
                Create {newTasks.length} Tasks
              </button>
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 bg-neutral-300 py-2 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InProgress;