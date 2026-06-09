// Vercel serverless entry point.
//
// ⚠ IMPORTANT: Vercel serverless functions are short-lived and stateless, so the
// background loops in src/server.ts (startSettlementLoop / startAlertsLoop) do NOT
// run here. On Vercel, bet auto-settlement and price alerts must be driven by a
// Vercel Cron hitting an endpoint (see vercel.json `crons`), OR run the full API
// on a long-lived host (the AWS/Docker deploy, Render, Railway, Fly.io) instead.
//
// This handler simply adapts the Express app to a serverless request/response.
import { createApp } from "../src/app.js";

const app = createApp();

export default app;
