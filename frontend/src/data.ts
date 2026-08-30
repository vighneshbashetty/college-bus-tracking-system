import type { Bus, Route, Student } from "@/types";

// Map is a 0-100 coordinate space rendered into an SVG viewBox representing VIT Bhopal Campus.
export const routes: Route[] = [
  {
    id: "R1",
    name: "VIT Bhopal Campus Express",
    color: "#3b82f6",
    stops: [
      { id: "s1", name: "Main Gate (NH-46)", x: 18, y: 82 },
      { id: "s2", name: "Academic Block (AB)", x: 36, y: 64 },
      { id: "s3", name: "Central Library & Admin", x: 52, y: 52 },
      { id: "s4", name: "Food Court & Underbelly", x: 70, y: 44 },
      { id: "s5", name: "Boys Hostel Complex", x: 84, y: 26 },
      { id: "s6", name: "Sports Complex & Ground", x: 60, y: 18 },
      { id: "s7", name: "Girls Hostel Complex", x: 30, y: 32 },
    ],
  },
];

export const initialBuses: Bus[] = [
  { id: "BUS-101", routeId: "R1", driver: "R. Sharma", plate: "MP-04-VB-1011", capacity: 48, occupancy: 24, speed: 1.3, status: "on-time", progress: 0.15, direction: 1, delayMinutes: 0 },
  { id: "BUS-102", routeId: "R1", driver: "M. Iyer", plate: "MP-04-VB-1012", capacity: 48, occupancy: 38, speed: 1.1, status: "delayed", progress: 0.58, direction: 1, delayMinutes: 5 },
  { id: "BUS-201", routeId: "R1", driver: "S. Nair", plate: "MP-04-VB-2021", capacity: 52, occupancy: 16, speed: 1.5, status: "on-time", progress: 0.85, direction: -1, delayMinutes: 0 },
  { id: "BUS-301", routeId: "R1", driver: "A. Khan", plate: "MP-04-VB-3031", capacity: 36, occupancy: 8, speed: 1.2, status: "boarding", progress: 0.0, direction: 1, delayMinutes: 2 },
  { id: "BUS-404", routeId: "R1", driver: "P. Das", plate: "MP-04-VB-4044", capacity: 52, occupancy: 0, speed: 0, status: "offline", progress: 0.4, direction: 1, delayMinutes: 0 },
];

export const students: Student[] = [
  { id: "u1", name: "Aarav (Student)", favoriteRouteId: "R1", homeStopId: "s2" },
  { id: "u2", name: "Diya (Student)", favoriteRouteId: "R1", homeStopId: "s7" },
];

export const allStops = () =>
  routes.flatMap((r) => r.stops).reduce<Record<string, { name: string; x: number; y: number }>>((acc, s) => {
    if (!acc[s.id]) acc[s.id] = { name: s.name, x: s.x, y: s.y };
    return acc;
  }, {});
