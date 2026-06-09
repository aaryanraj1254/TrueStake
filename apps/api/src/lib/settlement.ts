import type { StockTicker } from "@truestake/shared";
import { env } from "../config/env.js";
import { supabase } from "../config/supabase.js";
import { recordResultAndCheck } from "./achievements.js";
import { resolveBet } from "./betmath.js";
import { cached } from "./cache.js";
import { sendEmail } from "./email.js";
import { betsTotal } from "./metrics.js";
import { creditWallet } from "./wallet.js";

// ── price lookups (separate cache keys from the live routes to avoid shape clashes) ──

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`upstream ${res.status} for ${url}`);
  return (await res.json()) as T;
}

const MOCK_STOCKS: StockTicker[] = [
  { ticker: "RELIANCE", price: 2890.5, change_amount: 42.3, change_percentage: "+1.48%", volume: 5_200_000 },
  { ticker: "TCS", price: 4120.1, change_amount: -18.6, change_percentage: "-0.45%", volume: 1_900_000 },
  { ticker: "HDFCBANK", price: 1678.9, change_amount: 23.4, change_percentage: "+1.41%", volume: 8_100_000 },
  { ticker: "INFY", price: 1845.2, change_amount: 12.1, change_percentage: "+0.66%", volume: 3_400_000 },
];

export async function cryptoPrice(coinId: string): Promise<number | null> {
  const list = await cached<{ id: string; current_price: number }[]>("settle:crypto", 30_000, () =>
    fetchJson(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=inr&order=market_cap_desc&per_page=50&page=1&sparkline=false",
    ),
  );
  return list.find((c) => c.id === coinId)?.current_price ?? null;
}

export async function stockPrice(ticker: string): Promise<number | null> {
  const list = await cached<StockTicker[]>("settle:stocks", 60_000, async () => {
    if (!env.alphaVantageKey) return MOCK_STOCKS;
    const raw = await fetchJson<{ top_gainers?: { ticker: string; price: string }[] }>(
      `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${env.alphaVantageKey}`,
    );
    const g = raw.top_gainers ?? [];
    return g.length
      ? g.map((s) => ({ ticker: s.ticker, price: Number(s.price), change_amount: 0, change_percentage: "", volume: 0 }))
      : MOCK_STOCKS;
  });
  return list.find((s) => s.ticker === ticker)?.price ?? null;
}

async function forexRate(quote: string): Promise<number | null> {
  const data = await cached<{ rates: Record<string, number> }>("settle:forex", 60_000, () =>
    fetchJson("https://api.exchangerate-api.com/v4/latest/USD"),
  );
  return data.rates[quote] ?? null;
}

interface MarketRow {
  id: string;
  type: string;
  title: string;
  data: { externalId?: string } | null;
}

/** Resolve the current real-world value for a market, or null if it can't be priced. */
async function currentValue(market: MarketRow): Promise<number | null> {
  const ext = market.data?.externalId;
  if (!ext) return null;
  const id = ext.split(":").slice(1).join(":"); // "crypto:bitcoin" → "bitcoin"
  switch (market.type) {
    case "crypto":
      return cryptoPrice(id);
    case "stock":
      return stockPrice(id);
    case "forex":
      return forexRate(id.replace(/^USD/, "")); // "USDINR" → "INR"
    default:
      return null; // ipl / tweet markets are settled manually
  }
}

/**
 * Settle one market's pending bets against a known value, crediting winners.
 * Shared by the auto-settler and the manual resolve endpoint.
 */
export async function settleMarket(marketId: string, marketTitle: string, value: number): Promise<number> {
  const { data: bets } = await supabase.from("bets").select("*").eq("market_id", marketId).eq("result", "pending");
  let count = 0;

  for (const bet of bets ?? []) {
    const { won, payout, supercoins, insuranceRefund } = resolveBet(
      bet.direction,
      Number(bet.prediction),
      Number(bet.amount),
      value,
      bet.insured,
    );

    // Atomically claim the bet: the `result = pending` filter means only one
    // settler (manual endpoint vs background loop) can ever win this update, so
    // a bet is never credited twice under concurrent settlement.
    const { data: claimed } = await supabase
      .from("bets")
      .update({ result: won ? "won" : "lost", payout })
      .eq("id", bet.id)
      .eq("result", "pending")
      .select("id");
    if (!claimed || claimed.length === 0) continue; // already settled by another run
    betsTotal.inc({ result: won ? "won" : "lost" });

    // Paper trades settle against the virtual balance only — no real money,
    // SuperCoins, ledger entries or emails.
    if (bet.paper_trade) {
      const credit = won ? payout : insuranceRefund;
      if (credit > 0) await creditWallet(bet.user_id, credit, true);
      count++;
      continue;
    }

    if (!won && insuranceRefund > 0) {
      await creditWallet(bet.user_id, insuranceRefund);
      await supabase.from("transactions").insert({ user_id: bet.user_id, type: "win", amount: insuranceRefund });
    }

    if (won) {
      await creditWallet(bet.user_id, payout);
      const { data: user } = await supabase.from("users").select("email, supercoins").eq("id", bet.user_id).single();
      if (user) {
        await supabase.from("users").update({ supercoins: (user.supercoins ?? 0) + supercoins }).eq("id", bet.user_id);
        await supabase.from("transactions").insert({ user_id: bet.user_id, type: "win", amount: payout });
        if (user.email) void sendEmail(user.email, "bet_won", { marketTitle, payout, supercoins });
      }
    } else {
      const { data: user } = await supabase.from("users").select("email").eq("id", bet.user_id).single();
      if (user?.email) {
        void sendEmail(user.email, "bet_lost", { marketTitle, amount: Number(bet.amount), direction: bet.direction });
      }
    }

    // Update win streak + award achievements (real bets only).
    await recordResultAndCheck(bet.user_id, won);
    count++;
  }

  await supabase.from("markets").update({ status: "resolved" }).eq("id", marketId);
  return count;
}

/**
 * Settle a sports market by its final score from TheSportsDB. Home bets are
 * "up", away bets "down" (sport bets carry prediction 0). Returns the number of
 * bets settled, or 0 (without resolving) if the match isn't finished yet.
 */
async function settleSportMarket(market: MarketRow & { title: string }): Promise<number> {
  const ext = market.data?.externalId ?? "";
  const eventId = ext.split(":")[1];
  if (!eventId) return 0;

  let ev: { intHomeScore?: string | null; intAwayScore?: string | null; strStatus?: string | null } | undefined;
  try {
    const r = await fetchJson<{ events?: typeof ev[] | null }>(
      `https://www.thesportsdb.com/api/v1/json/3/lookupevent.php?id=${eventId}`,
    );
    ev = (r.events ?? [])[0];
  } catch {
    return 0; // lookup failed — try again next tick
  }

  const home = Number(ev?.intHomeScore);
  const away = Number(ev?.intAwayScore);
  const finished = /finish|full.?time|\bft\b|aet|ended|\bafter\b/i.test(ev?.strStatus ?? "");
  if (!ev || !finished || Number.isNaN(home) || Number.isNaN(away)) {
    return 0; // not decided yet — leave the market open for a later tick
  }

  if (home === away) {
    // Draw → refund every pending bet's stake (push), then resolve.
    const { data: bets } = await supabase.from("bets").select("*").eq("market_id", market.id).eq("result", "pending");
    let n = 0;
    for (const bet of bets ?? []) {
      const { data: claimed } = await supabase
        .from("bets")
        .update({ result: "lost", payout: Number(bet.amount) })
        .eq("id", bet.id)
        .eq("result", "pending")
        .select("id");
      if (!claimed?.length) continue;
      await creditWallet(bet.user_id, Number(bet.amount), bet.paper_trade); // atomic stake refund
      if (!bet.paper_trade) {
        await supabase.from("transactions").insert({ user_id: bet.user_id, type: "win", amount: Number(bet.amount) });
      }
      n++;
    }
    await supabase.from("markets").update({ status: "resolved" }).eq("id", market.id);
    return n;
  }

  // Decisive result: encode the winner as +1 (home) / -1 (away). Sport bets have
  // prediction 0, so settleMarket's `value >= prediction` resolves correctly.
  return settleMarket(market.id, market.title, home > away ? 1 : -1);
}

/** Find every expired, still-open market we can price, and settle its bets. */
export async function settleExpiredBets(): Promise<number> {
  const nowIso = new Date().toISOString();
  const { data: markets, error } = await supabase
    .from("markets")
    .select("id, type, title, data, expires_at")
    .eq("status", "open")
    .not("expires_at", "is", null)
    .lt("expires_at", nowIso);
  if (error) throw new Error(error.message);
  if (!markets?.length) return 0;

  let total = 0;
  for (const market of markets) {
    try {
      // Sports markets resolve by final score from TheSportsDB.
      if ((market.data as { externalId?: string } | null)?.externalId?.startsWith("sport:")) {
        total += await settleSportMarket(market as MarketRow & { title: string });
        continue;
      }
      const value = await currentValue(market as MarketRow);
      if (value == null) continue; // can't price (ipl/tweet) — leave for manual resolve
      total += await settleMarket(market.id, market.title, value);
    } catch (err) {
      console.error(`[settlement] market ${market.id} failed`, err);
    }
  }
  return total;
}

/** Start the recurring settlement loop. */
export function startSettlementLoop(intervalMs = 60_000): void {
  const tick = async () => {
    try {
      const n = await settleExpiredBets();
      if (n > 0) console.log(`[settlement] resolved ${n} bet(s)`);
    } catch (err) {
      console.error("[settlement] loop error", err);
    }
  };
  setTimeout(tick, 10_000); // first pass shortly after boot
  setInterval(tick, intervalMs).unref();
}
