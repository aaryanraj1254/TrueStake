import { Router } from "express";
import { z } from "zod";
import { REFERRAL_BONUS } from "@truestake/shared";
import { env } from "../config/env.js";
import { supabase } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/error.js";

export const referralRouter: Router = Router();

// GET /api/referral/link — user's referral link
referralRouter.get(
  "/link",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { data: user, error } = await supabase
      .from("users")
      .select("referral_code")
      .eq("id", req.userId!)
      .single();
    if (error || !user) throw new HttpError(404, "User not found");
    res.json({
      code: user.referral_code,
      link: `${env.webOrigin}/register?ref=${user.referral_code}`,
    });
  }),
);

// POST /api/referral/apply — credit 200 coins to both users
referralRouter.post(
  "/apply",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { code } = z.object({ code: z.string().min(1) }).parse(req.body);
    const referredId = req.userId!;

    const { data: referrer } = await supabase
      .from("users")
      .select("id, supercoins")
      .eq("referral_code", code)
      .single();
    if (!referrer) throw new HttpError(404, "Invalid referral code");
    if (referrer.id === referredId) throw new HttpError(400, "Cannot refer yourself");

    const { data: existing } = await supabase
      .from("referrals")
      .select("id")
      .eq("referred_id", referredId)
      .maybeSingle();
    if (existing) throw new HttpError(400, "Referral already applied");

    const { data: referred } = await supabase
      .from("users")
      .select("supercoins")
      .eq("id", referredId)
      .single();

    await Promise.all([
      supabase.from("users").update({ supercoins: (referrer.supercoins ?? 0) + REFERRAL_BONUS }).eq("id", referrer.id),
      supabase.from("users").update({ supercoins: (referred?.supercoins ?? 0) + REFERRAL_BONUS }).eq("id", referredId),
      supabase.from("referrals").insert({
        referrer_id: referrer.id,
        referred_id: referredId,
        coins_awarded: REFERRAL_BONUS,
      }),
    ]);

    res.status(201).json({ awarded: REFERRAL_BONUS });
  }),
);
