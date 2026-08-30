export type Role = "student" | "admin";

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  x?: number; // legacy map coords 0-100 fallback
  y?: number;
}

export interface Route {
  id: string;
  name: string;
  color: string;
  stops: Stop[];
}

export interface Bus {
  id: string;
  routeId: string;
  driver: string;
  plate: string;
  capacity: number;
  occupancy: number;
  speed: number; // map units per second
  status: "on-time" | "delayed" | "boarding" | "offline";
  progress: number; // 0-1 along route
  direction: 1 | -1;
  delayMinutes: number;
  lat?: number;
  lng?: number;
}

export interface Student {
  id: string;
  name: string;
  favoriteRouteId: string;
  homeStopId: string;
}

export interface Arrival {
  busId: string;
  routeId: string;
  routeName: string;
  color: string;
  stopId: string;
  stopName: string;
  etaMinutes: number;
  occupancyPct: number;
  status: Bus["status"];
  driver: string;
  plate: string;
}
