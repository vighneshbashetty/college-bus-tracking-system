import type { Bus } from "@/types";

const map: Record<Bus["status"], { label: string; cls: string; dot: string }> = {
  "on-time": { label: "On time", cls: "text-emerald-300 bg-emerald-500/10 ring-emerald-400/30", dot: "bg-emerald-400" },
  delayed: { label: "Delayed", cls: "text-amber-300 bg-amber-500/10 ring-amber-400/30", dot: "bg-amber-400" },
  boarding: { label: "Boarding", cls: "text-sky-300 bg-sky-500/10 ring-sky-400/30", dot: "bg-sky-400" },
  offline: { label: "Offline", cls: "text-slate-400 bg-slate-500/10 ring-slate-400/20", dot: "bg-slate-500" },
};

export function StatusBadge({ status }: { status: Bus["status"] }) {
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${status !== "offline" ? "animate-pulse" : ""}`} />
      {s.label}
    </span>
  );
}

export function OccupancyBar({ pct }: { pct: number }) {
  const color = pct >= 85 ? "bg-rose-500" : pct >= 60 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-slate-400 w-8 text-right tabular-nums">{pct}%</span>
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-slate-900/60 ring-1 ring-white/10 backdrop-blur ${className}`}>{children}</div>
  );
}

export function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-slate-200 font-semibold">
      {icon}
      {children}
    </div>
  );
}
