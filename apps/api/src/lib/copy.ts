import { supabase } from "../config/supabase.js";
import { computeOdds } from "./market.js";
import { creditWallet, debitWallet } from "./wallet.js";

interface CopyBetParams {
  marketUuid: string;
  marketId: string;
  marketType: string;
  marketTitle: string;
  amount: number;
  direction: "up" | "down";
  prediction: number;
  expiresAt?: string;
}

/**
 * After a trader places a real bet, replicate it for everyone actively copying
 * them. Each copy draws from the follower's own real balance; followers without
 * enough balance are skipped. Copy bets never fan out again.
 */
export async function fanOutCopyBets(traderId: string, p: CopyBetParams): Promise<number> {
  const { data: followers } = await supabase
    .from("copy_trading")
    .select("follower_id")
    .eq("trader_id", traderId)
    .eq("active", true);
  if (!followers?.length) return 0;

  let copied = 0;
  for (const { follower_id } of followers) {
    // Atomic debit — skips the follower if they can't afford the copy.
    const remaining = await debitWallet(follower_id, p.amount, false);
    if (remaining === null) continue;

    const { error } = await supabase.from("bets").insert({
      user_id: follower_id,
      market_id: p.marketUuid,
      amount: p.amount,
      direction: p.direction,
      prediction: p.prediction,
      result: "pending",
      payout: 0,
      paper_trade: false,
    });
    if (error) {
      await creditWallet(follower_id, p.amount, false); // refund
      continue;
    }

    // Add to the market pool + recompute odds for the copied stake too.
    const { data: m } = await supabase
      .from("markets")
      .select("pool_up, pool_down")
      .eq("id", p.marketUuid)
      .single();
    const poolUp = Number(m?.pool_up ?? 0) + (p.direction === "up" ? p.amount : 0);
    const poolDown = Number(m?.pool_down ?? 0) + (p.direction === "down" ? p.amount : 0);
    const { oddsUp } = computeOdds(poolUp, poolDown);
    await supabase
      .from("markets")
      .update({ pool_up: poolUp, pool_down: poolDown, current_odds: oddsUp })
      .eq("id", p.marketUuid);

    await supabase.from("transactions").insert({ user_id: follower_id, type: "bet", amount: -p.amount });
    copied++;
  }
  return copied;
}
