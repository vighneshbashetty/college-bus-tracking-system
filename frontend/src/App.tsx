import { useState } from "react";
import Login from "@/components/Login";
import Register from "@/components/Register";
import StudentPortal from "@/components/StudentPortal";
import AdminPortal from "@/components/AdminPortal";
import DriverPortal from "@/components/DriverPortal";
import { useTransitSim } from "@/useTransitSim";
import { api } from "@/services/api";

export default function App() {
  // Read initial connection mode and login status
  const [isConnectedMode, setIsConnectedMode] = useState<boolean>(api.isConnected());
  const [role, setRole] = useState<string | null>(api.roleValue);
  const [view, setView] = useState<"login" | "register" | "portal">(
    api.tokenValue ? "portal" : "login"
  );

  // Hook into our dual-mode transit simulation
  const { buses, setBuses, arrivals } = useTransitSim(isConnectedMode && view === "portal");

  const handleLoginSuccess = (userRole: string) => {
    setRole(userRole);
    setView("portal");
  };

  const handleDemoLogin = (demoRole: "student" | "admin") => {
    api.setConnected(false);
    setIsConnectedMode(false);
    setRole(demoRole);
    setView("portal");
  };

  const handleLogout = () => {
    api.logout();
    setRole(null);
    setView("login");
  };

  const handleConnectionModeChange = (val: boolean) => {
    setIsConnectedMode(val);
    api.setConnected(val);
  };

  // 1. Show Register View
  if (view === "register") {
    return (
      <Register
        onRegisterSuccess={() => setView("login")}
        onBackToLogin={() => setView("login")}
      />
    );
  }

  // 2. Show Login View (if not authenticated or token cleared)
  if (view === "login" || !role) {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onGoToRegister={() => setView("register")}
        isConnectedMode={isConnectedMode}
        setIsConnectedMode={handleConnectionModeChange}
        onDemoLogin={handleDemoLogin}
      />
    );
  }

  // 3. Show Role-Based Dashboard View
  if (role === "student") {
    return (
      <StudentPortal
        buses={buses}
        arrivals={arrivals}
        onBack={handleLogout}
      />
    );
  }

  if (role === "driver") {
    return (
      <DriverPortal
        onLogout={handleLogout}
      />
    );
  }

  // Fallback / default to Admin Portal
  return (
    <AdminPortal
      buses={buses}
      setBuses={setBuses}
      onBack={handleLogout}
      isConnected={isConnectedMode}
    />
  );
}