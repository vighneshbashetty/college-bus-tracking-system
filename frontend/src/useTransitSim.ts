import { useEffect, useRef, useState } from "react";
import { initialBuses, routes } from "@/data";
import type { Arrival, Bus, Route } from "@/types";
import { api } from "@/services/api";

// Distance along a route's polyline at a normalized progress 0-1.
function routePoint(route: Route, t: number) {
  const segs = route.stops.length - 1;
  const total = t * segs;
  const i = Math.min(Math.floor(total), segs - 1);
  const local = total - i;
  const a = route.stops[i];
  const b = route.stops[i + 1];
  return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local };
}

export function busPosition(bus: Bus, route: Route) {
  return routePoint(route, bus.progress);
}

// Cumulative segment lengths for accurate distance-based ETA.
function segLengths(route: Route) {
  const lens: number[] = [];
  for (let i = 0; i < route.stops.length - 1; i++) {
    const a = route.stops[i];
    const b = route.stops[i + 1];
    lens.push(Math.hypot(b.x - a.x, b.y - a.y));
  }
  return lens;
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
        // Map backend snake_case properties to frontend camelCase keys
        const mappedBuses: Bus[] = data.map((b: any) => ({
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
          delayMinutes: b.delay_minutes
        }));
        setBuses(mappedBuses);
      } catch (err) {
        console.error("Failed to fetch buses from FastAPI:", err);
      }
    };

    fetchBuses();
    const id = setInterval(fetchBuses, 3000);
    return () => clearInterval(id);
  }, [isConnected]);

  // 2. Animation loop
  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last.current) / 1000, 0.1);
      last.current = now;
      setBuses((prev) =>
        prev.map((b) => {
          if (b.status === "offline" || b.status === "boarding") return b;
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
      const stopIdx = route.stops.findIndex((s) => s.id === stopId);
      if (stopIdx < 0) continue;
      const lens = segLengths(route);
      const totalLen = lens.reduce((a, c) => a + c, 0) || 1;
      // distance from bus to the target stop along the route
      const busSegFloat = b.progress * (route.stops.length - 1);
      const stopPos = stopIdx; // stop index in segment space
      let dist = stopPos - busSegFloat;
      if (dist < 0) dist += route.stops.length - 1; // wrap (bus passed it, next loop)
      const distUnits = dist * (totalLen / (route.stops.length - 1));
      const etaSec = distUnits / Math.max(b.speed, 0.2);
      const etaMinutes = Math.max(1, Math.round(etaSec / 6 + b.delayMinutes)); // scaled for demo
      out.push({
        busId: b.id,
        routeId: route.id,
        routeName: route.name,
        color: route.color,
        stopId,
        stopName: route.stops[stopIdx].name,
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
