import { useState, useMemo, useEffect } from "react";
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { busGpsPosition } from "@/useTransitSim";
import { routes } from "@/data";
import type { Bus } from "@/types";
import { Bus as BusIcon, MapPin } from "lucide-react";

interface Props {
  buses: Bus[];
  selectedStopId: string | null;
  onSelectStop: (stopId: string) => void;
  selectedBusId: string | null;
  onSelectBus: (busId: string) => void;
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Custom Polyline Component using Google Maps JS API
function RoutePolyline({ path, color }: { path: { lat: number; lng: number }[]; color: string }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google || !window.google.maps) return;

    const polyline = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 4,
    });

    polyline.setMap(map);

    return () => {
      polyline.setMap(null);
    };
  }, [map, path, color]);

  return null;
}

export default function GoogleTransitMap({
  buses,
  selectedStopId,
  onSelectStop,
  selectedBusId,
  onSelectBus,
}: Props) {
  const [hoveredStop, setHoveredStop] = useState<string | null>(null);
  const [hoveredBus, setHoveredBus] = useState<string | null>(null);
  const [mapTypeId, setMapTypeId] = useState<"roadmap" | "satellite" | "hybrid">("hybrid");

  // Center around VIT Bhopal Campus
  const center = useMemo(() => ({ lat: 23.0755, lng: 76.8535 }), []);

  const uniqueStops = useMemo(() => {
    const stopsMap: Record<string, { id: string; name: string; lat: number; lng: number }> = {};
    for (const r of routes) {
      for (const s of r.stops) {
        if (!stopsMap[s.id]) stopsMap[s.id] = { id: s.id, name: s.name, lat: s.lat, lng: s.lng };
      }
    }
    return Object.values(stopsMap);
  }, []);

  const routePolylinePaths = useMemo(() => {
    return routes.map((r) => ({
      id: r.id,
      color: r.color,
      path: (r.path && r.path.length > 0 ? r.path : r.stops).map((s) => ({ lat: s.lat, lng: s.lng })),
    }));
  }, []);

  if (!API_KEY) {
    return (
      <div className="relative w-full h-full min-h-[440px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 p-6 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 animate-bounce">
          <MapPin className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Google Maps API Key Required</h3>
        <p className="text-sm text-slate-400 max-w-md mb-4">
          To view real Google Maps satellite/roadmap tiles, please add your Google Maps API Key to the <code className="text-blue-400 bg-slate-950 px-2 py-0.5 rounded">frontend/.env</code> file:
        </p>
        <div className="bg-slate-950 px-4 py-3 rounded-xl border border-slate-800 font-mono text-xs text-blue-300 mb-4 select-all">
          VITE_GOOGLE_MAPS_API_KEY=your_actual_key_here
        </div>
        <p className="text-xs text-slate-500">
          Obtain a free key at <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-blue-400 underline">Google Cloud Console</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[440px] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl flex flex-col">
      <APIProvider apiKey={API_KEY}>
        {/* HUD Overlay Header */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl ring-1 ring-white/10 shadow-lg pointer-events-auto">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <div className="text-xs font-semibold text-white tracking-wide flex items-center gap-1.5">
                Google Maps Live GPS • VIT Bhopal
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                23.076° N, 76.853° E • Live Campus Route
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Map Type Switcher */}
            <div className="bg-slate-900/90 backdrop-blur-md p-1 rounded-xl ring-1 ring-white/10 flex gap-1 text-xs">
              {(["hybrid", "roadmap", "satellite"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setMapTypeId(type)}
                  className={`px-2.5 py-1 rounded-lg capitalize text-[11px] font-medium transition-all ${
                    mapTypeId === type
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Google Map Container */}
        <GoogleMap
          defaultCenter={center}
          defaultZoom={16}
          mapTypeId={mapTypeId}
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="w-full h-full min-h-[440px] flex-1"
        >
          {/* Render Route Polyline */}
          {routePolylinePaths.map((r) => (
            <RoutePolyline key={r.id} path={r.path} color={r.color} />
          ))}

          {/* Stops Markers */}
          {uniqueStops.map((stop) => {
            const isSelected = selectedStopId === stop.id;
            const isHovered = hoveredStop === stop.id;

            return (
              <AdvancedMarker
                key={stop.id}
                position={{ lat: stop.lat, lng: stop.lng }}
                onClick={() => onSelectStop(stop.id)}
              >
                <div
                  onMouseEnter={() => setHoveredStop(stop.id)}
                  onMouseLeave={() => setHoveredStop(null)}
                  className="relative cursor-pointer group"
                >
                  <Pin
                    background={isSelected ? "#2563eb" : "#0f172a"}
                    borderColor={isSelected ? "#60a5fa" : "#3b82f6"}
                    glyphColor={isSelected ? "#ffffff" : "#60a5fa"}
                    scale={isSelected ? 1.2 : 1.0}
                  />
                  {(isHovered || isSelected) && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white px-2.5 py-1 rounded-lg shadow-xl ring-1 ring-white/20 whitespace-nowrap text-xs pointer-events-none z-50">
                      <p className="font-semibold">{stop.name}</p>
                      <p className="text-[10px] text-slate-400">Stop</p>
                    </div>
                  )}
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Bus Markers */}
          {buses.map((bus) => {
            if (bus.status === "offline") return null;
            const route = routes.find((r) => r.id === bus.routeId) || routes[0];
            const pos = bus.lat && bus.lng ? { lat: bus.lat, lng: bus.lng } : busGpsPosition(bus, route);
            const isSelected = selectedBusId === bus.id;
            const isHovered = hoveredBus === bus.id;

            return (
              <AdvancedMarker
                key={bus.id}
                position={pos}
                onClick={() => onSelectBus(bus.id)}
              >
                <div
                  onMouseEnter={() => setHoveredBus(bus.id)}
                  onMouseLeave={() => setHoveredBus(null)}
                  className="relative cursor-pointer transition-transform duration-200"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shadow-2xl transition-all ${
                      isSelected
                        ? "bg-amber-500 ring-4 ring-amber-300 scale-125"
                        : "bg-blue-600 ring-2 ring-white hover:scale-110"
                    }`}
                  >
                    <span className="text-sm">🚌</span>
                  </div>

                  {/* Pulsing indicator */}
                  <div
                    className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-slate-950 animate-ping ${
                      bus.status === "on-time"
                        ? "bg-emerald-400"
                        : bus.status === "delayed"
                        ? "bg-amber-400"
                        : "bg-blue-400"
                    }`}
                  />

                  {(isHovered || isSelected) && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white px-3 py-1.5 rounded-xl shadow-xl ring-1 ring-white/20 whitespace-nowrap text-xs pointer-events-none z-50">
                      <div className="font-bold text-blue-400">{bus.id} • {bus.plate}</div>
                      <div className="text-[10px] text-slate-300">Driver: {bus.driver}</div>
                      <div className="text-[10px] text-emerald-400 font-semibold uppercase">{bus.status}</div>
                    </div>
                  )}
                </div>
              </AdvancedMarker>
            );
          })}
        </GoogleMap>
      </APIProvider>
    </div>
  );
}
