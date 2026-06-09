import { supabase } from "../config/supabase.js";

const ACHIEVEMENTS = {
  first_bet: "First Bet",
  streak_5: "5 Win Streak",
  bets_100: "100 Bets",
  big_winner: "Big Winner",
} as const;

async function award(userId: string, code: keyof typeof ACHIEVEMENTS): Promise<void> {
  // Unique (user_id, code) makes this idempotent — duplicate inserts just error
  // with 23505, which we ignore.
  const { error } = await supabase.from("achievements").insert({ user_id: userId, code, title: ACHIEVEMENTS[code] });
  if (error && (error as { code?: string }).code !== "23505") {
    console.error("[achievements] award failed", error.message);
  }
}

/**
 * Called on every real-bet settlement. Updates the user's win streak, then
 * checks all achievement thresholds and awards any newly earned badges.
 */
export async function recordResultAndCheck(userId: string, won: boolean): Promise<void> {
  // 1) Update streak.
  const { data: user } = await supabase
    .from("users")
    .select("current_streak, best_streak")
    .eq("id", userId)
    .single();
  const current = won ? Number(user?.current_streak ?? 0) + 1 : 0;
  const best = Math.max(Number(user?.best_streak ?? 0), current);
  await supabase.from("users").update({ current_streak: current, best_streak: best }).eq("id", userId);

  // 2) Aggregate real (non-paper) bet stats.
  const { data: bets } = await supabase
    .from("bets")
    .select("amount, payout, result")
    .eq("user_id", userId)
    .eq("paper_trade", false);
  const total = bets?.length ?? 0;
  const profit = (bets ?? []).reduce((s, b) => s + (Number(b.payout) - Number(b.amount)), 0);

  // 3) Award thresholds.
  if (total >= 1) await award(userId, "first_bet");
  if (best >= 5) await award(userId, "streak_5");
  if (total >= 100) await award(userId, "bets_100");
  if (profit > 10000) await award(userId, "big_winner");
}
