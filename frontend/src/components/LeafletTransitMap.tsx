import { useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import { busGpsPosition } from "@/useTransitSim";
import { routes } from "@/data";
import type { Bus } from "@/types";
import { Compass } from "lucide-react";

interface Props {
  buses: Bus[];
  selectedStopId: string | null;
  onSelectStop: (stopId: string) => void;
  selectedBusId: string | null;
  onSelectBus: (busId: string) => void;
}

// Custom HTML DivIcon generator for bus stops
function createStopIcon(name: string, isSelected: boolean) {
  const bg = isSelected ? "bg-blue-600 ring-4 ring-blue-400 scale-125 z-50" : "bg-slate-900 ring-2 ring-blue-500 hover:scale-110";
  return L.divIcon({
    className: "custom-stop-icon",
    html: `
      <div class="relative flex items-center justify-center">
        <div class="w-6 h-6 rounded-full ${bg} flex items-center justify-center shadow-lg transition-transform duration-200">
          <div class="w-2.5 h-2.5 rounded-full ${isSelected ? "bg-white" : "bg-blue-400"}"></div>
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

// Custom HTML DivIcon generator for buses
function createBusIcon(bus: Bus, isSelected: boolean) {
  const bg = isSelected ? "bg-amber-500 ring-4 ring-amber-300 scale-125 z-50" : "bg-blue-600 ring-2 ring-white hover:scale-110";
  return L.divIcon({
    className: "custom-bus-icon",
    html: `
      <div class="relative flex items-center justify-center">
        <div class="w-8 h-8 rounded-full ${bg} flex items-center justify-center shadow-xl transition-transform duration-200 text-white font-bold text-[10px]">
          🚌
        </div>
        <div class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${bus.status === 'on-time' ? 'bg-emerald-400' : bus.status === 'delayed' ? 'bg-amber-400' : 'bg-blue-400'} ring-1 ring-slate-950 animate-ping"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

const TILE_SERVERS = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  },
};

export default function LeafletTransitMap({
  buses,
  selectedStopId,
  onSelectStop,
  selectedBusId,
  onSelectBus,
}: Props) {
  const [tileMode, setTileMode] = useState<"dark" | "street" | "satellite">("dark");

  // Center around VIT Bhopal Campus
  const center: [number, number] = [23.0755, 76.8535];

  const uniqueStops = useMemo(() => {
    const map = new Map<string, { id: string; name: string; lat: number; lng: number }>();
    for (const r of routes) {
      for (const s of r.stops) {
        if (!map.has(s.id)) map.set(s.id, { id: s.id, name: s.name, lat: s.lat, lng: s.lng });
      }
    }
    return [...map.values()];
  }, []);

  const routePolylinePaths = useMemo(() => {
    return routes.map((r) => ({
      id: r.id,
      color: r.color,
      positions: (r.path && r.path.length > 0 ? r.path : r.stops).map((s) => [s.lat, s.lng] as [number, number]),
    }));
  }, []);

  const currentTile = TILE_SERVERS[tileMode];

  return (
    <div className="relative w-full h-full min-h-[440px] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl flex flex-col">
      {/* HUD Header */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl ring-1 ring-white/10 shadow-lg pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <div className="text-xs font-semibold text-white tracking-wide flex items-center gap-1.5">
              OpenStreetMap Live GPS • VIT Bhopal
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              23.076° N, 76.853° E • Free Real Maps
            </div>
          </div>
        </div>

        {/* Tile Layer Switcher */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl ring-1 ring-white/10 text-xs pointer-events-auto">
          {(["dark", "street", "satellite"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setTileMode(mode)}
              className={`px-2.5 py-1 rounded-lg capitalize text-[11px] font-medium transition-all ${
                tileMode === mode
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {mode === "dark" ? "🌙 Dark" : mode === "street" ? "🗺️ Streets" : "🛰️ Satellite"}
            </button>
          ))}
        </div>
      </div>

      {/* Leaflet MapContainer */}
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%", minHeight: "440px" }}
      >
        <TileLayer url={currentTile.url} attribution={currentTile.attribution} />

        {/* Route Polylines */}
        {routePolylinePaths.map((r) => (
          <Polyline key={r.id} positions={r.positions} color={r.color} weight={5} opacity={0.8} />
        ))}

        {/* Bus Stop Markers */}
        {uniqueStops.map((stop) => {
          const isSelected = selectedStopId === stop.id;
          return (
            <Marker
              key={stop.id}
              position={[stop.lat, stop.lng]}
              icon={createStopIcon(stop.name, isSelected)}
              eventHandlers={{
                click: () => onSelectStop(stop.id),
              }}
            >
              <Popup>
                <div className="p-1 text-slate-900 font-sans">
                  <p className="font-bold text-xs">{stop.name}</p>
                  <p className="text-[10px] text-slate-600">Bus Stop • Click to check arrival times</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Live Bus Markers */}
        {buses.map((bus) => {
          if (bus.status === "offline") return null;
          const route = routes.find((r) => r.id === bus.routeId) || routes[0];
          
          // Use real live phone GPS coordinates if present; otherwise fallback to polyline interpolation
          const hasRealGps = bus.lat !== undefined && bus.lng !== undefined && bus.lat !== null && bus.lng !== null;
          const pos = hasRealGps
            ? { lat: bus.lat!, lng: bus.lng! }
            : busGpsPosition(bus, route);

          const isSelected = selectedBusId === bus.id;

          return (
            <Marker
              key={bus.id}
              position={[pos.lat, pos.lng]}
              icon={createBusIcon(bus, isSelected)}
              eventHandlers={{
                click: () => onSelectBus(bus.id),
              }}
            >
              <Popup>
                <div className="p-1 text-slate-900 font-sans min-w-[170px]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-blue-600 text-xs">{bus.id}</div>
                    {bus.isLiveGps ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full ring-1 ring-emerald-300">
                        🛰️ LIVE GPS
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                        🎮 Demo Sim
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">{bus.plate}</div>
                  <div className="text-[11px] text-slate-700 mt-1">Driver: {bus.driver}</div>
                  <div className="text-[11px] text-slate-700">Occupancy: {bus.occupancy}/{bus.capacity}</div>
                  {bus.speed !== undefined && (
                    <div className="text-[10px] text-slate-600">Speed: {bus.speed} km/h</div>
                  )}
                  <div className="text-[10px] font-bold uppercase mt-1 text-emerald-600">{bus.status}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
