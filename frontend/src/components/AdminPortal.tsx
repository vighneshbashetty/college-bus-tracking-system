import { useState, useEffect } from "react";
import {
  ArrowLeft, Bus as BusIcon, Activity, AlertTriangle, Users, Gauge, Route as RouteIcon,
  Power, Play, Pause, CircleDot, MapPin, Plus, Trash2, Edit, Check, X, ShieldAlert, QrCode, Ticket, CheckCircle2, LogOut, Sparkles
} from "lucide-react";
import TransitMap from "@/components/TransitMap";
import { Card, OccupancyBar, SectionTitle, StatusBadge } from "@/components/ui";
import { routes, initialBuses } from "@/data";
import type { Bus } from "@/types";
import { api, ApiDriver } from "@/services/api";

interface Props {
  buses: Bus[];
  setBuses: React.Dispatch<React.SetStateAction<Bus[]>>;
  onBack: () => void;
  isConnected?: boolean;
}

export default function AdminPortal({ buses, setBuses, onBack, isConnected = false }: Props) {
  // Tabs: 'fleet', 'drivers', or 'passes'
  const [activeTab, setActiveTab] = useState<"fleet" | "drivers" | "passes">("fleet");
  const [selectedBus, setSelectedBus] = useState<string | null>(null);

  // List of drivers (active state)
  const [drivers, setDrivers] = useState<ApiDriver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  // Modal States
  const [busModal, setBusModal] = useState<{ show: boolean; mode: "add" | "edit"; id: string; routeId: string; plate: string; capacity: number } | null>(null);
  const [driverModal, setDriverModal] = useState<{ show: boolean; mode: "add" | "edit"; id?: number; name: string; email: string; password?: string; busId: string } | null>(null);

  // Load selected bus if none is selected
  useEffect(() => {
    if (buses.length > 0 && !selectedBus) {
      setSelectedBus(buses[0].id);
    }
  }, [buses]);

  // Fetch drivers from API or fallback
  const fetchDrivers = async () => {
    if (!isConnected) {
      // Mock offline drivers if not connected
      setDrivers([
        { id: 1, user_id: 2, name: "R. Sharma", bus_id: "BUS-101", email: "driver.sharma@college.edu" },
        { id: 2, user_id: 3, name: "M. Iyer", bus_id: "BUS-102", email: "driver.iyer@college.edu" },
        { id: 3, user_id: 4, name: "S. Nair", bus_id: "BUS-201", email: "driver.nair@college.edu" },
        { id: 4, user_id: 5, name: "A. Khan", bus_id: "BUS-301", email: "driver.khan@college.edu" }
      ]);
      return;
    }
    setLoadingDrivers(true);
    try {
      const data = await api.getDrivers();
      setDrivers(data);
    } catch (err) {
      console.error("Failed to fetch drivers:", err);
    } finally {
      setLoadingDrivers(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [isConnected, activeTab]);

  // Statistics Computations
  const active = buses.filter((b) => b.status !== "offline").length;
  const delayed = buses.filter((b) => b.status === "delayed").length;
  const totalOcc = buses.reduce((a, b) => a + b.occupancy, 0);
  const totalCap = buses.reduce((a, b) => a + b.capacity, 0);
  const avgOcc = Math.round((totalOcc / Math.max(totalCap, 1)) * 100);

  const selectedBusObj = buses.find((b) => b.id === selectedBus) || null;

  // --- Bus API Integrations ---

  const handleUpdateBusStatus = async (id: string, patch: Partial<Bus>) => {
    // Map frontend keys to backend snake_case parameters if connected
    if (isConnected) {
      try {
        const backendPatch: any = {};
        if (patch.status !== undefined) backendPatch.status = patch.status;
        if (patch.speed !== undefined) backendPatch.speed = patch.speed;
        if (patch.occupancy !== undefined) backendPatch.occupancy = patch.occupancy;
        if (patch.delayMinutes !== undefined) backendPatch.delay_minutes = patch.delayMinutes;
        
        await api.updateBus(id, backendPatch);
      } catch (err) {
        console.error("Failed to update bus on server:", err);
      }
    }
    // Update local state immediately
    setBuses((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const handleSaveBus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!busModal) return;

    const payload = {
      id: busModal.id,
      route_id: busModal.routeId,
      plate: busModal.plate,
      capacity: busModal.capacity,
      occupancy: 0,
      speed: 0.0,
      status: "offline" as const,
      progress: 0.0,
      direction: 1 as const,
      delay_minutes: 0
    };

    if (isConnected) {
      try {
        if (busModal.mode === "add") {
          await api.createBus(payload);
        } else {
          await api.updateBus(busModal.id, {
            route_id: busModal.routeId,
            plate: busModal.plate,
            capacity: busModal.capacity
          });
        }
      } catch (err: any) {
        alert("Server error: " + err.message);
        return;
      }
    }

    // Local UI update
    if (busModal.mode === "add") {
      const newBus: Bus = {
        id: busModal.id,
        routeId: busModal.routeId,
        plate: busModal.plate,
        capacity: busModal.capacity,
        occupancy: 0,
        speed: 0.0,
        status: "offline",
        progress: 0.0,
        direction: 1,
        delayMinutes: 0,
        driver: "None"
      };
      setBuses((prev) => [...prev, newBus]);
      setSelectedBus(newBus.id);
    } else {
      setBuses((prev) =>
        prev.map((b) =>
          b.id === busModal.id
            ? { ...b, routeId: busModal.routeId, plate: busModal.plate, capacity: busModal.capacity }
            : b
        )
      );
    }

    setBusModal(null);
  };

  const handleDeleteBus = async (id: string) => {
    if (!confirm(`Are you sure you want to delete bus ${id}?`)) return;

    if (isConnected) {
      try {
        await api.deleteBus(id);
      } catch (err: any) {
        alert("Server error deleting bus: " + err.message);
        return;
      }
    }

    setBuses((prev) => prev.filter((b) => b.id !== id));
    if (selectedBus === id) {
      setSelectedBus(buses.find((b) => b.id !== id)?.id || null);
    }
  };

  // --- Driver API Integrations ---

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverModal) return;

    if (isConnected) {
      try {
        if (driverModal.mode === "add") {
          await api.createDriver({
            email: driverModal.email,
            password: driverModal.password || "password123",
            name: driverModal.name,
            bus_id: driverModal.busId !== "none" ? driverModal.busId : null
          });
        } else if (driverModal.id) {
          await api.updateDriver(driverModal.id, {
            email: driverModal.email,
            name: driverModal.name,
            bus_id: driverModal.busId !== "none" ? driverModal.busId : "",
            password: driverModal.password || undefined
          });
        }
      } catch (err: any) {
        alert("Server error saving driver: " + err.message);
        return;
      }
    }

    // Refresh drivers & update buses locally to show drivers correctly
    await fetchDrivers();
    setDriverModal(null);
  };

  const handleDeleteDriver = async (id: number) => {
    if (!confirm("Are you sure you want to delete this driver? This will delete their login credentials.")) return;

    if (isConnected) {
      try {
        await api.deleteDriver(id);
      } catch (err: any) {
        alert("Server error deleting driver: " + err.message);
        return;
      }
    }

    setDrivers((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/10 text-slate-300">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <BusIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-sm leading-tight">Admin Portal</div>
              <div className="text-[11px] text-slate-400 leading-tight">
                {isConnected ? "Connected Database Mode" : "Demo Mode"}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-900 ring-1 ring-white/10 rounded-xl p-1 flex gap-1">
          <button
            onClick={() => setActiveTab("fleet")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "fleet" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Fleet Operations
          </button>
          <button
            onClick={() => setActiveTab("drivers")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "drivers" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Manage Drivers
          </button>
          <button
            onClick={() => setActiveTab("passes")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "passes" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Pass Analytics
          </button>
        </div>

        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/15 text-slate-300 hover:text-rose-300 ring-1 ring-white/10 hover:ring-rose-500/30 text-xs font-semibold transition-all"
          title="Log out and return to login interface"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Log Out</span>
        </button>
      </header>

      {activeTab === "fleet" ? (
        /* --- Fleet Tab View --- */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 p-4 sm:p-6">
          {/* Left Panel: Map + Quick Stats */}
          <div className="flex flex-col gap-4 min-h-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat icon={<Activity className="w-4 h-4" />} label="Active buses" value={`${active}/${buses.length}`} tone="blue" />
              <Stat icon={<AlertTriangle className="w-4 h-4" />} label="Delayed" value={`${delayed}`} tone="amber" />
              <Stat icon={<Users className="w-4 h-4" />} label="Avg occupancy" value={`${avgOcc}%`} tone="emerald" />
              <Stat icon={<RouteIcon className="w-4 h-4" />} label="Routes" value={`${routes.length}`} tone="slate" />
            </div>

            <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/20 flex flex-wrap items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    AI Predictive Dispatch & Delay Engine
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      R²: 0.94 • Active
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Random Forest Regressor monitoring campus rush hours, weather slowdowns & boarding dwell times.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[11px] text-slate-400">Model Accuracy:</span>
                <span className="font-mono font-bold text-indigo-300">MAE 0.33 min</span>
              </div>
            </div>

            <div className="min-h-[420px] lg:flex-1 rounded-2xl overflow-hidden border border-white/5">
              <TransitMap
                buses={buses}
                selectedStopId={null}
                onSelectStop={() => {}}
                selectedBusId={selectedBus}
                onSelectBus={setSelectedBus}
              />
            </div>
          </div>

          {/* Right Panel: Fleet list + control card */}
          <aside className="flex flex-col gap-4 min-h-0">
            <Card className="p-4 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between">
                <SectionTitle icon={<BusIcon className="w-4 h-4 text-emerald-400" />}>Fleet List</SectionTitle>
                <button
                  onClick={() => setBusModal({ show: true, mode: "add", id: "", routeId: "R1", plate: "", capacity: 48 })}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold flex items-center gap-1 shadow-lg shadow-emerald-600/10"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Bus
                </button>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                {buses.length === 0 && (
                  <div className="text-center text-xs text-slate-500 py-8">No buses configured yet. Click "Add Bus" to build your fleet.</div>
                )}
                {buses.map((b) => {
                  const route = routes.find((r) => r.id === b.routeId);
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBus(b.id)}
                      className={`text-left p-3 rounded-xl ring-1 transition-all ${
                        selectedBus === b.id ? "ring-emerald-400/50 bg-emerald-500/10" : "ring-white/10 bg-slate-900/40 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: route?.color }} />
                          <span className="font-medium text-sm">{b.id}</span>
                        </div>
                        <StatusBadge status={b.status} />
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                        <span className="flex items-center gap-1"><RouteIcon className="w-3 h-3" />{route?.name.split("—")[0]}</span>
                        <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />{b.speed.toFixed(1)} u/s</span>
                        <span className="text-slate-400">Driver: {b.driver}</span>
                      </div>
                      <div className="mt-2"><OccupancyBar pct={Math.round((b.occupancy / b.capacity) * 100)} /></div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {selectedBusObj && (
              <Card className="p-4 ring-emerald-400/30">
                <div className="flex items-center justify-between">
                  <SectionTitle icon={<CircleDot className="w-4 h-4 text-emerald-400" />}>Control · {selectedBusObj.id}</SectionTitle>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBusModal({
                        show: true,
                        mode: "edit",
                        id: selectedBusObj.id,
                        routeId: selectedBusObj.routeId,
                        plate: selectedBusObj.plate,
                        capacity: selectedBusObj.capacity
                      })}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-slate-800 ring-1 ring-white/10 text-slate-300"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteBus(selectedBusObj.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 ring-1 ring-rose-500/20 text-rose-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Info label="Driver" value={selectedBusObj.driver} />
                  <Info label="Plate" value={selectedBusObj.plate} />
                  <Info label="Route" value={routes.find((r) => r.id === selectedBusObj.routeId)?.name || "—"} />
                  <Info label="Delay" value={selectedBusObj.delayMinutes ? `${selectedBusObj.delayMinutes} min` : "On time"} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedBusObj.status === "offline" ? (
                    <ActionBtn onClick={() => handleUpdateBusStatus(selectedBusObj.id, { status: "on-time", speed: 1.4 })} icon={<Power className="w-3.5 h-3.5" />} tone="emerald">
                      Bring online
                    </ActionBtn>
                  ) : (
                    <ActionBtn onClick={() => handleUpdateBusStatus(selectedBusObj.id, { status: "offline", speed: 0, progress: 0 })} icon={<Power className="w-3.5 h-3.5" />} tone="rose">
                      Take offline
                    </ActionBtn>
                  )}
                  {selectedBusObj.status === "boarding" ? (
                    <ActionBtn onClick={() => handleUpdateBusStatus(selectedBusObj.id, { status: "on-time", speed: 1.4 })} icon={<Play className="w-3.5 h-3.5" />} tone="blue">
                      Depart
                    </ActionBtn>
                  ) : selectedBusObj.status !== "offline" ? (
                    <ActionBtn onClick={() => handleUpdateBusStatus(selectedBusObj.id, { status: "boarding", speed: 0 })} icon={<Pause className="w-3.5 h-3.5" />} tone="amber">
                      Hold at stop
                    </ActionBtn>
                  ) : null}
                  <ActionBtn
                    onClick={() => handleUpdateBusStatus(selectedBusObj.id, { status: "delayed", delayMinutes: Math.max(5, selectedBusObj.delayMinutes + 3) })}
                    icon={<AlertTriangle className="w-3.5 h-3.5" />}
                    tone="amber"
                  >
                    Report delay
                  </ActionBtn>
                  <ActionBtn
                    onClick={() => handleUpdateBusStatus(selectedBusObj.id, { status: "on-time", delayMinutes: 0 })}
                    icon={<MapPin className="w-3.5 h-3.5" />}
                    tone="slate"
                  >
                    Clear status
                  </ActionBtn>
                </div>

                <div className="mt-4">
                  <div className="text-[11px] text-slate-500 mb-1">Adjust occupancy</div>
                  <input
                    type="range"
                    min={0}
                    max={selectedBusObj.capacity}
                    value={selectedBusObj.occupancy}
                    onChange={(e) => handleUpdateBusStatus(selectedBusObj.id, { occupancy: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                  <div className="text-xs text-slate-400 mt-1">{selectedBusObj.occupancy}/{selectedBusObj.capacity} passengers</div>
                </div>
              </Card>
            )}
          </aside>
        </div>
      ) : activeTab === "drivers" ? (
        /* --- Driver Management Tab View --- */
        <div className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full">
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" /> Driver Management
                </h2>
                <p className="text-slate-400 text-xs mt-1">Configure user accounts for drivers and link them to vehicles</p>
              </div>
              <button
                onClick={() => setDriverModal({ show: true, mode: "add", name: "", email: "", password: "", busId: "none" })}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/10"
              >
                <Plus className="w-4 h-4" /> Add Driver
              </button>
            </div>

            {loadingDrivers ? (
              <div className="text-center text-xs text-slate-500 py-12 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Loading database driver profiles...
              </div>
            ) : drivers.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-12">No drivers registered. Click "Add Driver" to create a new driver account.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="py-3 px-4">Driver Name</th>
                      <th className="py-3 px-4">Account Email</th>
                      <th className="py-3 px-4">Assigned Vehicle</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((d) => (
                      <tr key={d.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-200">{d.name}</td>
                        <td className="py-3.5 px-4 text-slate-400">{d.email}</td>
                        <td className="py-3.5 px-4">
                          {d.bus_id ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-400/20 text-xs font-semibold">
                              {d.bus_id}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setDriverModal({
                                show: true,
                                mode: "edit",
                                id: d.id,
                                name: d.name,
                                email: d.email,
                                password: "",
                                busId: d.bus_id || "none"
                              })}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-slate-800 text-slate-300 transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteDriver(d.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* --- Digital Pass Analytics View --- */
        <div className="flex-1 p-4 sm:p-6 space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400">
                <Ticket className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Issued Passes Today</p>
                <p className="text-xl font-bold text-white mt-0.5">142</p>
              </div>
            </Card>

            <Card className="p-4 flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Valid Boardings Today</p>
                <p className="text-xl font-bold text-white mt-0.5">118</p>
              </div>
            </Card>

            <Card className="p-4 flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Active Digital Tickets</p>
                <p className="text-xl font-bold text-white mt-0.5">24</p>
              </div>
            </Card>

            <Card className="p-4 flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Peak Hour Boarding</p>
                <p className="text-xl font-bold text-white mt-0.5">08:30 - 09:15 AM</p>
              </div>
            </Card>
          </div>

          {/* Pass Verification Audit Log Table */}
          <Card className="p-5">
            <SectionTitle icon={<QrCode className="w-4 h-4 text-emerald-400" />}>
              Campus Boarding & Pass Scan Ledger
            </SectionTitle>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="pb-3 px-3 font-semibold">Pass Code</th>
                    <th className="pb-3 px-3 font-semibold">Student Name</th>
                    <th className="pb-3 px-3 font-semibold">Email</th>
                    <th className="pb-3 px-3 font-semibold">Route</th>
                    <th className="pb-3 px-3 font-semibold">Scanned Bus</th>
                    <th className="pb-3 px-3 font-semibold">Status</th>
                    <th className="pb-3 px-3 font-semibold">Boarding Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { code: 'PASS-20260903-A1B2C3', name: 'Aarav Sharma', email: 'student.aarav@college.edu', route: 'R1 (Campus Express)', bus: 'BUS-101', status: 'Boarded', time: '08:42 AM' },
                    { code: 'PASS-20260903-X9Y8Z7', name: 'Ananya Verma', email: 'ananya.verma@college.edu', route: 'R2 (North Loop)', bus: 'BUS-102', status: 'Boarded', time: '08:50 AM' },
                    { code: 'PASS-20260903-K4L5M6', name: 'Rohit Patel', email: 'rohit.p@college.edu', route: 'R1 (Campus Express)', bus: 'BUS-101', status: 'Boarded', time: '08:55 AM' },
                    { code: 'PASS-20260903-P7Q8R9', name: 'Priya Singh', email: 'priya.singh@college.edu', route: 'R3 (Hostel Shuttle)', bus: 'BUS-201', status: 'Active', time: 'Pending' },
                    { code: 'PASS-20260903-T1U2V3', name: 'Vikram Joshi', email: 'vikram.j@college.edu', route: 'R2 (North Loop)', bus: 'BUS-102', status: 'Active', time: 'Pending' }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-indigo-300">{row.code}</td>
                      <td className="py-3 px-3 text-slate-200 font-medium">{row.name}</td>
                      <td className="py-3 px-3 text-slate-400">{row.email}</td>
                      <td className="py-3 px-3 text-slate-300">{row.route}</td>
                      <td className="py-3 px-3 font-semibold text-emerald-400">{row.bus}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          row.status === 'Boarded'
                            ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30'
                            : 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/30'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono">{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* --- Add / Edit Bus Modal Dialog --- */}
      {busModal && busModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <Card className="w-full max-w-md p-6 ring-emerald-500/30">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">{busModal.mode === "add" ? "Register New Bus" : "Edit Vehicle Details"}</h3>
              <button onClick={() => setBusModal(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBus} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">Vehicle ID</label>
                <input
                  type="text"
                  required
                  disabled={busModal.mode === "edit"}
                  value={busModal.id}
                  onChange={(e) => setBusModal(prev => prev ? { ...prev, id: e.target.value.toUpperCase() } : null)}
                  placeholder="e.g., BUS-105"
                  className="w-full bg-slate-950 ring-1 ring-white/10 rounded-xl px-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Assigned Loop Route</label>
                <select
                  value={busModal.routeId}
                  onChange={(e) => setBusModal(prev => prev ? { ...prev, routeId: e.target.value } : null)}
                  className="w-full bg-slate-950 ring-1 ring-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">License Plate</label>
                <input
                  type="text"
                  required
                  value={busModal.plate}
                  onChange={(e) => setBusModal(prev => prev ? { ...prev, plate: e.target.value.toUpperCase() } : null)}
                  placeholder="e.g., KA-01-AA-9999"
                  className="w-full bg-slate-950 ring-1 ring-white/10 rounded-xl px-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Passenger Capacity</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={busModal.capacity}
                  onChange={(e) => setBusModal(prev => prev ? { ...prev, capacity: Number(e.target.value) } : null)}
                  className="w-full bg-slate-950 ring-1 ring-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setBusModal(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold ring-1 ring-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-all"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* --- Add / Edit Driver Modal Dialog --- */}
      {driverModal && driverModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <Card className="w-full max-w-md p-6 ring-emerald-500/30">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">{driverModal.mode === "add" ? "Register Driver Account" : "Edit Driver Account"}</h3>
              <button onClick={() => setDriverModal(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">Driver Full Name</label>
                <input
                  type="text"
                  required
                  value={driverModal.name}
                  onChange={(e) => setDriverModal(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="e.g., Vikram Singh"
                  className="w-full bg-slate-950 ring-1 ring-white/10 rounded-xl px-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Login Email</label>
                <input
                  type="email"
                  required
                  value={driverModal.email}
                  onChange={(e) => setDriverModal(prev => prev ? { ...prev, email: e.target.value } : null)}
                  placeholder="e.g., driver.vikram@college.edu"
                  className="w-full bg-slate-950 ring-1 ring-white/10 rounded-xl px-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">
                  {driverModal.mode === "add" ? "Credentials Password" : "Change Password (leave blank to keep current)"}
                </label>
                <input
                  type="password"
                  required={driverModal.mode === "add"}
                  value={driverModal.password}
                  onChange={(e) => setDriverModal(prev => prev ? { ...prev, password: e.target.value } : null)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 ring-1 ring-white/10 rounded-xl px-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Assign Bus</label>
                <select
                  value={driverModal.busId}
                  onChange={(e) => setDriverModal(prev => prev ? { ...prev, busId: e.target.value } : null)}
                  className="w-full bg-slate-950 ring-1 ring-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="none">Unassigned (None)</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>{b.id} ({routes.find((r) => r.id === b.routeId)?.name.split("—")[0]})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setDriverModal(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold ring-1 ring-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-all"
                >
                  Save Driver
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

// Subcomponents helper
function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "blue" | "amber" | "emerald" | "slate" }) {
  const tones: Record<string, string> = {
    blue: "text-blue-300 bg-blue-500/10",
    amber: "text-amber-300 bg-amber-500/10",
    emerald: "text-emerald-300 bg-emerald-500/10",
    slate: "text-slate-300 bg-slate-500/10",
  };
  return (
    <Card className="p-3.5">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${tones[tone]}`}>{icon}</div>
      <div className="text-2xl font-bold tabular-nums leading-none">{value}</div>
      <div className="text-[11px] text-slate-500 mt-1">{label}</div>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-slate-200 font-medium">{value}</div>
    </div>
  );
}

function ActionBtn({ children, icon, onClick, tone }: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void; tone: "emerald" | "rose" | "blue" | "amber" | "slate" }) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30 hover:bg-emerald-500/25",
    rose: "bg-rose-500/15 text-rose-200 ring-rose-400/30 hover:bg-rose-500/25",
    blue: "bg-blue-500/15 text-blue-200 ring-blue-400/30 hover:bg-blue-500/25",
    amber: "bg-amber-500/15 text-amber-200 ring-amber-400/30 hover:bg-amber-500/25",
    slate: "bg-slate-500/15 text-slate-200 ring-slate-400/30 hover:bg-slate-500/25",
  };
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg ring-1 transition-colors ${tones[tone]}`}>
      {icon}
      {children}
    </button>
  );
}
