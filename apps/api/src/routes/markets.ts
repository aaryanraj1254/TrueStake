import { Router } from "express";
import { z } from "zod";
import type { OrderBook, OrderBookEntry } from "@truestake/shared";
import { supabase } from "../config/supabase.js";
import { computeOdds, deterministicUuid } from "../lib/market.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/error.js";

export const marketsRouter: Router = Router();

// GET /api/markets/orderbook?marketId=crypto:bitcoin
// Returns the live order book (real pending bets only) + parimutuel odds for a
// market. Served with the service role so it's correct regardless of RLS; clients
// refresh it when they receive the market's realtime UPDATE event.
marketsRouter.get(
  "/orderbook",
  requireAuth,
  asyncHandler(async (req, res) => {
    const marketId = z.string().min(1).parse(req.query.marketId);
    const marketUuid = deterministicUuid(marketId);

    const { data, error } = await supabase
      .from("bets")
      .select("amount, direction, created_at, users(username)")
      .eq("market_id", marketUuid)
      .eq("result", "pending")
      .eq("paper_trade", false)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new HttpError(500, error.message);

    const orders: OrderBookEntry[] = (data ?? []).map((b) => ({
      username: (b as { users?: { username?: string } }).users?.username ?? "anon",
      amount: Number(b.amount),
      direction: b.direction,
      created_at: b.created_at,
    }));

    let poolUp = 0;
    let poolDown = 0;
    let countUp = 0;
    let countDown = 0;
    for (const o of orders) {
      if (o.direction === "up") {
        poolUp += o.amount;
        countUp++;
      } else {
        poolDown += o.amount;
        countDown++;
      }
    }
    const { oddsUp, oddsDown, total } = computeOdds(poolUp, poolDown);

    const book: OrderBook = {
      marketUuid,
      orders,
      poolUp,
      poolDown,
      totalPool: total,
      oddsUp,
      oddsDown,
      countUp,
      countDown,
    };
    res.json(book);
  }),
);
