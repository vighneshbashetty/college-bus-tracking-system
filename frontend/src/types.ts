export type Role = "student" | "admin";

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  x?: number; // legacy map coords 0-100 fallback
  y?: number;
}

export interface RouteCoordinate {
  lat: number;
  lng: number;
  x?: number;
  y?: number;
}

export interface Route {
  id: string;
  name: string;
  color: string;
  stops: Stop[];
  path?: RouteCoordinate[];
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
  isLiveGps?: boolean;
  lastGpsUpdate?: string;
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

export interface AIFactorImpact {
  factor: string;
  category: "weather" | "traffic" | "crowd" | "route" | "speed";
  impact_minutes: number;
  description: string;
}

export interface AIPredictETAResponse {
  bus_id: string;
  stop_id: string;
  stop_name: string;
  route_id: string;
  predicted_eta_minutes: number;
  baseline_eta_minutes: number;
  predicted_delay_minutes: number;
  delay_risk: "low" | "moderate" | "high" | "severe";
  confidence: number;
  distance_meters: number;
  stops_remaining: number;
  current_speed: number;
  weather: string;
  traffic_level: string;
  factors: AIFactorImpact[];
  timestamp: string;
}

export interface AIModelInfo {
  model_name: string;
  algorithm: string;
  features: string[];
  training_samples: number;
  r2_score: number;
  mae_minutes: number;
  last_trained_at: string;
  status: string;
}
