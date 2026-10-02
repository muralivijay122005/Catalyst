// src/lib/api.js
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const TOKEN_KEY = "catalyst.token";

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
};

/** Authenticated JSON request. Throws an Error carrying the server's message on failure. */
export async function api(path, { method = "GET", body, signal } = {}) {
  const token = getToken();
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    const e = new Error("Can't reach the Catalyst server. Is it running on port 5000?");
    e.status = 0;
    throw e;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) window.dispatchEvent(new CustomEvent("catalyst:unauthorized"));
    const error = new Error(data.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

api.get = (path, opts) => api(path, opts);
api.post = (path, body) => api(path, { method: "POST", body: body ?? {} });
api.patch = (path, body) => api(path, { method: "PATCH", body });
api.del = (path, body) => api(path, { method: "DELETE", body });
