// src/components/Sidebar.jsx
import { useState, useEffect } from "react";
import {
  HiOutlineFolder,
  HiOutlineInboxIn,
  HiPlus,  // ← New import for close button
} from "react-icons/hi";
import { MdOutlineEditCalendar } from "react-icons/md";
import { GoBook } from "react-icons/go";
import { LuChartLine } from "react-icons/lu";
import { IoIosArrowDown } from "react-icons/io";
import { fetchProjects } from "../BACKEND/utils/api";
import axios from "axios";
import { RxCross2 } from "react-icons/rx";
import { useAuth } from "../context/AuthContext";

const Sidebar = ({ onSelect, onInboxClick, onDashboardClick, onDocsClick }) => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const [projects, setProjects] = useState([]);
  const [openProjects, setOpenProjects] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add Project Modal State
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [moduleNames, setModuleNames] = useState(["", "", "", ""]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchProjects();

      if (!data || !Array.isArray(data)) {
        throw new Error("Invalid projects data received");
      }

      const openState = {};
      data.forEach((p) => {
        openState[p._id] = true;
      });

      setProjects(data);
      setOpenProjects(openState);

      if (data.length > 0 && data[0].modules?.length > 0) {
        const firstProject = data[0];
        const firstModule = firstProject.modules[0];

        setSelectedItem(firstModule._id);
        onSelect(
          firstProject._id,
          firstModule._id,
          null,
          firstProject.name,
          firstModule.name,
          ""
        );
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
      setError(err.message || "Failed to load projects. Please log in again.");

      if (err.message?.toLowerCase().includes("token") ||
          err.message?.toLowerCase().includes("unauthorized") ||
          err.message?.toLowerCase().includes("forbidden")) {
        localStorage.removeItem("token");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (id) => {
    setOpenProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectModule = (projId, modId, projName, modName) => {
    setSelectedItem(modId);
    onSelect(projId, modId, null, projName, modName, "");
  };

  const selectTaskGroup = (projId, modId, groupId, projName, modName, groupTitle) => {
    setSelectedItem(groupId);
    onSelect(projId, modId, groupId, projName, modName, groupTitle);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      return alert("Project name is required!");
    }

    const validModules = moduleNames.filter((m) => m.trim());
    if (validModules.length === 0 || validModules.length > 4) {
      return alert("You must add between 1 to 4 module names!");
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found.");

      const projRes = await axios.post(
        "http://localhost:5000/api/projects",
        { name: newProjectName.trim(), description: "Created via Catalyst" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const projectId = projRes.data._id;

      for (const name of validModules) {
        await axios.post(
          "http://localhost:5000/api/modules",
          { name: name.trim(), description: `${name.trim()} module`, projectId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      alert("Project and modules created successfully! 🎉");
      setShowAddProject(false);
      setNewProjectName("");
      setModuleNames(["", "", "", ""]);
      loadProjects();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403 || err.message?.includes("token")) {
        alert("Session expired. Please log in again.");
        localStorage.removeItem("token");
        window.location.reload();
      } else {
        alert(err.response?.data?.message || "Failed to create project.");
      }
    }
  };

  const buildVirtualGroups = (module) => {
    const inProgress = { _id: `${module._id}-inprogress`, title: "In Progress", tasks: [] };
    const pending = { _id: `${module._id}-pending`, title: "Pending Approval", tasks: [] };

    (module.taskGroups || []).forEach((group) => {
      (group.subtasks || []).forEach((task) => {
        if (task.status === "Ongoing") inProgress.tasks.push(task);
        if (task.status === "Pending") pending.tasks.push(task);
      });
    });

    const virtual = [];
    if (inProgress.tasks.length) virtual.push(inProgress);
    if (pending.tasks.length) virtual.push(pending);
    return virtual;
  };

  return (
    <div className="flex flex-col justify-between h-screen w-[18%] bg-neutral-200 text-sm px-6 pt-6 pb-4 overflow-y-auto">
      <div className="flex flex-col gap-5">
        {/* Logo */}
        <div className="ps-2">
          <img src="/Catalyst_Logo_Black.png" alt="Catalyst Logo" width={120} />
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-1">
          {["Dashboard", "Inbox", "Docs"].map((item) => (
            <div
              key={item}
              onClick={() => {
                setSelectedItem(item);
                if (item === "Inbox") onInboxClick();
                if (item === "Dashboard") onDashboardClick();
                if (item === "Docs") onDocsClick();
              }}
              className={`flex items-center gap-2 cursor-pointer hover:bg-neutral-300 rounded-md px-2 py-1 transition ${
                selectedItem === item ? "bg-neutral-300" : ""
              }`}
            >
              <div className="w-5 flex items-center justify-center">
                {item === "Dashboard" && <LuChartLine size={16} />}
                {item === "Inbox" && <HiOutlineInboxIn size={20} strokeWidth={1.5} />}
                {item === "Docs" && <GoBook size={16} strokeWidth={0.25} />}
              </div>
              <span className="truncate">{item}</span>
            </div>
          ))}

          <hr className="opacity-25 mt-2" />
          <p className="ms-2 mt-2 text-neutral-600">My Workspace</p>

          {/* Projects Section */}
          {loading ? (
            <div className="ps-3">Loading projects...</div>
          ) : error ? (
            <div className="text-red-500 ps-3 text-xs">{error}</div>
          ) : projects.length === 0 ? (
            <div className="text-neutral-500 ps-3">No projects yet</div>
          ) : (
            <ul className="flex flex-col gap-1">
              {projects.map((proj) => (
                <li key={proj._id}>
                  <div
                    onClick={() => toggleProject(proj._id)}
                    className="flex justify-between items-center cursor-pointer hover:bg-neutral-300 rounded-md px-2 py-1"
                  >
                    <div className="flex items-center gap-2">
                      <HiOutlineFolder size={20} strokeWidth={1.5} />
                      <span className="truncate w-36">{proj.name}</span>
                    </div>
                    <IoIosArrowDown
                      size={14}
                      className={`transition-transform ${openProjects[proj._id] ? "rotate-180" : ""}`}
                    />
                  </div>

                  {openProjects[proj._id] && proj.modules && (
                    <ul className="ps-3 ms-4 mt-2 border-l border-neutral-400">
                      {proj.modules.map((mod) => {
                        const virtualGroups = buildVirtualGroups(mod);
                        return (
                          <li key={mod._id}>
                            <div
                              onClick={() => selectModule(proj._id, mod._id, proj.name, mod.name)}
                              className={`flex items-center cursor-pointer hover:bg-neutral-300 rounded-md px-2 py-1 ${
                                selectedItem === mod._id ? "bg-neutral-300" : ""
                              }`}
                            >
                              <span className="truncate w-32">{mod.name}</span>
                            </div>

                            {virtualGroups.length > 0 && (
                              <ul className="ps-3 ms-4 mt-1 border-l border-neutral-500/50">
                                {virtualGroups.map((vg) => (
                                  <li
                                    key={vg._id}
                                    onClick={() =>
                                      selectTaskGroup(
                                        proj._id,
                                        mod._id,
                                        vg._id,
                                        proj.name,
                                        mod.name,
                                        vg.title
                                      )
                                    }
                                    className={`cursor-pointer hover:bg-neutral-300 rounded-md p-1 ps-2 my-0.5 truncate text-xs ${
                                      selectedItem === vg._id ? "bg-neutral-300" : ""
                                    }`}
                                  >
                                    {vg.title} ({vg.tasks.length})
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Add Project Button - Only for Admin */}
      {isAdmin && (
        <button
          onClick={() => setShowAddProject(true)}
          className="flex items-center gap-4 bg-black text-white p-1.5 rounded-md hover:bg-neutral-800 transition mt-4"
        >
          <HiPlus size={18} className="rounded-sm bg-neutral-800 text-white w-6 h-6 p-1" />
          Add Project
        </button>
      )}

      {/* ================= IMPROVED CREATE PROJECT MODAL ================= */}
      {showAddProject && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-140 max-w-lg">
            
            {/* Modal Header with Icon + Close Button */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                
                <MdOutlineEditCalendar size={18}/>
                <h2 className="text-sm">Create New Project</h2>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  setShowAddProject(false);
                  setNewProjectName("");
                  setModuleNames(["", "", "", ""]);
                }}
                className="hover:bg-neutral-300 bg-neutral-200 rounded-lg transition-all p-1"
              >
                <RxCross2 size={16} />
              </button>
            </div>

            <input
              type="text"
              placeholder="Project Name (Required)"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-4 py-2 bg-neutral-100 rounded-lg mb-4 focus:outline-none"
            />

            <p className="text-sm mb-3">Add up to 4 modules:</p>

            {moduleNames.map((name, i) => (
              <input
                key={i}
                type="text"
                placeholder={`Module ${i + 1} Name`}
                value={name}
                onChange={(e) => {
                  const updated = [...moduleNames];
                  updated[i] = e.target.value;
                  setModuleNames(updated);
                }}
                className="w-full px-4 py-2 bg-neutral-100 rounded-lg mb-3 focus:outline-none"
              />
            ))}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateProject}
                className="flex-1 bg-black text-white py-2 rounded-lg hover:bg-neutral-950 transition"
              >
                Create Project
              </button>
              <button
                onClick={() => {
                  setShowAddProject(false);
                  setNewProjectName("");
                  setModuleNames(["", "", "", ""]);
                }}
                className="flex-1 bg-neutral-200 py-2 rounded-lg hover:bg-neutral-300 transition"
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

export default Sidebar;