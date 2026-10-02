// src/context/AuthContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "../lib/api";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  // Without a stored token there's nothing to restore, so we're ready immediately
  const [ready, setReady] = useState(() => !getToken());

  const applySession = useCallback((session) => {
    setUser(session.user);
    setPermissions(session.permissions || []);
  }, []);

  // Restore the session from the stored token
  useEffect(() => {
    if (!getToken()) return;
    api("/auth/me")
      .then(applySession)
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, [applySession]);

  const logout = useCallback(() => {
    // Mark offline right away (uses the token before it's cleared); don't block sign-out on it
    if (getToken()) api.post("/auth/logout").catch(() => {});
    setToken(null);
    setUser(null);
    setPermissions([]);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener("catalyst:unauthorized", onUnauthorized);
    return () => window.removeEventListener("catalyst:unauthorized", onUnauthorized);
  }, [logout]);

  // Respect the user's reduce-motion preference app-wide
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = user?.preferences?.reduceMotion ? "true" : "false";
  }, [user?.preferences?.reduceMotion]);

  const login = useCallback(
    async (emailOrUsername, password) => {
      const session = await api.post("/auth/login", { emailOrUsername, password });
      setToken(session.token);
      applySession(session);
      return session.user;
    },
    [applySession]
  );

  const register = useCallback(
    async (payload) => {
      const session = await api.post("/auth/register", payload);
      setToken(session.token);
      applySession(session);
      return session.user;
    },
    [applySession]
  );

  const updateProfile = useCallback(
    async (patch) => {
      const session = await api.patch("/auth/me", patch);
      applySession(session);
      return session.user;
    },
    [applySession]
  );

  const value = useMemo(
    () => ({
      user,
      permissions,
      ready,
      can: (perm) => permissions.includes(perm),
      isAdmin: user?.role === "admin",
      login,
      register,
      logout,
      updateProfile,
    }),
    [user, permissions, ready, login, register, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
