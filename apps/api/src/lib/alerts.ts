import { supabase } from "../config/supabase.js";
import { sendEmail } from "./email.js";
import { sendPush } from "./push.js";
import { cryptoPrice, stockPrice } from "./settlement.js";

interface AlertRow {
  id: string;
  user_id: string;
  market_type: string;
  symbol: string;
  title: string;
  target_price: number;
  direction: "above" | "below";
}

async function priceFor(alert: AlertRow): Promise<number | null> {
  if (alert.market_type === "crypto") return cryptoPrice(alert.symbol);
  if (alert.market_type === "stock") return stockPrice(alert.symbol);
  return null;
}

/** Check every active alert against the current price; fire push + email on hit. */
export async function checkAlerts(): Promise<number> {
  const { data: alerts, error } = await supabase
    .from("alerts")
    .select("id, user_id, market_type, symbol, title, target_price, direction")
    .eq("status", "active")
    .limit(500);
  if (error) throw new Error(error.message);
  if (!alerts?.length) return 0;

  // Cache prices per symbol so we hit each provider once per tick.
  const priceCache = new Map<string, number | null>();
  let fired = 0;

  for (const alert of alerts as AlertRow[]) {
    const key = `${alert.market_type}:${alert.symbol}`;
    if (!priceCache.has(key)) priceCache.set(key, await priceFor(alert));
    const price = priceCache.get(key);
    if (price == null) continue;

    const hit = alert.direction === "above" ? price >= Number(alert.target_price) : price <= Number(alert.target_price);
    if (!hit) continue;

    await supabase
      .from("alerts")
      .update({ status: "triggered", triggered_at: new Date().toISOString() })
      .eq("id", alert.id);

    const body = `${alert.title} is now ₹${price.toLocaleString("en-IN")} — ${alert.direction} your target of ₹${Number(
      alert.target_price,
    ).toLocaleString("en-IN")}.`;

    void sendPush(alert.user_id, { title: `🔔 ${alert.title} price alert`, body, url: "/markets" });

    const { data: user } = await supabase.from("users").select("email").eq("id", alert.user_id).single();
    if (user?.email) {
      void sendEmail(user.email, "price_alert", { marketTitle: alert.title, alertBody: body });
    }
    fired++;
  }
  return fired;
}

export function startAlertsLoop(intervalMs = 60_000): void {
  const tick = async () => {
    try {
      const n = await checkAlerts();
      if (n > 0) console.log(`[alerts] triggered ${n} alert(s)`);
    } catch (err) {
      console.error("[alerts] loop error", err);
    }
  };
  setTimeout(tick, 15_000);
  setInterval(tick, intervalMs).unref();
}
