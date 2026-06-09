import { Router } from "express";
import { z } from "zod";
import { supabase } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/error.js";

export const watchlistRouter: Router = Router();

const addSchema = z.object({
  marketId: z.string(),
  marketType: z.enum(["crypto", "stock", "ipl", "forex", "tweet"]),
});

// GET /api/watchlist — user's watchlist
watchlistRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { data, error } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", req.userId!)
      .order("id", { ascending: false });
    if (error) throw new HttpError(500, error.message);
    res.json(data);
  }),
);

// POST /api/watchlist — add market
watchlistRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { marketId, marketType } = addSchema.parse(req.body);
    const { data, error } = await supabase
      .from("watchlist")
      .insert({ user_id: req.userId!, market_id: marketId, market_type: marketType })
      .select("*")
      .single();
    if (error) throw new HttpError(500, error.message);
    res.status(201).json(data);
  }),
);

// DELETE /api/watchlist/:id — remove
watchlistRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.userId!);
    if (error) throw new HttpError(500, error.message);
    res.status(204).end();
  }),
);
