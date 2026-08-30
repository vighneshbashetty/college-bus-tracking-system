import { useEffect, useRef, useState } from "react";
import { LogOut, Play, Square, Users, Gauge, MapPin, AlertCircle, RefreshCw } from "lucide-react";
import { api, ApiDriver } from "@/services/api";
import { routes } from "@/data";
import { Card, OccupancyBar, SectionTitle, StatusBadge } from "@/components/ui";
import TransitMap from "@/components/TransitMap";
import type { Bus, Route } from "@/types";

interface Props {
  onLogout: () => void;
}

// Distance along a route's polyline at a normalized progress 0-1
function calculateRoutePoint(route: Route, t: number) {
  const segs = route.stops.length - 1;
  const total = t * segs;
  const i = Math.min(Math.floor(total), segs - 1);
  const local = total - i;
  const a = route.stops[i];
  const b = route.stops[i + 1];
  return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local };
}

export default function DriverPortal({ onLogout }: Props) {
  const [driver, setDriver] = useState<ApiDriver | null>(null);
  const [bus, setBus] = useState<Bus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTripActive, setIsTripActive] = useState(false);

  const lastTickTime = useRef<number>(performance.now());
  const animationFrameId = useRef<number>(0);
  const syncIntervalId = useRef<any>(null);

  // 1. Fetch current driver profile and associated bus on mount
  const fetchProfileAndBus = async () => {
    setLoading(true);
    setError(null);
    try {
      const drivers = await api.getDrivers();
      const myEmail = api.emailValue;
      const me = drivers.find((d) => d.email === myEmail);
      if (!me) {
        throw new Error("Could not retrieve driver profile matching your account.");
      }
      setDriver(me);

      if (me.bus_id) {
        const buses = await api.getBuses();
        const myBus = buses.find((b) => b.id === me.bus_id);
        if (myBus) {
          setBus(myBus);
          setIsTripActive(myBus.status !== "offline");
        } else {
          setBus(null);
        }
      } else {
        setBus(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load driver status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndBus();
    return () => {
      cancelAnimationFrame(animationFrameId.current);
      clearInterval(syncIntervalId.current);
    };
  }, []);

  // 2. Simulation Loop: Runs locally when trip is active to move the bus on the map
  useEffect(() => {
    if (!isTripActive || !bus) {
      cancelAnimationFrame(animationFrameId.current);
      return;
    }

    lastTickTime.current = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTickTime.current) / 1000, 0.1);
      lastTickTime.current = now;

      setBus((prevBus) => {
        if (!prevBus || prevBus.status === "offline") return prevBus;
        
        let progress = prevBus.progress + (prevBus.speed * dt) / 100;
        let direction = prevBus.direction;

        if (progress >= 1) {
          progress = 1;
          direction = -1;
        } else if (progress <= 0) {
          progress = 0;
          direction = 1;
        }

        return { ...prevBus, progress, direction };
      });

      animationFrameId.current = requestAnimationFrame(loop);
    };

    animationFrameId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId.current);
  }, [isTripActive, !!bus]);

  // 3. Database synchronization loop: Pushes progress to FastAPI every 2 seconds
  useEffect(() => {
    if (!isTripActive || !bus) {
      clearInterval(syncIntervalId.current);
      return;
    }

    syncIntervalId.current = setInterval(async () => {
      // Access the latest bus state using functional update ref trick or direct read
      // Since setInterval captures the bus variable closure, we'll write a sync function
    }, 2000);

    return () => clearInterval(syncIntervalId.current);
  }, [isTripActive, !!bus]);

  // Handle active synchronization using a ref to prevent closure staleness
  const busRef = useRef<Bus | null>(null);
  busRef.current = bus;

  useEffect(() => {
    if (!isTripActive || !bus) return;
    
    const interval = setInterval(async () => {
      const currentBus = busRef.current;
      if (currentBus && currentBus.status !== "offline") {
        try {
          // Update DB state
          await api.updateBus(currentBus.id, {
            progress: currentBus.progress,
            direction: currentBus.direction,
            status: currentBus.status,
            occupancy: currentBus.occupancy,
            speed: currentBus.speed,
            delay_minutes: currentBus.delayMinutes
          });

          // Also record location history
          const route = routes.find((r) => r.id === currentBus.routeId);
          if (route) {
            const pos = calculateRoutePoint(route, currentBus.progress);
            await api.sendLocation(currentBus.id, pos.x, pos.y);
          }
        } catch (err) {
          console.error("Failed to sync location with server:", err);
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isTripActive]);

  // Action: Start Trip
  const handleStartTrip = async () => {
    if (!bus) return;
    try {
      const updated = await api.updateBus(bus.id, {
        status: "on-time",
        speed: 1.4,
        progress: bus.progress || 0.0,
        direction: 1
      });
      setBus(updated);
      setIsTripActive(true);
    } catch (err: any) {
      alert("Failed to start trip on server: " + err.message);
    }
  };

  // Action: End Trip
  const handleEndTrip = async () => {
    if (!bus) return;
    try {
      const updated = await api.updateBus(bus.id, {
        status: "offline",
        speed: 0.0,
        occupancy: 0
      });
      setBus(updated);
      setIsTripActive(false);
    } catch (err: any) {
      alert("Failed to end trip on server: " + err.message);
    }
  };

  // Action: Modify Occupancy local and trigger sync
  const handleOccupancyChange = async (val: number) => {
    if (!bus) return;
    setBus(prev => prev ? { ...prev, occupancy: val } : null);
    try {
      await api.updateBus(bus.id, { occupancy: val });
    } catch (err) {
      console.error("Failed to update occupancy on server", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-slate-400 text-sm">Loading driver profile...</span>
        </div>
      </div>
    );
  }

  const selectedRouteObj = bus ? routes.find((r) => r.id === bus.routeId) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight">Driver Portal</div>
            <div className="text-[11px] text-slate-400 leading-tight">Welcome, {driver?.name}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/10 hover:text-rose-300 ring-1 ring-white/10 hover:ring-rose-500/20 text-xs text-slate-300 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Log Out
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 p-4 sm:p-6">
        {/* Left Column: Live Map */}
        <div className="flex flex-col gap-4 min-h-[420px] lg:min-h-0">
          <div className="flex-1 rounded-2xl overflow-hidden relative border border-white/5">
            <TransitMap
              buses={bus ? [bus] : []}
              selectedStopId={null}
              onSelectStop={() => {}}
              selectedBusId={bus ? bus.id : null}
              onSelectBus={() => {}}
            />
          </div>
        </div>

        {/* Right Column: Trip Controls */}
        <aside className="flex flex-col gap-4">
          {!bus ? (
            <Card className="p-6 border-dashed border-amber-500/30 flex flex-col items-center justify-center text-center flex-1">
              <AlertCircle className="w-12 h-12 text-amber-400 mb-3 animate-pulse" />
              <h3 className="font-semibold text-base">No Bus Assigned</h3>
              <p className="text-sm text-slate-400 mt-2 max-w-xs">
                You are currently not assigned to any active vehicle. Contact your operations manager to configure driver assignments.
              </p>
              <button
                onClick={fetchProfileAndBus}
                className="mt-6 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-2 ring-1 ring-white/10"
              >
                <RefreshCw className="w-3 h-3" /> Check for Assignment
              </button>
            </Card>
          ) : (
            <div className="flex flex-col gap-4 flex-1">
              {/* Trip Control Card */}
              <Card className="p-5">
                <SectionTitle icon={<Gauge className="w-4 h-4 text-indigo-400" />}>Trip Console</SectionTitle>
                
                <div className="mt-4 flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 ring-1 ring-white/5">
                  <div>
                    <h3 className="text-lg font-bold">{bus.id}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{bus.plate}</p>
                  </div>
                  <StatusBadge status={bus.status} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/50">
                    <span className="text-slate-500 block">Assigned Route</span>
                    <span className="font-semibold text-slate-200 mt-1 block">
                      {selectedRouteObj ? selectedRouteObj.name.split("—")[0] : "—"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/50">
                    <span className="text-slate-500 block">Current Location</span>
                    <span className="font-semibold text-slate-200 mt-1 block flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-400" />
                      {(bus.progress * 100).toFixed(0)}% along route
                    </span>
                  </div>
                </div>

                {/* Primary Actions */}
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    onClick={handleStartTrip}
                    disabled={isTripActive}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-600/10"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Start Trip
                  </button>
                  <button
                    onClick={handleEndTrip}
                    disabled={!isTripActive}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-semibold text-xs transition-all shadow-lg shadow-rose-600/10"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    End Trip
                  </button>
                </div>
              </Card>

              {/* Adjust Passenger Density Card */}
              <Card className="p-5">
                <SectionTitle icon={<Users className="w-4 h-4 text-indigo-400" />}>Crowd Operations</SectionTitle>
                <p className="text-xs text-slate-400 mt-2">
                  Update passengers currently on board. This recalculates predicted ETAs and occupancy metrics for students.
                </p>

                <div className="mt-5 p-4 rounded-2xl bg-slate-950 ring-1 ring-white/5">
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-xs text-slate-500">Current Occupancy</span>
                    <span className="text-xl font-bold text-slate-200 tabular-nums">
                      {bus.occupancy} <span className="text-xs font-normal text-slate-500">/ {bus.capacity}</span>
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={bus.capacity}
                    value={bus.occupancy}
                    disabled={!isTripActive}
                    onChange={(e) => handleOccupancyChange(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  />

                  <div className="mt-3">
                    <OccupancyBar pct={Math.round((bus.occupancy / bus.capacity) * 100)} />
                  </div>
                </div>
              </Card>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
