import { supabase } from "../config/supabase.js";

/**
 * Atomically deduct `amount` from a user's real (or paper) balance, but only if
 * sufficient. Returns the new balance, or null if there weren't enough funds.
 * Race-proof — the check and the deduction happen in a single SQL statement.
 */
export async function debitWallet(userId: string, amount: number, paper = false): Promise<number | null> {
  const { data, error } = await supabase.rpc("debit_wallet", {
    p_user_id: userId,
    p_amount: amount,
    p_paper: paper,
  });
  if (error) throw new Error(`debit_wallet failed: ${error.message}`);
  return data == null ? null : Number(data);
}

/** Atomically add `amount` to a user's real (or paper) balance. Returns the new balance. */
export async function creditWallet(userId: string, amount: number, paper = false): Promise<number> {
  const { data, error } = await supabase.rpc("credit_wallet", {
    p_user_id: userId,
    p_amount: amount,
    p_paper: paper,
  });
  if (error) throw new Error(`credit_wallet failed: ${error.message}`);
  return Number(data ?? 0);
}
