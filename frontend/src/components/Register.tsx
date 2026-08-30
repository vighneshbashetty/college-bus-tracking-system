import React, { useState } from "react";
import { Mail, KeyRound, User, Bus, ArrowLeft, ShieldCheck, GraduationCap } from "lucide-react";
import { api } from "@/services/api";

interface Props {
  onRegisterSuccess: () => void;
  onBackToLogin: () => void;
}

export default function Register({ onRegisterSuccess, onBackToLogin }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"student" | "driver" | "admin">("student");
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api.register(email, password, name, role);
      setSuccess(true);
      setTimeout(() => {
        onRegisterSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 sm:px-6 relative overflow-hidden">
      {/* background glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="max-w-md w-full z-10">
        {/* back button */}
        <button
          onClick={onBackToLogin}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6 group transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Login
        </button>

        {/* main card */}
        <div className="bg-slate-900/60 ring-1 ring-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <h2 className="text-xl font-semibold mb-2">Create Account</h2>
          <p className="text-slate-400 text-xs mb-6">Register your college bus tracking account</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 ring-1 ring-rose-400/30 text-rose-300 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-400/30 text-emerald-300 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              Registration successful! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-medium">Full Name</label>
              <div className="relative mt-1">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full bg-slate-950 ring-1 ring-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium">College Email</label>
              <div className="relative mt-1">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@vitbhopal.ac.in"
                  required
                  className="w-full bg-slate-950 ring-1 ring-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0"
                />
              </div>
            </div>

            {/* Role selection */}
            <div>
              <label className="text-xs text-slate-400 font-medium">Pick Your Role</label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {[
                  { r: "student", label: "Student", icon: <GraduationCap className="w-3.5 h-3.5" /> },
                  { r: "driver", label: "Driver", icon: <Bus className="w-3.5 h-3.5" /> },
                  { r: "admin", label: "Admin Staff", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
                ].map((item) => (
                  <button
                    key={item.r}
                    type="button"
                    onClick={() => setRole(item.r as any)}
                    className={`py-2 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                      role === item.r
                        ? "bg-blue-600/10 border-blue-500 text-blue-300 ring-1 ring-blue-500/30"
                        : "bg-slate-950 border-white/10 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
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
                  required
                  className="w-full bg-slate-950 ring-1 ring-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium">Confirm Password</label>
              <div className="relative mt-1">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-950 ring-1 ring-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-all mt-6 shadow-lg shadow-blue-600/20"
            >
              {loading ? "Registering..." : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
