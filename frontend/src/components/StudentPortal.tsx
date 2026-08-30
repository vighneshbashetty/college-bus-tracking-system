import { useMemo, useState } from "react";
import { ArrowLeft, MapPin, Clock, Search, Star, Bus as BusIcon, Navigation } from "lucide-react";
import TransitMap from "@/components/TransitMap";
import GoogleTransitMap from "@/components/GoogleTransitMap";
import { Card, OccupancyBar, SectionTitle, StatusBadge } from "@/components/ui";
import { routes, students, allStops } from "@/data";
import type { Arrival, Bus } from "@/types";
import { api } from "@/services/api";

interface Props {
  buses: Bus[];
  arrivals: (stopId: string) => Arrival[];
  onBack: () => void;
}

export default function StudentPortal({ buses, arrivals, onBack }: Props) {
  const me = students[0];
  const studentName = api.nameValue || me.name;
  const stops = useMemo(() => allStops(), []);
  const [selectedStop, setSelectedStop] = useState<string | null>(me.homeStopId);
  const [selectedBus, setSelectedBus] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [useGoogleMap, setUseGoogleMap] = useState<boolean>(
    Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
  );

  const stopList = Object.entries(stops).filter(([, v]) =>
    v.name.toLowerCase().includes(query.toLowerCase()),
  );

  const currentArrivals = selectedStop ? arrivals(selectedStop) : [];
  const selectedBusObj = buses.find((b) => b.id === selectedBus) || null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* top bar */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/10 text-slate-300">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <BusIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-sm leading-tight">Student Portal</div>
              <div className="text-[11px] text-slate-400 leading-tight">Hi, {studentName}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Map Mode Switcher Button */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              onClick={() => setUseGoogleMap(true)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                useGoogleMap
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🗺️ Google Maps
            </button>
            <button
              onClick={() => setUseGoogleMap(false)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                !useGoogleMap
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📐 SVG Campus Grid
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/10 ring-1 ring-emerald-400/30 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 p-4 sm:p-6">
        {/* map */}
        <div className="min-h-[420px] lg:min-h-0">
          {useGoogleMap ? (
            <GoogleTransitMap
              buses={buses}
              selectedStopId={selectedStop}
              onSelectStop={setSelectedStop}
              selectedBusId={selectedBus}
              onSelectBus={setSelectedBus}
            />
          ) : (
            <TransitMap
              buses={buses}
              selectedStopId={selectedStop}
              onSelectStop={setSelectedStop}
              selectedBusId={selectedBus}
              onSelectBus={setSelectedBus}
            />
          )}
        </div>

        {/* side panel */}
        <aside className="flex flex-col gap-4 min-h-0">
          {/* search */}
          <Card className="p-4">
            <SectionTitle icon={<MapPin className="w-4 h-4 text-blue-400" />}>Find your stop</SectionTitle>
            <div className="relative mt-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search stops..."
                className="w-full bg-slate-800/60 ring-1 ring-white/10 rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-blue-400/50"
              />
            </div>
            <div className="mt-3 max-h-40 overflow-y-auto flex flex-col gap-1 pr-1">
              {stopList.map(([id, s]) => (
                <button
                  key={id}
                  onClick={() => setSelectedStop(id)}
                  className={`flex items-center justify-between text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                    selectedStop === id ? "bg-blue-500/15 ring-1 ring-blue-400/40 text-blue-200" : "hover:bg-white/5 text-slate-300"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {s.name}
                  </span>
                  {id === me.homeStopId && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                </button>
              ))}
            </div>
          </Card>

          {/* arrivals */}
          <Card className="p-4 flex-1 min-h-0 flex flex-col">
            <SectionTitle icon={<Clock className="w-4 h-4 text-blue-400" />}>
              {selectedStop ? `Arrivals — ${stops[selectedStop]?.name}` : "Select a stop"}
            </SectionTitle>
            <div className="mt-3 flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
              {!selectedStop && (
                <p className="text-sm text-slate-500">Tap a stop on the map or in the list to see predicted arrivals.</p>
              )}
              {selectedStop && currentArrivals.length === 0 && (
                <p className="text-sm text-slate-500">No active buses serve this stop right now.</p>
              )}
              {currentArrivals.map((a) => (
                <button
                  key={a.busId}
                  onClick={() => setSelectedBus(a.busId)}
                  className={`text-left p-3 rounded-xl ring-1 transition-all ${
                    selectedBus === a.busId ? "ring-blue-400/50 bg-blue-500/10" : "ring-white/10 bg-slate-900/40 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: a.color }} />
                      <span className="font-medium text-sm">{a.routeName}</span>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-bold tabular-nums leading-none">{a.etaMinutes}<span className="text-sm text-slate-400 font-normal ml-1">min</span></div>
                      <div className="text-[11px] text-slate-500 mt-1">{a.busId} · {a.plate}</div>
                    </div>
                    <div className="w-28">
                      <OccupancyBar pct={a.occupancyPct} />
                      <div className="text-[11px] text-slate-500 mt-1 text-right">Crowd</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* selected bus detail */}
          {selectedBusObj && (
            <Card className="p-4 ring-blue-400/30">
              <SectionTitle icon={<Navigation className="w-4 h-4 text-blue-400" />}>Tracking {selectedBusObj.id}</SectionTitle>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <Info label="Driver" value={selectedBusObj.driver} />
                <Info label="Plate" value={selectedBusObj.plate} />
                <Info label="Route" value={routes.find((r) => r.id === selectedBusObj.routeId)?.name || "—"} />
                <Info label="Delay" value={selectedBusObj.delayMinutes ? `${selectedBusObj.delayMinutes} min` : "None"} />
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
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
