import { Router } from "express";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { REDEEM_RATE, REDEEM_VALUE } from "@truestake/shared";
import { supabase } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/error.js";

export const walletRouter: Router = Router();

const voucherId = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 12);

// GET /api/wallet — balance + supercoins + admin flag
walletRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const [{ data: wallet }, { data: user }] = await Promise.all([
      supabase.from("wallets").select("balance, paper_balance, metamask_address").eq("user_id", req.userId!).single(),
      supabase.from("users").select("supercoins, is_admin").eq("id", req.userId!).single(),
    ]);
    res.json({
      balance: Number(wallet?.balance ?? 0),
      paper_balance: Number(wallet?.paper_balance ?? 0),
      supercoins: user?.supercoins ?? 0,
      metamask_address: wallet?.metamask_address ?? null,
      is_admin: user?.is_admin ?? false,
    });
  }),
);

// GET /api/wallet/transactions — the user's full ledger (deposits, bets, wins…).
walletRouter.get(
  "/transactions",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, type, amount, created_at")
      .eq("user_id", req.userId!)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new HttpError(500, error.message);
    res.json(data);
  }),
);

const redeemSchema = z.object({
  platform: z.string().min(1),
  coinsToRedeem: z.number().int().min(REDEEM_RATE),
});

// POST /api/wallet/redeem — min 100 coins, generate voucher, store redemption
walletRouter.post(
  "/redeem",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { platform, coinsToRedeem } = redeemSchema.parse(req.body);
    if (coinsToRedeem % REDEEM_RATE !== 0) {
      throw new HttpError(400, `Coins must be a multiple of ${REDEEM_RATE}`);
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("supercoins")
      .eq("id", req.userId!)
      .single();
    if (error || !user) throw new HttpError(404, "User not found");
    if ((user.supercoins ?? 0) < coinsToRedeem) throw new HttpError(400, "Not enough SuperCoins");

    const voucherCode = `${platform.slice(0, 3).toUpperCase()}-${voucherId()}`;
    const rupees = (coinsToRedeem / REDEEM_RATE) * REDEEM_VALUE;

    await supabase
      .from("users")
      .update({ supercoins: (user.supercoins ?? 0) - coinsToRedeem })
      .eq("id", req.userId!);

    const { data: redemption, error: rErr } = await supabase
      .from("redemptions")
      .insert({ user_id: req.userId!, platform, coins_used: coinsToRedeem, voucher_code: voucherCode })
      .select("*")
      .single();
    if (rErr) throw new HttpError(500, rErr.message);

    await supabase.from("transactions").insert({ user_id: req.userId!, type: "redeem", amount: rupees });

    res.status(201).json({ voucherCode, platform, rupees, redemption });
  }),
);
