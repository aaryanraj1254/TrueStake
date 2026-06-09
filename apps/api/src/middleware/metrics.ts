import type { NextFunction, Request, Response } from "express";
import { httpDuration } from "../lib/metrics.js";

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const end = httpDuration.startTimer();
  res.on("finish", () => {
    const route = req.route?.path ?? req.path ?? "unknown";
    end({ method: req.method, route, status: String(res.statusCode) });
  });
  next();
}
