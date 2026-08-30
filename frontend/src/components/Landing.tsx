import { Bus, GraduationCap, ShieldCheck, MapPin, Clock, Users } from "lucide-react";
import type { Role } from "@/types";

interface Props {
  onPick: (r: Role) => void;
}

export default function Landing({ onPick }: Props) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Bus className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold leading-tight">CampusTrack</div>
            <div className="text-[11px] text-slate-400 leading-tight">Live Bus Tracking & ETA</div>
          </div>
        </div>
        <span className="text-xs text-slate-400 hidden sm:block">Interactive Prototype</span>
      </header>

      {/* hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-4xl w-full text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 ring-1 ring-blue-400/30 text-blue-300 text-xs mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> Live demo running
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
            Know exactly when your bus arrives.
          </h1>
          <p className="mt-4 text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
            Real-time campus bus tracking with predicted arrival times, live occupancy, and a full admin fleet
            dashboard. Choose a portal to explore the prototype.
          </p>

          {/* feature pills */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {[
              { icon: <MapPin className="w-4 h-4" />, t: "Live GPS map" },
              { icon: <Clock className="w-4 h-4" />, t: "ETA prediction" },
              { icon: <Users className="w-4 h-4" />, t: "Crowd levels" },
            ].map((f) => (
              <div key={f.t} className="flex items-center justify-center gap-2 text-sm text-slate-300 bg-slate-900/60 ring-1 ring-white/10 rounded-xl py-2.5">
                <span className="text-blue-400">{f.icon}</span>
                {f.t}
              </div>
            ))}
          </div>

          {/* portal cards */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <button
              onClick={() => onPick("student")}
              className="group text-left rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-5 hover:ring-blue-400/40 hover:bg-blue-500/5 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-600/20 text-blue-300 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="font-semibold text-lg">Student Portal</div>
              <div className="text-sm text-slate-400 mt-1">Track your bus, see ETAs and crowd levels for any stop.</div>
              <div className="mt-3 text-blue-300 text-sm font-medium flex items-center gap-1">
                Open portal →
              </div>
            </button>

            <button
              onClick={() => onPick("admin")}
              className="group text-left rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-5 hover:ring-emerald-400/40 hover:bg-emerald-500/5 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-600/20 text-emerald-300 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="font-semibold text-lg">Admin Portal</div>
              <div className="text-sm text-slate-400 mt-1">Monitor the whole fleet, dispatch and manage routes.</div>
              <div className="mt-3 text-emerald-300 text-sm font-medium flex items-center gap-1">
                Open portal →
              </div>
            </button>
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-slate-500 border-t border-white/10">
        Prototype — simulated data. See the guide at the end to run it on your laptop.
      </footer>
    </div>
  );
}
