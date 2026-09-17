import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mail, KeyRound, Bus, ShieldCheck, User, Database, ServerCrash, RotateCw, ShieldAlert } from "lucide-react";
import { api } from "@/services/api";

interface Props {
  onLoginSuccess: (role: string) => void;
  onGoToRegister: () => void;
  isConnectedMode: boolean;
  setIsConnectedMode: (val: boolean) => void;
  onDemoLogin: (role: "student" | "admin") => void;
}

export default function Login({
  onLoginSuccess,
  onGoToRegister,
  isConnectedMode,
  setIsConnectedMode,
  onDemoLogin,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Captcha state
  const [captchaCode, setCaptchaCode] = useState("");
  const [userCaptcha, setUserCaptcha] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate random 5-character string
  const generateCaptcha = useCallback(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setUserCaptcha("");
  }, []);

  // Draw captcha on canvas whenever code changes
  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  useEffect(() => {
    if (!canvasRef.current || !captchaCode) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = "#0f172a"; // slate-900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Noise lines
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(59, 130, 246, ${0.2 + Math.random() * 0.3})`;
      ctx.lineWidth = 1 + Math.random();
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Noise dots
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(148, 163, 184, ${Math.random() * 0.4})`;
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
    }

    // Text rendering with slight tilt/distortion
    ctx.font = "bold 20px monospace";
    ctx.textBaseline = "middle";

    const startX = 15;
    for (let i = 0; i < captchaCode.length; i++) {
      ctx.save();
      const x = startX + i * 22;
      const y = canvas.height / 2 + (Math.random() * 4 - 2);
      const angle = (Math.random() * 0.4 - 0.2); // tilt
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = i % 2 === 0 ? "#60a5fa" : "#818cf8"; // blue-400 or indigo-400
      ctx.fillText(captchaCode[i], 0, 0);
      ctx.restore();
    }
  }, [captchaCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate CAPTCHA
    if (userCaptcha.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      setError("Incorrect CAPTCHA code. Please enter the characters shown in the box.");
      generateCaptcha();
      return;
    }

    if (!isConnectedMode) {
      // Offline mode login bypass based on role matching email prefix or defaults
      if (email.includes("admin")) {
        onDemoLogin("admin");
      } else if (email.includes("driver")) {
        // We'll let it fallback to admin or redirect properly
        setError("For Driver Role, please enable 'Live API Server' mode.");
      } else {
        onDemoLogin("student");
      }
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(email, password);
      onLoginSuccess(res.role);
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
      generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const fillQuickCredentials = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setUserCaptcha(captchaCode); // Auto fill valid captcha for quick testing
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 sm:px-6 relative overflow-hidden">
      {/* background glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="max-w-md w-full z-10">
        {/* logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/20 mb-3">
            <Bus className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">CampusTrack</h1>
          <p className="text-slate-400 text-xs mt-1">Live College Bus Tracking Platform</p>
        </div>

        {/* main card */}
        <div className="bg-slate-900/60 ring-1 ring-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <h2 className="text-xl font-semibold mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 ring-1 ring-rose-400/30 text-rose-300 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* mode selector */}
            <div className="bg-slate-950 p-1.5 rounded-xl flex ring-1 ring-white/5 mb-2">
              <button
                type="button"
                onClick={() => {
                  setIsConnectedMode(false);
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  !isConnectedMode ? "bg-slate-800 text-white ring-1 ring-white/10" : "text-slate-400 hover:text-white"
                }`}
              >
                <ServerCrash className="w-3.5 h-3.5" />
                Demo Mode
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConnectedMode(true);
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  isConnectedMode ? "bg-indigo-600 text-white ring-1 ring-indigo-400/30" : "text-slate-400 hover:text-white"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                FastAPI Live
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium">College Email</label>
              <div className="relative mt-1">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@college.edu"
                  required
                  className="w-full bg-slate-950 ring-1 ring-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium">Password</label>
              <div className="relative mt-1">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required={isConnectedMode}
                  className="w-full bg-slate-950 ring-1 ring-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0"
                />
              </div>
            </div>

            {/* Security CAPTCHA */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                  Security Verification
                </label>
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px] font-medium transition-colors"
                >
                  <RotateCw className="w-3 h-3 animate-spin-hover" /> Refresh Code
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-slate-950 p-1.5 rounded-xl ring-1 ring-white/10 shrink-0 flex items-center justify-center shadow-inner">
                  <canvas ref={canvasRef} width={120} height={36} className="rounded-lg cursor-pointer" onClick={generateCaptcha} title="Click to refresh" />
                </div>
                <input
                  type="text"
                  value={userCaptcha}
                  onChange={(e) => setUserCaptcha(e.target.value)}
                  placeholder="Type code"
                  required
                  maxLength={5}
                  className="w-full bg-slate-950 ring-1 ring-white/10 rounded-xl px-3 py-2 text-sm uppercase font-mono tracking-widest placeholder:text-slate-600 placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-all mt-6 shadow-lg shadow-blue-600/20"
            >
              {loading ? "Signing In..." : isConnectedMode ? "Connect to Server" : "Enter Demo Portal"}
            </button>
          </form>

          {/* Quick fills */}
          <div className="mt-6 border-t border-white/10 pt-5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2 font-medium">Quick-fill Demo Credentials</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => fillQuickCredentials("admin@college.edu", "adminpassword")}
                className="text-[11px] bg-slate-950 ring-1 ring-white/5 rounded-lg py-1 hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Admin
              </button>
              <button
                onClick={() => fillQuickCredentials("driver.sharma@college.edu", "password123")}
                className="text-[11px] bg-slate-950 ring-1 ring-white/5 rounded-lg py-1 hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"
              >
                <Bus className="w-3 h-3 text-blue-400" /> Driver
              </button>
              <button
                onClick={() => fillQuickCredentials("student.aarav@college.edu", "password123")}
                className="text-[11px] bg-slate-950 ring-1 ring-white/5 rounded-lg py-1 hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"
              >
                <User className="w-3 h-3 text-indigo-400" /> Student
              </button>
            </div>
            {isConnectedMode && (
              <p className="text-[10px] text-slate-500 mt-2 text-center">Note: Run backend/seed.py first to enable these credentials.</p>
            )}
          </div>
        </div>

        {/* footer actions */}
        <div className="mt-6 text-center text-sm">
          <span className="text-slate-400">New to CampusTrack? </span>
          <button
            onClick={onGoToRegister}
            className="text-blue-400 font-semibold hover:text-blue-300 transition-colors"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}
