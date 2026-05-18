// src/App.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./Components/Auth/Login";
import MainApp from "./MainApp";

const App = () => {
  const { currentUser } = useAuth();

  return (
    <Routes>
      {/* Login Route */}
      <Route
        path="/login"
        element={
          !currentUser ? <Login /> : <Navigate to="/app" replace />
        }
      />

      {/* Main Application Route */}
      <Route
        path="/app"
        element={
          currentUser ? <MainApp /> : <Navigate to="/login" replace />
        }
      />

      {/* Catch all - redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;