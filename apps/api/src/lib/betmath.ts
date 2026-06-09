import { SUPERCOIN_WIN_MULTIPLIER } from "@truestake/shared";

// Pure betting math — the single source of truth for payouts, used by the
// settlement engine and covered by unit tests.

export const INSURANCE_PREMIUM = 0.1; // +10% of stake to insure
export const INSURANCE_REFUND_RATE = 0.5; // 50% of stake back on an insured loss
export const WIN_MULTIPLIER = 2; // even-money 2× payout

/** Total amount charged at bet time (stake + optional insurance premium). */
export function betCost(amount: number, insured: boolean): number {
  return insured ? amount * (1 + INSURANCE_PREMIUM) : amount;
}

export interface BetOutcome {
  won: boolean;
  payout: number;
  supercoins: number;
  insuranceRefund: number;
}

/**
 * Resolve a single bet against the settled value. `up` wins when the value lands
 * at or above the prediction; `down` wins below it.
 */
export function resolveBet(
  direction: "up" | "down",
  prediction: number,
  amount: number,
  value: number,
  insured: boolean,
): BetOutcome {
  const predictedUp = direction === "up";
  const actualUp = value >= prediction;
  const won = predictedUp === actualUp;
  const payout = won ? amount * WIN_MULTIPLIER : 0;
  const supercoins = won ? Math.floor(payout * SUPERCOIN_WIN_MULTIPLIER) : 0;
  const insuranceRefund = !won && insured ? amount * INSURANCE_REFUND_RATE : 0;
  return { won, payout, supercoins, insuranceRefund };
}
