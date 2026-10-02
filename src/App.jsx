// src/App.jsx
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AppLayout from "./components/layout/AppLayout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Inbox from "./pages/Inbox";
import MyTasks from "./pages/MyTasks";
import Approvals from "./pages/Approvals";
import Knowledge from "./pages/Knowledge";
import Channels from "./pages/Channels";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import Project from "./pages/project/Project";
import Projects from "./pages/Projects";
import { Logo } from "./components/ui/icons";

function Protected({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

const Splash = () => (
  <div className="h-full grid place-items-center">
    <div className="flex flex-col items-center gap-3" style={{ animation: "fade 400ms ease-out both" }}>
      <Logo size={36} className="animate-pulse" />
    </div>
  </div>
);

export default function App() {
  const { user, ready } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={!ready ? <Splash /> : user ? <Navigate to="/home" replace /> : <Login />} />
      <Route
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route path="/home" element={<Home />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/my-tasks" element={<MyTasks />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/kb" element={<Knowledge />} />
        <Route path="/kb/:memoryId" element={<Knowledge />} />
        <Route path="/channels" element={<Channels />} />
        <Route path="/channels/:channelId" element={<Channels />} />
        <Route path="/team" element={<Team />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/:tab" element={<Settings />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:key" element={<Project />} />
        <Route path="/projects/:key/:view" element={<Project />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? "/home" : "/login"} replace />} />
    </Routes>
  );
}
