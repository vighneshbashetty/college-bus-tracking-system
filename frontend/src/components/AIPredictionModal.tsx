import React, { useState, useEffect } from "react";
import {
  Sparkles,
  X,
  Clock,
  CloudRain,
  Users,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Activity,
  ArrowRight,
  TrendingUp,
  CloudLightning,
  Sun,
  CloudFog,
} from "lucide-react";
import type { AIPredictETAResponse, Bus, Stop } from "@/types";
import { api } from "@/services/api";

interface AIPredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  bus: Bus | null;
  stop: Stop | null;
  staticEtaMinutes?: number;
}

export const AIPredictionModal: React.FC<AIPredictionModalProps> = ({
  isOpen,
  onClose,
  bus,
  stop,
  staticEtaMinutes = 3,
}) => {
  const [prediction, setPrediction] = useState<AIPredictETAResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // What-If Simulator States
  const [simWeather, setSimWeather] = useState<string>("clear");
  const [simTraffic, setSimTraffic] = useState<string>("moderate");

  useEffect(() => {
    if (!isOpen || !bus || !stop) return;

    let isMounted = true;
    const fetchPrediction = async () => {
      setLoading(true);
      setError(null);

      try {
        if (api.isConnected()) {
          const res = await api.predictETA({
            busId: bus.id,
            stopId: stop.id,
            weather: simWeather,
            trafficLevel: simTraffic,
          });
          if (isMounted) setPrediction(res);
        } else {
          // Client-side simulation fallback for Demo Mode
          const weatherMultiplier: Record<string, number> = {
            clear: 0.0,
            light_rain: 0.2,
            heavy_rain: 0.45,
            fog: 0.3,
          };
          const trafficMultiplier: Record<string, number> = {
            light: 0.0,
            moderate: 0.2,
            heavy: 0.45,
            campus_event: 0.8,
          };

          const baseEta = Math.max(1, staticEtaMinutes);
          const wFactor = weatherMultiplier[simWeather] || 0.0;
          const tFactor = trafficMultiplier[simTraffic] || 0.0;
          const occupancyRatio = bus.occupancy / bus.capacity;
          const dwellMins = Math.round((2 * (0.3 + occupancyRatio * 0.5)) * 10) / 10;

          const predictedDelay = Math.round((baseEta * (wFactor + tFactor) + dwellMins) * 10) / 10;
          const predictedEta = Math.round((baseEta + predictedDelay) * 10) / 10;

          let delayRisk: "low" | "moderate" | "high" | "severe" = "low";
          if (predictedDelay >= 6) delayRisk = "severe";
          else if (predictedDelay >= 3.5) delayRisk = "high";
          else if (predictedDelay >= 1.5) delayRisk = "moderate";

          const factors = [];
          if (wFactor > 0) {
            factors.push({
              factor: `Weather (${simWeather.replace("_", " ").toUpperCase()})`,
              category: "weather" as const,
              impact_minutes: Math.round(baseEta * wFactor * 10) / 10,
              description:
                simWeather === "heavy_rain"
                  ? "Heavy rain causing campus road water pooling and reduced traction"
                  : "Wet road conditions requiring cautious driver speed",
            });
          }
          if (tFactor > 0) {
            factors.push({
              factor: `Traffic (${simTraffic.replace("_", " ").toUpperCase()})`,
              category: "traffic" as const,
              impact_minutes: Math.round(baseEta * tFactor * 10) / 10,
              description:
                simTraffic === "heavy"
                  ? "Peak class change crowd between Academic Blocks and Hostels"
                  : "Normal campus crossing vehicular & pedestrian movement",
            });
          }
          factors.push({
            factor: "Passenger Boarding Dwell",
            category: "crowd" as const,
            impact_minutes: dwellMins,
            description: `Boarding time for ${bus.occupancy}/${bus.capacity} seated passengers`,
          });

          if (isMounted) {
            setPrediction({
              bus_id: bus.id,
              stop_id: stop.id,
              stop_name: stop.name,
              route_id: bus.routeId,
              predicted_eta_minutes: predictedEta,
              baseline_eta_minutes: baseEta,
              predicted_delay_minutes: predictedDelay,
              delay_risk: delayRisk,
              confidence: 0.94,
              distance_meters: Math.round(baseEta * 260),
              stops_remaining: 2,
              current_speed: bus.speed,
              weather: simWeather,
              traffic_level: simTraffic,
              factors,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to compute prediction");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPrediction();
    return () => {
      isMounted = false;
    };
  }, [isOpen, bus?.id, stop?.id, simWeather, simTraffic, staticEtaMinutes]);

  if (!isOpen || !bus || !stop) return null;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/30",
          text: "text-emerald-400",
          badge: "bg-emerald-500/20 text-emerald-300",
          label: "Low Risk • On Schedule",
        };
      case "moderate":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          text: "text-amber-400",
          badge: "bg-amber-500/20 text-amber-300",
          label: "Moderate Delay Risk",
        };
      case "high":
      case "severe":
        return {
          bg: "bg-rose-500/10",
          border: "border-rose-500/30",
          text: "text-rose-400",
          badge: "bg-rose-500/20 text-rose-300",
          label: "High Delay Warning",
        };
      default:
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/30",
          text: "text-blue-400",
          badge: "bg-blue-500/20 text-blue-300",
          label: "Calculated",
        };
    }
  };

  const riskStyle = getRiskColor(prediction?.delay_risk || "low");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 shadow-2xl shadow-indigo-500/10">
        {/* Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                AI Delay & ETA Predictor
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  ML Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Random Forest Regressor • Multi-Factor Transit Inference
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Target destination bar */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-white/5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">Vehicle:</span>
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold">
                {bus.id} ({bus.plate})
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span>Approaching:</span>
              <span className="font-semibold text-white">{stop.name}</span>
            </div>
          </div>

          {/* Hero Prediction Comparison Card */}
          <div className={`p-5 rounded-2xl border ${riskStyle.border} ${riskStyle.bg} relative overflow-hidden`}>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  AI Predicted Arrival
                </span>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white tracking-tight">
                    {loading ? "..." : prediction?.predicted_eta_minutes ?? staticEtaMinutes}
                  </span>
                  <span className="text-sm font-semibold text-indigo-300">minutes</span>
                </div>
              </div>

              {/* Delay difference badge */}
              <div className="text-right">
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${riskStyle.badge}`}>
                  {prediction?.delay_risk === "low" ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {riskStyle.label}
                </span>
                <div className="mt-1.5 text-[11px] text-slate-400">
                  {prediction && prediction.predicted_delay_minutes > 0 ? (
                    <span className="text-amber-400 font-medium">
                      +{prediction.predicted_delay_minutes} min delay predicted
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-medium">On timetable</span>
                  )}
                </div>
              </div>
            </div>

            {/* Baseline comparison meter */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Static Distance Formula:</span>
                <span className="text-slate-300 font-mono">
                  {prediction?.baseline_eta_minutes ?? staticEtaMinutes} min
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-indigo-300">
                <span>Model Confidence:</span>
                <span className="font-bold">
                  {prediction ? Math.round(prediction.confidence * 100) : 94}%
                </span>
              </div>
            </div>
          </div>

          {/* Interactive "What-If" Scenario Simulator */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-indigo-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                What-If AI Scenario Simulator
              </span>
              <span className="text-[10px] text-slate-400">Live ML Recalculation</span>
            </div>

            {/* Weather Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400 font-medium">Simulate Weather Condition:</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "clear", label: "Clear ☀️", icon: Sun },
                  { id: "light_rain", label: "Light Rain 🌧️", icon: CloudRain },
                  { id: "heavy_rain", label: "Heavy Rain ⛈️", icon: CloudLightning },
                  { id: "fog", label: "Dense Fog 🌫️", icon: CloudFog },
                ].map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setSimWeather(w.id)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                      simWeather === w.id
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-400"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Traffic Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400 font-medium">Simulate Campus Traffic:</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "light", label: "Normal 🟢" },
                  { id: "moderate", label: "Moderate 🟡" },
                  { id: "heavy", label: "Rush Hour 🔴" },
                  { id: "campus_event", label: "Event Block 🎪" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSimTraffic(t.id)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                      simTraffic === t.id
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-400"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Contributing Transit Factors */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              Transit Factors & Delay Decomposition
            </h3>

            <div className="space-y-2">
              {prediction?.factors.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                      {f.category === "weather" && <CloudRain className="w-4 h-4 text-blue-400" />}
                      {f.category === "traffic" && <Gauge className="w-4 h-4 text-amber-400" />}
                      {f.category === "crowd" && <Users className="w-4 h-4 text-purple-400" />}
                      {f.category === "speed" && <Activity className="w-4 h-4 text-rose-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{f.factor}</div>
                      <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        {f.description}
                      </div>
                    </div>
                  </div>
                  <div className="text-right pl-2">
                    <span className="text-xs font-bold font-mono text-amber-400">
                      +{f.impact_minutes} min
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Telemetry: {prediction?.distance_meters ?? 400}m remaining</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
