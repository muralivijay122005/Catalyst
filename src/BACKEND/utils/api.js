// src/utils/api.js

const API_BASE = "http://localhost:5000/api";

export const fetchProjects = async () => {
  const token = localStorage.getItem("token");
  if (!token) return []; // Don't even try if no token

  try {
    const response = await fetch(
      `${API_BASE}/projects`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
      window.location.reload();
      return [];
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch projects: ${response.status}`
      );
    }

    const data = await response.json();
    return data.projects || data || [];
  }
  catch (error) {
    console.error(
      "Error fetching projects:",
      error
    );
    return [];
  }
};


/**
 * Fetch Tasks
 */
export const fetchTasks = async ({
  projectId,
  moduleId,
  groupId,
}) => {
  if (!projectId) return [];

  const token = localStorage.getItem("token");
  if (!token) return [];

  try {
    const url = new URL(
      `${API_BASE}/tasks`
    );

    url.searchParams.append(
      "projectId",
      projectId
    );

    if (moduleId)
      url.searchParams.append(
        "moduleId",
        moduleId
      );

    if (groupId)
      url.searchParams.append(
        "groupId",
        groupId
      );

    const response = await fetch(
      url.toString(),
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
      window.location.reload();
      return [];
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch tasks: ${response.status}`
      );
    }

    const data = await response.json();
    return data.tasks || data || [];
  }
  catch (error) {
    console.error(
      "Error fetching tasks:",
      error
    );
    return [];
  }
};

export const fetchUsers = async () => {
  const token = localStorage.getItem("token");
  if (!token) return [];

  try {
    const response = await fetch(
      `${API_BASE}/users`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
      window.location.reload();
      return [];
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status}`);
    }

    const data = await response.json();
    return data.users || data || [];
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};