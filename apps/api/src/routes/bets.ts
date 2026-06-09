import { Router } from "express";
import { z } from "zod";
import { supabase } from "../config/supabase.js";
import { betCost } from "../lib/betmath.js";
import { fanOutCopyBets } from "../lib/copy.js";
import { sendEmail } from "../lib/email.js";
import { computeOdds, deterministicUuid } from "../lib/market.js";
import { betsTotal } from "../lib/metrics.js";
import { settleExpiredBets, settleMarket } from "../lib/settlement.js";
import { creditWallet, debitWallet } from "../lib/wallet.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/error.js";

export const betsRouter: Router = Router();

const placeBetSchema = z.object({
  marketId: z.string().min(1), // synthetic id from the live feed
  marketType: z.enum(["crypto", "stock", "ipl", "forex", "tweet"]),
  marketTitle: z.string().min(1),
  amount: z.number().positive(),
  direction: z.enum(["up", "down"]),
  prediction: z.number(),
  expiresAt: z.string().optional(),
  paperTrade: z.boolean().default(false),
  insured: z.boolean().default(false),
});

// POST /api/bets — validate JWT, check balance, deduct, insert bet
betsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = placeBetSchema.parse(req.body);
    const userId = req.userId!;

    // Total charge = stake + optional 10% insurance premium.
    const cost = betCost(body.amount, body.insured);

    // Ensure a real markets row exists for this live-feed market, keyed by a
    // deterministic UUID so repeat bets on the same market reuse one row.
    const marketUuid = deterministicUuid(body.marketId);
    const { error: mErr } = await supabase.from("markets").upsert(
      {
        id: marketUuid,
        type: body.marketType,
        title: body.marketTitle,
        data: { externalId: body.marketId },
        expires_at: body.expiresAt ?? null,
        status: "open",
      },
      { onConflict: "id" },
    );
    if (mErr) throw new HttpError(500, `Failed to register market: ${mErr.message}`);

    // Atomic debit — checks balance and deducts in one statement (race-proof).
    const remaining = await debitWallet(userId, cost, body.paperTrade);
    if (remaining === null) {
      throw new HttpError(400, body.paperTrade ? "Insufficient paper balance" : "Insufficient balance");
    }

    const { data: bet, error: bErr } = await supabase
      .from("bets")
      .insert({
        user_id: userId,
        market_id: marketUuid,
        amount: body.amount,
        direction: body.direction,
        prediction: body.prediction,
        result: "pending",
        payout: 0,
        paper_trade: body.paperTrade,
        insured: body.insured,
      })
      .select("id")
      .single();
    if (bErr || !bet) {
      await creditWallet(userId, cost, body.paperTrade); // refund the debit
      throw new HttpError(500, `Failed to create bet: ${bErr?.message ?? "unknown"}`);
    }

    // Real bets move the parimutuel pool + recompute live odds on the market.
    // Realtime broadcasts the market UPDATE so every client's order book refreshes.
    if (!body.paperTrade) {
      const { data: m } = await supabase
        .from("markets")
        .select("pool_up, pool_down")
        .eq("id", marketUuid)
        .single();
      const poolUp = Number(m?.pool_up ?? 0) + (body.direction === "up" ? body.amount : 0);
      const poolDown = Number(m?.pool_down ?? 0) + (body.direction === "down" ? body.amount : 0);
      const { oddsUp } = computeOdds(poolUp, poolDown);
      await supabase
        .from("markets")
        .update({ pool_up: poolUp, pool_down: poolDown, current_odds: oddsUp })
        .eq("id", marketUuid);

      await supabase.from("transactions").insert({ user_id: userId, type: "bet", amount: -cost });
      if (req.userEmail) {
        void sendEmail(req.userEmail, "bet_placed", {
          marketTitle: body.marketTitle,
          amount: body.amount,
          direction: body.direction,
        });
      }

      // Copy trading: replicate this real bet for everyone copying this user.
      void fanOutCopyBets(userId, {
        marketUuid,
        marketId: body.marketId,
        marketType: body.marketType,
        marketTitle: body.marketTitle,
        amount: body.amount,
        direction: body.direction,
        prediction: body.prediction,
        expiresAt: body.expiresAt,
      });
    }

    betsTotal.inc({ result: "pending" });
    res.status(201).json({ betId: bet.id });
  }),
);

// GET /api/bets/history — user bet history with market details
betsRouter.get(
  "/history",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { data, error } = await supabase
      .from("bets")
      .select("*, markets(id, title, type, status)")
      .eq("user_id", req.userId!)
      .order("created_at", { ascending: false });
    if (error) throw new HttpError(500, error.message);
    res.json(data);
  }),
);

// POST /api/bets/resolve/:marketId — manually settle a market against an actual value.
betsRouter.post(
  "/resolve/:marketId",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const marketId = z.string().uuid().parse(req.params.marketId);
    const { actual } = z.object({ actual: z.number() }).parse(req.body);

    const { data: market, error: mErr } = await supabase
      .from("markets")
      .select("title")
      .eq("id", marketId)
      .single();
    if (mErr || !market) throw new HttpError(404, "Market not found");

    const resolved = await settleMarket(marketId, market.title, actual);
    res.json({ resolved });
  }),
);

// POST /api/bets/settle — run the auto-settler on demand (resolves all expired markets).
betsRouter.post(
  "/settle",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const resolved = await settleExpiredBets();
    res.json({ resolved });
  }),
);
