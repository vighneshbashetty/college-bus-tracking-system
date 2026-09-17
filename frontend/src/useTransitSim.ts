import { useEffect, useRef, useState } from "react";
import { initialBuses, routes } from "@/data";
import type { Arrival, Bus, Route, RouteCoordinate } from "@/types";
import { api } from "@/services/api";

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getRoutePoints(route: Route): RouteCoordinate[] {
  if (route.path && route.path.length > 0) {
    return route.path;
  }
  return route.stops.map((s) => ({
    lat: s.lat,
    lng: s.lng,
    x: s.x ?? 50,
    y: s.y ?? 50,
  }));
}

// Precompute cumulative distances along polyline
const routeDistancesCache = new WeakMap<Route, { cumulative: number[]; total: number }>();

function getRouteDistances(route: Route) {
  let cached = routeDistancesCache.get(route);
  if (!cached) {
    const points = getRoutePoints(route);
    const cumulative: number[] = [0];
    for (let i = 0; i < points.length - 1; i++) {
      const d = haversineMeters(points[i].lat, points[i].lng, points[i + 1].lat, points[i + 1].lng);
      cumulative.push(cumulative[cumulative.length - 1] + (d || 0.001));
    }
    cached = { cumulative, total: cumulative[cumulative.length - 1] || 1 };
    routeDistancesCache.set(route, cached);
  }
  return cached;
}

// Distance along a route's polyline at a normalized progress 0-1
export function interpolateRoutePoint(route: Route, progress: number): RouteCoordinate {
  const points = getRoutePoints(route);
  if (points.length === 0) return { lat: 23.07795, lng: 76.85065, x: 22, y: 25 };
  if (points.length === 1) return points[0];

  const clampedT = Math.max(0, Math.min(1, progress));
  const { cumulative, total } = getRouteDistances(route);
  const targetDist = clampedT * total;

  let i = 0;
  while (i < cumulative.length - 2 && cumulative[i + 1] < targetDist) {
    i++;
  }

  const segStart = cumulative[i];
  const segEnd = cumulative[i + 1];
  const segLen = segEnd - segStart;
  const local = segLen > 0 ? (targetDist - segStart) / segLen : 0;

  const a = points[i];
  const b = points[i + 1];

  const lat = a.lat + (b.lat - a.lat) * local;
  const lng = a.lng + (b.lng - a.lng) * local;
  const ax = a.x ?? 50;
  const bx = b.x ?? 50;
  const ay = a.y ?? 50;
  const by = b.y ?? 50;
  const x = ax + (bx - ax) * local;
  const y = ay + (by - ay) * local;

  return { lat, lng, x, y };
}

export function busPosition(bus: Bus, route: Route): { x: number; y: number } {
  const p = interpolateRoutePoint(route, bus.progress);
  return { x: p.x ?? 50, y: p.y ?? 50 };
}

// Calculate live GPS coordinates (lat, lng) along the route based on bus progress (0-1)
export function busGpsPosition(bus: Bus, route: Route): { lat: number; lng: number } {
  const p = interpolateRoutePoint(route, bus.progress);
  return { lat: p.lat, lng: p.lng };
}

function getStopProgress(route: Route, stopId: string): number {
  const stop = route.stops.find((s) => s.id === stopId);
  if (!stop) return 0;
  const points = getRoutePoints(route);
  const { cumulative, total } = getRouteDistances(route);

  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = haversineMeters(stop.lat, stop.lng, points[i].lat, points[i].lng);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return total > 0 ? cumulative[bestIdx] / total : 0;
}

export function useTransitSim(isConnected: boolean) {
  const [buses, setBuses] = useState<Bus[]>(initialBuses);
  const [tick, setTick] = useState(0);
  const last = useRef<number>(performance.now());

  // 1. Polling effect when connected to FastAPI backend
  useEffect(() => {
    if (!isConnected) {
      setBuses(initialBuses);
      return;
    }

    const fetchBuses = async () => {
      try {
        const data = await api.getBuses();
        // Fetch latest live GPS positions in parallel
        const busPromises = data.map(async (b: any) => {
          let liveLat: number | undefined = undefined;
          let liveLng: number | undefined = undefined;
          let isLiveGps = false;
          let lastGpsUpdate: string | undefined = undefined;

          try {
            const latestLoc = await api.getLatestLocation(b.id);
            if (latestLoc && latestLoc.latitude && latestLoc.longitude) {
              liveLat = latestLoc.latitude;
              liveLng = latestLoc.longitude;
              isLiveGps = true;
              lastGpsUpdate = latestLoc.timestamp;
            }
          } catch {
            // Ignore error if no location recorded yet
          }

          const busObj: Bus = {
            id: b.id,
            routeId: b.route_id,
            driver: b.driver_name || "None",
            plate: b.plate,
            capacity: b.capacity,
            occupancy: b.occupancy,
            speed: b.speed,
            status: b.status,
            progress: b.progress,
            direction: b.direction as 1 | -1,
            delayMinutes: b.delay_minutes,
            lat: liveLat,
            lng: liveLng,
            isLiveGps,
            lastGpsUpdate,
          };
          return busObj;
        });

        const mappedBuses = await Promise.all(busPromises);
        // In FastAPI Live Mode, ONLY include buses that are actively broadcasting live GPS from a driver's phone
        const liveGpsBusesOnly = mappedBuses.filter((b) => b.isLiveGps);
        setBuses(liveGpsBusesOnly);
      } catch (err) {
        console.error("Failed to fetch buses from FastAPI:", err);
      }
    };

    fetchBuses();
    const id = setInterval(fetchBuses, 2500);
    return () => clearInterval(id);
  }, [isConnected]);

  // 2. Animation loop (for simulated buses or Demo mode)
  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last.current) / 1000, 0.1);
      last.current = now;
      setBuses((prev) =>
        prev.map((b) => {
          // If bus is offline, boarding, or broadcasting live GPS, don't simulate artificial progress
          if (b.status === "offline" || b.status === "boarding" || b.isLiveGps) return b;
          let progress = b.progress + (b.speed * dt) / 100;
          let direction = b.direction;
          if (progress >= 1) {
            progress = 1;
            direction = -1;
          } else if (progress <= 0) {
            progress = 0;
            direction = 1;
          }
          return { ...b, progress, direction };
        }),
      );
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // 3. Drift occupancy slightly to feel alive (only in Demo Mode)
  useEffect(() => {
    if (isConnected) return;
    const id = setInterval(() => {
      setBuses((prev) =>
        prev.map((b) => {
          if (b.status === "offline") return b;
          const delta = Math.round((Math.random() - 0.45) * 3);
          const occupancy = Math.max(0, Math.min(b.capacity, b.occupancy + delta));
          return { ...b, occupancy };
        }),
      );
    }, 4000);
    return () => clearInterval(id);
  }, [isConnected]);

  const arrivals = (stopId: string): Arrival[] => {
    const out: Arrival[] = [];
    for (const b of buses) {
      if (b.status === "offline") continue;
      const route = routes.find((r) => r.id === b.routeId);
      if (!route) continue;
      const stop = route.stops.find((s) => s.id === stopId);
      if (!stop) continue;

      const stopProg = getStopProgress(route, stopId);
      const { total } = getRouteDistances(route);
      const busProg = Math.max(0, Math.min(1, b.progress));
      const dir = b.direction || 1;

      let distMeters = 0;
      if (dir === 1) {
        if (stopProg >= busProg) {
          distMeters = (stopProg - busProg) * total;
        } else {
          distMeters = (1 - busProg + (1 - stopProg)) * total;
        }
      } else {
        if (stopProg <= busProg) {
          distMeters = (busProg - stopProg) * total;
        } else {
          distMeters = (busProg + stopProg) * total;
        }
      }

      const speedUnits = Math.max(b.speed, 0.2);
      const etaSec = distMeters / (speedUnits * 12);
      const etaMinutes = Math.max(1, Math.round(etaSec / 60 + b.delayMinutes));

      out.push({
        busId: b.id,
        routeId: route.id,
        routeName: route.name,
        color: route.color,
        stopId,
        stopName: stop.name,
        etaMinutes,
        occupancyPct: Math.round((b.occupancy / b.capacity) * 100),
        status: b.status,
        driver: b.driver,
        plate: b.plate,
      });
    }
    return out.sort((a, b) => a.etaMinutes - b.etaMinutes);
  };

  return { buses, setBuses, arrivals, tick };
}
