import { Router } from "express";
import { checkAlerts } from "../lib/alerts.js";
import { settleExpiredBets } from "../lib/settlement.js";

// Cron endpoints for serverless hosts (Vercel Cron) where the long-lived
// settlement/alert loops in server.ts don't run. On a normal long-lived
// deploy these are harmless extras — the in-process loops already cover it.
//
// Protect with CRON_SECRET if set: requests must send `Authorization: Bearer <secret>`
// (Vercel Cron sends this automatically when CRON_SECRET is configured).
export const cronRouter: Router = Router();

function authorized(req: { headers: Record<string, unknown> }): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured → open (loops already run elsewhere)
  return req.headers["authorization"] === `Bearer ${secret}`;
}

cronRouter.post("/settlement", run(settleExpiredBets));
cronRouter.get("/settlement", run(settleExpiredBets));
cronRouter.post("/alerts", run(checkAlerts));
cronRouter.get("/alerts", run(checkAlerts));

function run(task: () => Promise<number>) {
  return async (req: any, res: any) => {
    if (!authorized(req)) return res.status(401).json({ error: "unauthorized" });
    try {
      const processed = await task();
      res.json({ ok: true, processed });
    } catch (e) {
      res.status(500).json({ ok: false, error: (e as Error).message });
    }
  };
}
