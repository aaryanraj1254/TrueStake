import { createHash } from "node:crypto";

// Live-feed markets carry synthetic ids ("crypto:bitcoin"). Derive a stable
// v5-style UUID so the same market always maps to the same DB row.
export function deterministicUuid(input: string): string {
  const h = createHash("sha1").update(input).digest("hex").slice(0, 32).split("");
  h[12] = "5"; // version
  h[16] = ((parseInt(h[16]!, 16) & 0x3) | 0x8).toString(16); // variant
  const s = h.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

const DEFAULT_ODDS = 2.0;

/**
 * Parimutuel odds: a side's payout multiplier = total_pool / pool_on_that_side.
 * With no stake on a side yet, fall back to a flat 2.0×.
 */
export function computeOdds(poolUp: number, poolDown: number) {
  const total = poolUp + poolDown;
  const oddsUp = poolUp > 0 ? Number((total / poolUp).toFixed(3)) : DEFAULT_ODDS;
  const oddsDown = poolDown > 0 ? Number((total / poolDown).toFixed(3)) : DEFAULT_ODDS;
  return { oddsUp, oddsDown, total };
}
