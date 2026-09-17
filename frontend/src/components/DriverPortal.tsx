import { useEffect, useRef, useState } from "react";
import { LogOut, Play, Square, Users, Gauge, MapPin, AlertCircle, RefreshCw, Radio, Compass, Navigation, QrCode, Camera } from "lucide-react";
import { api, ApiDriver } from "@/services/api";
import { routes } from "@/data";
import { Card, OccupancyBar, SectionTitle, StatusBadge } from "@/components/ui";
import LeafletTransitMap from "@/components/LeafletTransitMap";
import { QRScannerModal } from "@/components/QRScannerModal";
import type { Bus } from "@/types";

interface Props {
  onLogout: () => void;
}

interface GpsCoords {
  latitude: number;
  longitude: number;
  speed: number | null; // km/h
  accuracy: number | null; // meters
}

export default function DriverPortal({ onLogout }: Props) {
  const [driver, setDriver] = useState<ApiDriver | null>(null);
  const [bus, setBus] = useState<Bus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTripActive, setIsTripActive] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Real-Time GPS Tracking State
  const [gpsCoords, setGpsCoords] = useState<GpsCoords | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncCount, setSyncCount] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const busRef = useRef<Bus | null>(null);
  busRef.current = bus;
  const gpsCoordsRef = useRef<GpsCoords | null>(null);
  gpsCoordsRef.current = gpsCoords;

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
          const active = myBus.status !== "offline";
          setIsTripActive(active);
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
      stopGpsWatch();
    };
  }, []);

  // Helper to stop GPS watch
  const stopGpsWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // Helper to send GPS coordinates to FastAPI backend
  const pushLocationUpdate = async (coords: GpsCoords) => {
    const currentBus = busRef.current;
    if (!currentBus) return;

    try {
      await api.sendLocation(
        currentBus.id,
        coords.latitude,
        coords.longitude,
        coords.speed,
        new Date().toISOString()
      );
      setLastSyncTime(new Date().toLocaleTimeString());
      setSyncCount((c) => c + 1);
      setGpsError(null);
    } catch (err: any) {
      console.error("Failed to push GPS location:", err);
      setGpsError(err.message || "Failed to upload GPS coordinates to server.");
    }
  };

  // 2. Start GPS Geolocation Tracking
  const startGpsWatch = () => {
    if (!("geolocation" in navigator)) {
      setGpsError("Geolocation is not supported by your device browser.");
      return;
    }

    setGpsError(null);

    // Initial position fetch
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const speedKmH = pos.coords.speed !== null && pos.coords.speed >= 0
          ? Number((pos.coords.speed * 3.6).toFixed(1))
          : null;

        const initialCoords: GpsCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          speed: speedKmH,
          accuracy: Math.round(pos.coords.accuracy),
        };

        setGpsCoords(initialCoords);
        pushLocationUpdate(initialCoords);
      },
      (err) => {
        console.warn("Initial GPS fetch notice:", err.message);
        if (err.code === 1) {
          setGpsError("Location Permission Denied. Please tap the site settings / lock icon next to the URL bar in Safari or Chrome, change Location to 'Allow', and refresh.");
        } else {
          setGpsError(`GPS Notice: ${err.message}`);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );

    // Continuous real-time watch
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const speedKmH = pos.coords.speed !== null && pos.coords.speed >= 0
          ? Number((pos.coords.speed * 3.6).toFixed(1))
          : null;

        const updatedCoords: GpsCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          speed: speedKmH,
          accuracy: Math.round(pos.coords.accuracy),
        };

        setGpsCoords(updatedCoords);
        setBus((prev) =>
          prev
            ? {
                ...prev,
                lat: updatedCoords.latitude,
                lng: updatedCoords.longitude,
                speed: updatedCoords.speed || prev.speed,
                isLiveGps: true,
              }
            : null
        );

        pushLocationUpdate(updatedCoords);
      },
      (err) => {
        console.error("GPS Watch error:", err);
        if (err.code === 1) {
          setGpsError("Location Permission Blocked by browser. Tap the site settings icon (lock icon next to URL bar) -> change Location to 'Allow' -> refresh page.");
        } else {
          setGpsError(`GPS Error: ${err.message}`);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000,
      }
    );

    watchIdRef.current = id;
  };

  // Heartbeat interval to regularly sync while trip is active (every 4 seconds)
  useEffect(() => {
    if (!isTripActive || !bus) return;

    const interval = setInterval(() => {
      const coords = gpsCoordsRef.current;
      if (coords) {
        pushLocationUpdate(coords);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isTripActive, !!bus]);

  // Action: Start Trip
  const handleStartTrip = async () => {
    if (!bus) return;
    try {
      const updated = await api.updateBus(bus.id, {
        status: "on-time",
        speed: 1.4,
      });
      setBus(updated);
      setIsTripActive(true);
      startGpsWatch();
    } catch (err: any) {
      alert("Failed to start trip on server: " + err.message);
    }
  };

  // Action: Stop Trip / End Trip
  const handleEndTrip = async () => {
    if (!bus) return;
    stopGpsWatch();
    setGpsCoords(null);
    try {
      const updated = await api.updateBus(bus.id, {
        status: "offline",
        speed: 0.0,
        occupancy: 0,
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
    setBus((prev) => (prev ? { ...prev, occupancy: val } : null));
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

  // Active bus for map preview with real GPS position if available
  const displayBus: Bus | null = bus
    ? {
        ...bus,
        lat: gpsCoords ? gpsCoords.latitude : bus.lat,
        lng: gpsCoords ? gpsCoords.longitude : bus.lng,
        isLiveGps: !!gpsCoords,
      }
    : null;

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

        <div className="flex items-center gap-3">
          {isTripActive && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 ring-1 ring-emerald-400/30 text-emerald-300 text-xs">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>LIVE GPS BROADCASTING</span>
            </div>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/10 hover:text-rose-300 ring-1 ring-white/10 hover:ring-rose-500/20 text-xs text-slate-300 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 p-4 sm:p-6">
        {/* Left Column: Live Map */}
        <div className="flex flex-col gap-4 min-h-[420px] lg:min-h-0">
          <div className="flex-1 rounded-2xl overflow-hidden relative border border-white/5 shadow-2xl">
            <LeafletTransitMap
              buses={displayBus ? [displayBus] : []}
              selectedStopId={null}
              onSelectStop={() => {}}
              selectedBusId={displayBus ? displayBus.id : null}
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
                  <StatusBadge status={isTripActive ? "on-time" : "offline"} />
                </div>

                {/* GPS Telemetry HUD */}
                <div className="mt-4 p-4 rounded-2xl bg-slate-950/80 ring-1 ring-white/10">
                  <div className="flex items-center justify-between text-xs mb-3 border-b border-white/5 pb-2">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <Radio className={`w-3.5 h-3.5 ${isTripActive ? "text-emerald-400 animate-pulse" : "text-slate-600"}`} />
                      Phone GPS Telemetry
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isTripActive ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-400/30" : "bg-slate-800 text-slate-400"
                    }`}>
                      {isTripActive ? "Broadcasting" : "Standby"}
                    </span>
                  </div>

                  {gpsError && (
                    <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 ring-1 ring-amber-400/30 text-amber-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{gpsError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900/60 ring-1 ring-white/5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Latitude</span>
                      <span className="font-mono text-sm font-semibold text-slate-200 mt-0.5 block">
                        {gpsCoords ? gpsCoords.latitude.toFixed(6) : "—"}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 ring-1 ring-white/5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Longitude</span>
                      <span className="font-mono text-sm font-semibold text-slate-200 mt-0.5 block">
                        {gpsCoords ? gpsCoords.longitude.toFixed(6) : "—"}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 ring-1 ring-white/5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Speed</span>
                      <span className="font-mono text-sm font-semibold text-slate-200 mt-0.5 block">
                        {gpsCoords?.speed !== null && gpsCoords?.speed !== undefined ? `${gpsCoords.speed} km/h` : "0.0 km/h"}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 ring-1 ring-white/5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Last Sync</span>
                      <span className="font-mono text-xs font-medium text-slate-300 mt-1 block truncate">
                        {lastSyncTime ? `${lastSyncTime} (#${syncCount})` : "Waiting for start"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/50">
                    <span className="text-slate-500 block">Assigned Route</span>
                    <span className="font-semibold text-slate-200 mt-1 block truncate">
                      {selectedRouteObj ? selectedRouteObj.name.split("—")[0] : "—"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/50">
                    <span className="text-slate-500 block">Mode</span>
                    <span className="font-semibold text-indigo-400 mt-1 block flex items-center gap-1">
                      <Navigation className="w-3 h-3" /> Live Phone GPS
                    </span>
                  </div>
                </div>

                {/* Primary Actions: Start Trip / Stop Trip */}
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    onClick={handleStartTrip}
                    disabled={isTripActive}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-600/20"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Start Trip
                  </button>
                  <button
                    onClick={handleEndTrip}
                    disabled={!isTripActive}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:opacity-40 text-white font-semibold text-xs transition-all shadow-lg shadow-rose-600/20"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    Stop Trip
                  </button>
                </div>
              </Card>

              {/* Adjust Passenger Density Card */}
              <Card className="p-5">
                <SectionTitle icon={<Users className="w-4 h-4 text-indigo-400" />}>Crowd Operations</SectionTitle>
                <p className="text-xs text-slate-400 mt-2">
                  Update passengers currently on board. Scan student QR passes or manually adjust occupancy metrics.
                </p>

                {/* Scan Student Pass Button */}
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="mt-4 w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan Student QR Pass</span>
                </button>

                <div className="mt-4 p-4 rounded-2xl bg-slate-950 ring-1 ring-white/5">
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

      {bus && (
        <QRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          busId={bus.id}
          onPassengerBoarded={(newOcc) => {
            if (newOcc !== undefined) {
              setBus((prev) => (prev ? { ...prev, occupancy: newOcc } : null));
            } else if (bus) {
              handleOccupancyChange(Math.min(bus.capacity, bus.occupancy + 1));
            }
          }}
          isDemoMode={!api.isConnected()}
        />
      )}
    </div>
  );
}
