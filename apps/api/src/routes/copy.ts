import { Router } from "express";
import { z } from "zod";
import { supabase } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/error.js";

export const copyRouter: Router = Router();

// GET /api/copy — the traders the current user is actively copying.
copyRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { data, error } = await supabase
      .from("copy_trading")
      .select("trader_id, active")
      .eq("follower_id", req.userId!);
    if (error) throw new HttpError(500, error.message);
    res.json(data);
  }),
);

const toggleSchema = z.object({ traderId: z.string().uuid(), active: z.boolean() });

// POST /api/copy — start/stop copying a trader.
copyRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { traderId, active } = toggleSchema.parse(req.body);
    if (traderId === req.userId) throw new HttpError(400, "You can't copy yourself");

    const { data, error } = await supabase
      .from("copy_trading")
      .upsert(
        { follower_id: req.userId!, trader_id: traderId, active },
        { onConflict: "follower_id,trader_id" },
      )
      .select("*")
      .single();
    if (error) throw new HttpError(500, error.message);
    res.json(data);
  }),
);
