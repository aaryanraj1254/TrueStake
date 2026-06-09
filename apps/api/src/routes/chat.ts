import { Filter } from "bad-words";
import { Router } from "express";
import { z } from "zod";
import { supabase } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/error.js";

export const chatRouter: Router = Router();

const filter = new Filter();

// GET /api/chat?marketId=... — recent messages for a market room.
chatRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const marketId = z.string().min(1).parse(req.query.marketId);
    const { data, error } = await supabase
      .from("market_chat")
      .select("id, market_id, username, message, created_at")
      .eq("market_id", marketId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new HttpError(500, error.message);
    res.json((data ?? []).reverse()); // oldest → newest for display
  }),
);

const postSchema = z.object({
  marketId: z.string().min(1),
  message: z.string().trim().min(1).max(500),
});

// POST /api/chat — post a message (profanity-filtered) to a market room.
chatRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { marketId, message } = postSchema.parse(req.body);

    // Look up the poster's display name.
    const { data: user } = await supabase.from("users").select("username").eq("id", req.userId!).single();
    const username = user?.username ?? "anon";

    // bad-words throws on strings with no cleanable content; guard it.
    let clean = message;
    try {
      clean = filter.clean(message);
    } catch {
      /* keep original if the filter can't process it */
    }

    const { data, error } = await supabase
      .from("market_chat")
      .insert({ market_id: marketId, user_id: req.userId!, username, message: clean })
      .select("id, market_id, username, message, created_at")
      .single();
    if (error) throw new HttpError(500, error.message);
    res.status(201).json(data);
  }),
);
