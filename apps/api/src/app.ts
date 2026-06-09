import cors from "cors";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env.js";
import { registry } from "./lib/metrics.js";
import { errorHandler } from "./middleware/error.js";
import { metricsMiddleware } from "./middleware/metrics.js";
import { achievementsRouter } from "./routes/achievements.js";
import { aiRouter } from "./routes/ai.js";
import { alertsRouter } from "./routes/alerts.js";
import { betsRouter } from "./routes/bets.js";
import { chatRouter } from "./routes/chat.js";
import { copyRouter } from "./routes/copy.js";
import { cronRouter } from "./routes/cron.js";
import { leaderboardRouter } from "./routes/leaderboard.js";
import { liveRouter } from "./routes/live.js";
import { marketsRouter } from "./routes/markets.js";
import { paymentsRouter } from "./routes/payments.js";
import { referralRouter } from "./routes/referral.js";
import { walletRouter } from "./routes/wallet.js";
import { watchlistRouter } from "./routes/watchlist.js";
import { adminWithdrawalsRouter, withdrawalsRouter } from "./routes/withdrawals.js";

export function createApp(): Express {
  const app = express();
  const startedAt = Date.now();

  app.use(helmet());
  app.use(cors({ origin: env.webOrigin, credentials: true }));
  // Keep the raw body so the Razorpay webhook HMAC can be verified byte-for-byte.
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(metricsMiddleware);

  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Health & metrics (unauthenticated, no rate limit).
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: (Date.now() - startedAt) / 1000, timestamp: new Date().toISOString() });
  });

  app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", registry.contentType);
    res.end(await registry.metrics());
  });

  // API routes.
  app.use("/api/live", liveRouter);
  app.use("/api/markets", marketsRouter);
  app.use("/api/bets", betsRouter);
  app.use("/api/wallet", walletRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/withdrawals", withdrawalsRouter);
  app.use("/api/admin/withdrawals", adminWithdrawalsRouter);
  app.use("/api/leaderboard", leaderboardRouter);
  app.use("/api/referral", referralRouter);
  app.use("/api/watchlist", watchlistRouter);
  app.use("/api/alerts", alertsRouter);
  app.use("/api/copy", copyRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/achievements", achievementsRouter);
  app.use("/api/cron", cronRouter);

  app.use((_req, res) => res.status(404).json({ error: "not_found" }));
  app.use(errorHandler);

  return app;
}
