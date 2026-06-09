import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { supabase } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/error.js";

export const alertsRouter: Router = Router();

// GET /api/alerts/vapid — public key for the client push subscription.
alertsRouter.get("/vapid", (_req, res) => {
  res.json({ publicKey: env.vapidPublicKey, enabled: !!env.vapidPublicKey });
});

const createSchema = z.object({
  marketType: z.enum(["crypto", "stock", "ipl", "forex", "tweet"]),
  marketId: z.string().min(1),
  symbol: z.string().min(1),
  title: z.string().min(1),
  targetPrice: z.number().positive(),
  direction: z.enum(["above", "below"]),
});

// POST /api/alerts — create a price alert.
alertsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const b = createSchema.parse(req.body);
    const { data, error } = await supabase
      .from("alerts")
      .insert({
        user_id: req.userId!,
        market_type: b.marketType,
        market_id: b.marketId,
        symbol: b.symbol,
        title: b.title,
        target_price: b.targetPrice,
        direction: b.direction,
        status: "active",
      })
      .select("*")
      .single();
    if (error) throw new HttpError(500, error.message);
    res.status(201).json(data);
  }),
);

// GET /api/alerts — the user's alerts.
alertsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .eq("user_id", req.userId!)
      .order("created_at", { ascending: false });
    if (error) throw new HttpError(500, error.message);
    res.json(data);
  }),
);

// DELETE /api/alerts/:id
alertsRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { error } = await supabase.from("alerts").delete().eq("id", req.params.id).eq("user_id", req.userId!);
    if (error) throw new HttpError(500, error.message);
    res.status(204).end();
  }),
);

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

// POST /api/alerts/subscribe — store a web-push subscription.
alertsRouter.post(
  "/subscribe",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const sub = subSchema.parse(req.body);
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: req.userId!,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new HttpError(500, error.message);
    res.status(201).json({ ok: true });
  }),
);
