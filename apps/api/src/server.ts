import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { initSentry } from "./config/sentry.js";
import { startAlertsLoop } from "./lib/alerts.js";
import { startSettlementLoop } from "./lib/settlement.js";

initSentry();

const app = createApp();

app.listen(env.port, () => {
  console.log(`\n🎲 TrueStake API listening on http://localhost:${env.port}`);
  console.log(`   health:  http://localhost:${env.port}/health`);
  console.log(`   metrics: http://localhost:${env.port}/metrics\n`);

  // Auto-resolve expired bets + check price alerts every minute.
  startSettlementLoop(60_000);
  startAlertsLoop(60_000);
  console.log("   ⚙ settlement + price-alert loops started (60s)\n");
});
