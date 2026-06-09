import client from "prom-client";

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const httpDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const activeUsers = new client.Gauge({
  name: "active_users",
  help: "Number of users seen in the last 5 minutes",
  registers: [registry],
});

export const betsTotal = new client.Counter({
  name: "bets_total",
  help: "Total number of bets placed",
  labelNames: ["result"] as const,
  registers: [registry],
});

// Track active users with a rolling 5-minute window.
const seen = new Map<string, number>();
export function markActiveUser(userId: string) {
  seen.set(userId, Date.now());
}
setInterval(() => {
  const cutoff = Date.now() - 5 * 60_000;
  for (const [id, ts] of seen) if (ts < cutoff) seen.delete(id);
  activeUsers.set(seen.size);
}, 30_000).unref();
