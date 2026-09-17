import { useState } from "react";
import { busPosition } from "@/useTransitSim";
import { routes } from "@/data";
import type { Bus } from "@/types";
import { Bus as BusIcon, Compass, MapPin } from "lucide-react";

interface Props {
  buses: Bus[];
  selectedStopId: string | null;
  onSelectStop: (stopId: string) => void;
  selectedBusId: string | null;
  onSelectBus: (busId: string) => void;
}

function polyPoints(routeId: string) {
  const r = routes.find((r) => r.id === routeId);
  if (!r) return "";
  const pts = r.path && r.path.length > 0 ? r.path : r.stops;
  return pts.map((s) => `${s.x},${s.y}`).join(" ");
}

export default function TransitMap({ buses, selectedStopId, onSelectStop, selectedBusId, onSelectBus }: Props) {
  const [hoveredStop, setHoveredStop] = useState<string | null>(null);
  const [hoveredBus, setHoveredBus] = useState<string | null>(null);

  const uniqueStops = (() => {
    const map = new Map<string, { id: string; name: string; x: number; y: number }>();
    for (const r of routes) {
      for (const s of r.stops) {
        if (!map.has(s.id)) map.set(s.id, { id: s.id, name: s.name, x: s.x ?? 50, y: s.y ?? 50 });
      }
    }
    return [...map.values()];
  })();

  return (
    <div className="relative w-full h-full min-h-[440px] rounded-2xl overflow-hidden bg-slate-950 ring-1 ring-white/10 shadow-2xl select-none flex flex-col justify-between">
      {/* HUD Header */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2.5 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-xl ring-1 ring-white/10 shadow-lg pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
          <div>
            <div className="text-xs font-semibold text-white tracking-wide flex items-center gap-1.5">
              VIT Bhopal University Campus
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              23.076° N, 76.853° E · Internal Campus Transit
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl ring-1 ring-white/10 text-[11px] text-slate-300 font-mono">
          <Compass className="w-3.5 h-3.5 text-blue-400 animate-spin" style={{ animationDuration: "12s" }} />
          <span>CAMPUS GRID</span>
        </div>
      </div>

      {/* SVG Campus Map */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full flex-1"
        style={{ background: "#090d16" }}
      >
        <defs>
          {/* Subtle tech grid */}
          <pattern id="campus-grid" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M 4 0 L 0 0 0 4" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.2" />
          </pattern>

          {/* Radial glow around center */}
          <radialGradient id="campus-ambience" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(59,130,246,0.12)" />
            <stop offset="60%" stopColor="rgba(30,58,138,0.04)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>

          {/* Road Glow */}
          <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient background & Grid */}
        <rect width="100" height="100" fill="#090d16" />
        <rect width="100" height="100" fill="url(#campus-grid)" />
        <circle cx="50" cy="50" r="48" fill="url(#campus-ambience)" />

        {/* Campus Landscaping & Grounds */}
        {/* Campus Outer Boundary / Campus Green Zone */}
        <polygon
          points="8,92 8,24 24,8 88,8 94,38 92,92"
          fill="#0c1626"
          stroke="rgba(59,130,246,0.2)"
          strokeWidth="0.4"
          strokeDasharray="1.5,1"
        />

        {/* Green Zones / Lawns */}
        {/* Central Lawn */}
        <path
          d="M 42 46 C 45 42, 58 40, 62 48 C 65 54, 52 60, 44 56 Z"
          fill="rgba(16, 185, 129, 0.07)"
          stroke="rgba(16, 185, 129, 0.2)"
          strokeWidth="0.3"
        />
        {/* North-West Greenery */}
        <path
          d="M 14 30 C 18 20, 28 20, 32 28 C 30 38, 16 38, 14 30 Z"
          fill="rgba(16, 185, 129, 0.05)"
          stroke="rgba(16, 185, 129, 0.15)"
          strokeWidth="0.25"
        />

        {/* Sports Ground / Athletic Oval */}
        <ellipse
          cx="62"
          cy="18"
          rx="9"
          ry="6"
          fill="rgba(245, 158, 11, 0.06)"
          stroke="rgba(245, 158, 11, 0.25)"
          strokeWidth="0.35"
        />
        <ellipse
          cx="62"
          cy="18"
          rx="6"
          ry="3.5"
          fill="none"
          stroke="rgba(245, 158, 11, 0.15)"
          strokeWidth="0.25"
          strokeDasharray="0.8,0.8"
        />
        <text x="62" y="18.5" fill="#f59e0b" fontSize="1.8" textAnchor="middle" opacity="0.75" fontWeight="600">
          Sports Field
        </text>

        {/* Bhopal-Indore Highway (NH-46) along the southern front */}
        <g opacity="0.85">
          <rect x="0" y="88" width="100" height="8" fill="#111827" />
          <line x1="0" y1="88" x2="100" y2="88" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" />
          <line x1="0" y1="96" x2="100" y2="96" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" />
          {/* Highway center dash */}
          <line x1="0" y1="92" x2="100" y2="92" stroke="#eab308" strokeWidth="0.4" strokeDasharray="2,2" opacity="0.6" />
          <text x="50" y="93.8" fill="#94a3b8" fontSize="1.6" textAnchor="middle" letterSpacing="0.4">
            ← INDORE (NH-46 / SH-18) BHOPAL →
          </text>
        </g>

        {/* Campus Internal Roads (Background Base Network) */}
        <g stroke="#1e293b" strokeLinecap="round" strokeLinejoin="round">
          {/* Main Internal Avenue: AB1 -> Underbelly -> South Junction */}
          <polyline points="22,25 22,57" strokeWidth="4" />
          {/* Avenue East: Junction -> Girls Hostels -> AB2 -> Boys Hostels */}
          <polyline points="22,57 32,57 40,56 52,67 78,67" strokeWidth="3.5" />
          {/* Link to Main Gate south */}
          <polyline points="22,57 22,86" strokeWidth="2.5" />
          {/* Secondary road links */}
          <line x1="52" y1="67" x2="62" y2="18" strokeWidth="2" />
          <line x1="78" y1="67" x2="62" y2="18" strokeWidth="2" />
        </g>

        {/* Campus Landmark Buildings & Footprints */}
        {/* 1. Main Welcome Gate */}
        <g>
          <rect x="17" y="83" width="10" height="4" rx="0.5" fill="#1e293b" stroke="#3b82f6" strokeWidth="0.3" opacity="0.8" />
          <text x="22" y="89" fill="#93c5fd" fontSize="1.6" textAnchor="middle" fontWeight="500">Main Gate</text>
        </g>

        {/* 2. AB1 (Academic Block 1) */}
        <g>
          <rect x="16" y="20" width="12" height="6.5" rx="0.8" fill="#1e293b" stroke="#60a5fa" strokeWidth="0.4" />
          <rect x="18" y="22" width="8" height="2.5" fill="#0f172a" opacity="0.6" />
          <text x="22" y="18.5" fill="#93c5fd" fontSize="1.7" textAnchor="middle" fontWeight="600">Academic Block 1 (AB1)</text>
        </g>

        {/* 3. Underbelly / Food Court */}
        <g>
          <rect x="17" y="29" width="10" height="5" rx="0.8" fill="#1e293b" stroke="#f59e0b" strokeWidth="0.35" opacity="0.85" />
          <text x="22" y="36" fill="#fcd34d" fontSize="1.5" textAnchor="middle">Underbelly</text>
        </g>

        {/* 4. Girls Hostel Complex */}
        <g>
          <rect x="29" y="47" width="14" height="7" rx="0.6" fill="#1e293b" stroke="#f472b6" strokeWidth="0.35" />
          <text x="36" y="45" fill="#fbcfe8" fontSize="1.6" textAnchor="middle">Girls Hostel Complex</text>
        </g>

        {/* 5. AB2 (Academic Block 2) */}
        <g>
          <rect x="46" y="70" width="13" height="6.5" rx="0.8" fill="#1e293b" stroke="#60a5fa" strokeWidth="0.4" />
          <text x="52.5" y="79" fill="#93c5fd" fontSize="1.6" textAnchor="middle" fontWeight="600">AB2 (Academic Block 2)</text>
        </g>

        {/* 6. Boys Hostel Complex */}
        <g>
          <rect x="73" y="70" width="14" height="7" rx="0.6" fill="#1e293b" stroke="#a78bfa" strokeWidth="0.35" />
          <text x="80" y="79.5" fill="#c4b5fd" fontSize="1.6" textAnchor="middle">Boys Hostels (Block 1 & 3)</text>
        </g>

        {/* Transit Fixed Route Polyline */}
        {routes.map((r) => (
          <g key={r.id}>
            {/* Outer Glow */}
            <polyline
              points={polyPoints(r.id)}
              fill="none"
              stroke={r.color}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.25}
              filter="url(#route-glow)"
            />
            {/* Main Route Line */}
            <polyline
              points={polyPoints(r.id)}
              fill="none"
              stroke={r.color}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
            {/* Inner animated directional stroke */}
            <polyline
              points={polyPoints(r.id)}
              fill="none"
              stroke="#ffffff"
              strokeWidth="0.5"
              strokeDasharray="1.5,2.5"
              opacity={0.7}
            />
          </g>
        ))}

        {/* Campus Bus Stops */}
        {uniqueStops.map((s) => {
          const active = selectedStopId === s.id;
          const isHovered = hoveredStop === s.id;

          return (
            <g
              key={s.id}
              className="cursor-pointer transition-transform"
              onClick={() => onSelectStop(s.id)}
              onMouseEnter={() => setHoveredStop(s.id)}
              onMouseLeave={() => setHoveredStop(null)}
            >
              {/* Active / Hover Pulse Rings */}
              {active && (
                <>
                  <circle cx={s.x} cy={s.y} r="4.2" fill="#fbbf24" opacity="0.25">
                    <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.35;0.1;0.35" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={s.x} cy={s.y} r="2.8" fill="#fbbf24" opacity="0.35" />
                </>
              )}

              {isHovered && !active && (
                <circle cx={s.x} cy={s.y} r="3" fill="#60a5fa" opacity="0.25" />
              )}

              {/* Base Stop Marker */}
              <circle
                cx={s.x}
                cy={s.y}
                r={active ? 1.8 : 1.3}
                fill={active ? "#fbbf24" : "#0f172a"}
                stroke={active ? "#ffffff" : "#38bdf8"}
                strokeWidth={active ? 0.6 : 0.4}
              />
              <circle cx={s.x} cy={s.y} r="0.5" fill={active ? "#0f172a" : "#ffffff"} />

              {/* Stop Label Badge (rendered when active or hovered) */}
              {(active || isHovered) && (
                <g className="pointer-events-none">
                  <rect
                    x={s.x - 12}
                    y={s.y - 6.5}
                    width="24"
                    height="4"
                    rx="1"
                    fill="rgba(15, 23, 42, 0.95)"
                    stroke={active ? "#fbbf24" : "#38bdf8"}
                    strokeWidth="0.3"
                  />
                  <text
                    x={s.x}
                    y={s.y - 3.8}
                    fill="#ffffff"
                    fontSize="1.6"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {s.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Live Buses */}
        {buses.map((b) => {
          const route = routes.find((r) => r.id === b.routeId) || routes[0];
          const p = busPosition(b, route);
          const selected = selectedBusId === b.id;
          const isHovered = hoveredBus === b.id;
          const offline = b.status === "offline";

          return (
            <g
              key={b.id}
              className="cursor-pointer"
              onClick={() => onSelectBus(b.id)}
              onMouseEnter={() => setHoveredBus(b.id)}
              onMouseLeave={() => setHoveredBus(null)}
            >
              {/* Active or Selected Bus Aura */}
              {(selected || !offline) && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={selected ? 4.5 : 3.2}
                  fill={selected ? "#fbbf24" : route.color}
                  opacity={selected ? 0.35 : 0.2}
                >
                  {!offline && (
                    <animate attributeName="r" values="3;4.2;3" dur="2.5s" repeatCount="indefinite" />
                  )}
                </circle>
              )}

              {/* Main Bus Dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r={selected ? 2.2 : 1.7}
                fill={offline ? "#64748b" : selected ? "#fbbf24" : route.color}
                stroke="#ffffff"
                strokeWidth={selected ? 0.7 : 0.45}
              />
              <circle cx={p.x} cy={p.y} r="0.6" fill="#ffffff" opacity={offline ? 0.4 : 0.95} />

              {/* Bus Hover / Selection Label */}
              {(selected || isHovered) && (
                <g className="pointer-events-none">
                  <rect
                    x={p.x - 10}
                    y={p.y + 3.2}
                    width="20"
                    height="3.6"
                    rx="0.8"
                    fill="rgba(15, 23, 42, 0.95)"
                    stroke={selected ? "#fbbf24" : "#ffffff"}
                    strokeWidth="0.3"
                  />
                  <text
                    x={p.x}
                    y={p.y + 5.7}
                    fill="#ffffff"
                    fontSize="1.5"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {b.id} · {b.plate}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Map Footer / Legend */}
      <div className="p-3 flex flex-wrap items-center justify-between gap-2 bg-slate-950/90 backdrop-blur border-t border-white/10 text-xs">
        <div className="flex items-center gap-3">
          {routes.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
              <span className="font-medium">{r.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] border-l border-white/10 pl-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Predefined Stops (6)
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <MapPin className="w-3 h-3 text-amber-400" />
          <span>Tap any stop or bus for live route ETAs</span>
        </div>
      </div>
    </div>
  );
}
