import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/error.js";

export const achievementsRouter: Router = Router();

// GET /api/achievements?userId=... — badges + streak for a user (defaults to self).
achievementsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = typeof req.query.userId === "string" ? req.query.userId : req.userId!;
    const [{ data: badges, error }, { data: user }] = await Promise.all([
      supabase.from("achievements").select("code, title, created_at").eq("user_id", userId),
      supabase.from("users").select("current_streak, best_streak").eq("id", userId).single(),
    ]);
    if (error) throw new HttpError(500, error.message);
    res.json({
      achievements: badges ?? [],
      current_streak: user?.current_streak ?? 0,
      best_streak: user?.best_streak ?? 0,
    });
  }),
);
