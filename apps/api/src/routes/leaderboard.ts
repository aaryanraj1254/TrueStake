import { Router } from "express";
import type { LeaderboardEntry } from "@truestake/shared";
import { supabase } from "../config/supabase.js";
import { cached } from "../lib/cache.js";
import { asyncHandler } from "../middleware/error.js";

export const leaderboardRouter: Router = Router();

// GET /api/leaderboard — top 10 by monthly profit from bets table
leaderboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const data = await cached<LeaderboardEntry[]>("leaderboard", 60_000, async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: bets, error } = await supabase
        .from("bets")
        .select("user_id, amount, payout, result, users(username, avatar_url)")
        .gte("created_at", startOfMonth.toISOString());
      if (error) throw new Error(error.message);

      const agg = new Map<
        string,
        { username: string; avatar_url: string | null; bets: number; wins: number; profit: number }
      >();
      for (const b of bets ?? []) {
        const u = (b as any).users ?? {};
        const entry =
          agg.get(b.user_id) ??
          { username: u.username ?? "anon", avatar_url: u.avatar_url ?? null, bets: 0, wins: 0, profit: 0 };
        entry.bets += 1;
        if (b.result === "won") entry.wins += 1;
        entry.profit += Number(b.payout) - Number(b.amount);
        agg.set(b.user_id, entry);
      }

      const ranked = [...agg.entries()]
        .map(([user_id, e]) => ({
          user_id,
          username: e.username,
          avatar_url: e.avatar_url,
          bets: e.bets,
          win_rate: e.bets ? Math.round((e.wins / e.bets) * 100) : 0,
          profit: Math.round(e.profit),
        }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10)
        .map((e, i) => ({ ...e, rank: i + 1 }));

      // Attach earned badges for the ranked users in a single query.
      const ids = ranked.map((r) => r.user_id);
      if (ids.length) {
        const { data: badges } = await supabase
          .from("achievements")
          .select("user_id, code, title")
          .in("user_id", ids);
        const byUser = new Map<string, { code: string; title: string }[]>();
        for (const b of badges ?? []) {
          const list = byUser.get(b.user_id) ?? [];
          list.push({ code: b.code, title: b.title });
          byUser.set(b.user_id, list);
        }
        return ranked.map((r) => ({ ...r, achievements: byUser.get(r.user_id) ?? [] }));
      }
      return ranked.map((r) => ({ ...r, achievements: [] }));
    });
    res.json(data);
  }),
);
