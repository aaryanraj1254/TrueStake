import { createHmac, timingSafeEqual } from "node:crypto";
import { Router, type Request } from "express";
import Razorpay from "razorpay";
import { z } from "zod";
import { env } from "../config/env.js";
import { supabase } from "../config/supabase.js";
import { creditWallet } from "../lib/wallet.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/error.js";

export const paymentsRouter: Router = Router();

const razorpay =
  env.razorpayKeyId && env.razorpayKeySecret
    ? new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret })
    : null;

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Idempotently credit a captured payment. The unique razorpay_payment_id on the
 * `payments` table guarantees a payment is only ever credited once, no matter
 * how many times the verify endpoint and the webhook both fire.
 * Returns true if it credited now, false if it was already credited.
 */
async function creditDepositOnce(
  userId: string,
  orderId: string | null,
  paymentId: string,
  amountRupees: number,
): Promise<boolean> {
  const { error: insErr } = await supabase.from("payments").insert({
    user_id: userId,
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    amount: amountRupees,
    status: "captured",
  });
  if (insErr) {
    // 23505 = unique_violation → already processed this payment.
    if ((insErr as { code?: string }).code === "23505") return false;
    throw new HttpError(500, `Failed to record payment: ${insErr.message}`);
  }

  await creditWallet(userId, amountRupees); // atomic
  await supabase.from("transactions").insert({ user_id: userId, type: "deposit", amount: amountRupees });
  return true;
}

// GET /api/payments/config — is the gateway live + public key for checkout.
paymentsRouter.get("/config", (_req, res) => {
  res.json({ enabled: !!razorpay, keyId: env.razorpayKeyId });
});

const orderSchema = z.object({ amount: z.number().int().min(10).max(500_000) });

// POST /api/payments/order — create a Razorpay order for an INR deposit.
paymentsRouter.post(
  "/order",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    // Guard: both keys must be present, or surface a precise, actionable error.
    if (!env.razorpayKeyId || !env.razorpayKeySecret || !razorpay) {
      throw new HttpError(503, "Razorpay is not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in apps/api/.env.");
    }
    const { amount } = orderSchema.parse(req.body);

    try {
      const order = await razorpay.orders.create({
        amount: amount * 100, // paise
        currency: "INR",
        receipt: `dep_${req.userId!.slice(0, 8)}_${Date.now()}`,
        notes: { userId: req.userId! },
      });
      res.status(201).json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: env.razorpayKeyId });
    } catch (err) {
      // Log the exact SDK error and bubble up Razorpay's own message.
      const e = err as { statusCode?: number; error?: { description?: string }; message?: string };
      console.error("[razorpay] order create failed:", e.statusCode, e.error?.description ?? e.message, err);
      const detail = e.error?.description ?? e.message ?? "unknown error";
      const status = e.statusCode === 401 ? 502 : (e.statusCode ?? 502);
      throw new HttpError(status, `Razorpay order failed: ${detail}`);
    }
  }),
);

const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  amount: z.number().int().positive(),
});

// POST /api/payments/verify — verify the checkout signature then credit (idempotent).
paymentsRouter.post(
  "/verify",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!razorpay) throw new HttpError(503, "Payments not configured.");
    const body = verifySchema.parse(req.body);

    const expected = createHmac("sha256", env.razorpayKeySecret)
      .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
      .digest("hex");
    if (!safeEqual(expected, body.razorpay_signature)) {
      throw new HttpError(400, "Payment signature verification failed");
    }

    await creditDepositOnce(req.userId!, body.razorpay_order_id, body.razorpay_payment_id, body.amount);

    const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", req.userId!).single();
    res.json({ balance: Number(wallet?.balance ?? 0), credited: body.amount });
  }),
);

// POST /api/payments/webhook — Razorpay server-to-server events.
// Mounted with the raw body captured in app.ts so the HMAC matches exactly.
paymentsRouter.post(
  "/webhook",
  asyncHandler(async (req: Request & { rawBody?: Buffer }, res) => {
    const signature = req.headers["x-razorpay-signature"];
    if (!env.razorpayWebhookSecret || typeof signature !== "string") {
      // No secret configured → acknowledge without acting (the verify endpoint
      // already credits the synchronous path).
      res.status(200).json({ ok: true, skipped: "no webhook secret" });
      return;
    }

    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    const expected = createHmac("sha256", env.razorpayWebhookSecret).update(raw).digest("hex");
    if (!safeEqual(expected, signature)) {
      throw new HttpError(400, "Invalid webhook signature");
    }

    const event = req.body as {
      event: string;
      id?: string;
      payload?: { payment?: { entity?: { id: string; order_id: string; amount: number; notes?: { userId?: string } } } };
    };

    // Idempotency: record the event id; if already seen, stop.
    const eventId = (req.headers["x-razorpay-event-id"] as string) ?? event.id ?? "";
    if (eventId) {
      const { error: dupeErr } = await supabase.from("processed_webhooks").insert({ event_id: eventId });
      if (dupeErr && (dupeErr as { code?: string }).code === "23505") {
        res.status(200).json({ ok: true, duplicate: true });
        return;
      }
    }

    if (event.event === "payment.captured" && event.payload?.payment?.entity) {
      const p = event.payload.payment.entity;
      const userId = p.notes?.userId;
      if (userId) {
        await creditDepositOnce(userId, p.order_id, p.id, p.amount / 100);
      }
    }

    res.status(200).json({ ok: true });
  }),
);
