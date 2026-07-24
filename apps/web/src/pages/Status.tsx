import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { Activity, Server, Globe, CheckCircle2, XCircle } from "lucide-react";
import { BrandSpinner } from "../components/ui/BrandSpinner";

interface StatusData {
  status: string;
  timestamp: string;
  region?: string;
  features?: Record<string, boolean>;
}

function formatTimestamp(value: string | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function Status() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get("/api/health")
      .then((res) => setStatus(res.data as StatusData))
      .catch(() => setError(true));
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20">
        <Activity className="h-7 w-7 text-white" />
      </div>
      <h1 className="text-2xl font-black tracking-tighter gradient-text">System Status</h1>
      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/40">
        Silent Review services
      </p>

      <div className="mt-6 w-full max-w-sm">
        {error ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-400"
          >
            <div className="mb-2 flex items-center justify-center gap-2">
              <XCircle className="h-5 w-5" />
              <p className="font-bold">Service Unavailable</p>
            </div>
            <p className="text-sm text-white/70">We are experiencing issues. Please try again later.</p>
          </motion.div>
        ) : status ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-xl"
          >
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-white/60" />
                <span className="text-sm font-bold text-white/80">API Status</span>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {status.status}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-white/60" />
                <span className="text-sm font-bold text-white/80">Region</span>
              </div>
              <span className="text-sm font-bold text-white">{status.region ?? "—"}</span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white/40">Features</p>
              <ul className="space-y-2">
                {status.features && Object.entries(status.features).map(([key, enabled]) => (
                  <li key={key} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-white/70">{key.replace(/_/g, " ")}</span>
                    <span className={`flex items-center gap-1 text-xs font-bold ${enabled ? "text-emerald-400" : "text-red-400"}`}>
                      {enabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {enabled ? "On" : "Off"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-center text-xs text-white/40">
              Last checked: {formatTimestamp(status.timestamp)}
            </p>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <BrandSpinner size="md" />
            <p className="text-sm text-white/50">Checking status...</p>
          </div>
        )}
      </div>
    </div>
  );
}
