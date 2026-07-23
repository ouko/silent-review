import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface StatusData {
  status: string;
  timestamp: string;
  region?: string;
  features?: Record<string, boolean>;
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
      <h1 className="mb-4 text-2xl font-bold">System Status</h1>
      {error ? (
        <div className="rounded-xl bg-red-500/10 p-4 text-red-400">
          <p className="font-semibold">Service Unavailable</p>
          <p className="text-sm">We are experiencing issues. Please try again later.</p>
        </div>
      ) : status ? (
        <div className="w-full max-w-sm space-y-4 rounded-xl bg-white/5 p-6">
          <div className="flex items-center justify-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-500" />
            <span className="font-semibold capitalize">{status.status}</span>
          </div>
          <p className="text-sm text-white/60">Last checked: {status.timestamp}</p>
          {status.region && <p className="text-sm text-white/60">Region: {status.region}</p>}
          {status.features && (
            <div className="text-left">
              <p className="mb-2 text-sm font-semibold text-white/80">Features</p>
              <ul className="space-y-1 text-sm text-white/60">
                {Object.entries(status.features).map(([key, enabled]) => (
                  <li key={key} className="flex justify-between">
                    <span>{key}</span>
                    <span className={enabled ? "text-green-400" : "text-red-400"}>
                      {enabled ? "On" : "Off"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      )}
    </div>
  );
}
