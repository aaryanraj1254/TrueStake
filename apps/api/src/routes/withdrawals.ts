import { Router } from "express";
import { z } from "zod";
import { supabase } from "../config/supabase.js";
import { debitWallet } from "../lib/wallet.js";
import { requireAdmin } from "../middleware/admin.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/error.js";

// ─────────────────────────── user withdrawals ───────────────────────────
export const withdrawalsRouter: Router = Router();

const createSchema = z
  .object({
    amount: z.number().positive(),
    method: z.enum(["bank", "metamask"]).default("bank"),
    destination: z.string().optional(),
  })
  .refine((v) => v.method !== "metamask" || /^0x[a-fA-F0-9]{40}$/.test(v.destination ?? ""), {
    message: "A valid MetaMask address (0x…) is required for crypto withdrawals",
    path: ["destination"],
  });

// POST /api/withdrawals — request a withdrawal (PENDING). Balance is validated
// now but only deducted on admin approval.
withdrawalsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { amount, method, destination } = createSchema.parse(req.body);

    const { data: wallet, error } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", req.userId!)
      .single();
    if (error || !wallet) throw new HttpError(404, "Wallet not found");
    if (Number(wallet.balance) < amount) throw new HttpError(400, "Insufficient balance");

    // Guard against stacking pending requests beyond the available balance.
    const { data: pending } = await supabase
      .from("withdrawals")
      .select("amount")
      .eq("user_id", req.userId!)
      .eq("status", "pending");
    const pendingTotal = (pending ?? []).reduce((s, w) => s + Number(w.amount), 0);
    if (pendingTotal + amount > Number(wallet.balance)) {
      throw new HttpError(400, "Amount exceeds balance available after pending withdrawals");
    }

    const { data: withdrawal, error: wErr } = await supabase
      .from("withdrawals")
      .insert({ user_id: req.userId!, amount, status: "pending", method, destination: destination ?? null })
      .select("*")
      .single();
    if (wErr) throw new HttpError(500, wErr.message);

    // Persist the MetaMask address on the wallet for convenience next time.
    if (method === "metamask" && destination) {
      await supabase.from("wallets").update({ metamask_address: destination }).eq("user_id", req.userId!);
    }

    res.status(201).json(withdrawal);
  }),
);

// GET /api/withdrawals — the user's own withdrawal requests.
withdrawalsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { data, error } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", req.userId!)
      .order("requested_at", { ascending: false });
    if (error) throw new HttpError(500, error.message);
    res.json(data);
  }),
);

// ─────────────────────────── admin withdrawals ──────────────────────────
export const adminWithdrawalsRouter: Router = Router();

// GET /api/admin/withdrawals — review queue (optionally filter by status).
adminWithdrawalsRouter.get(
  "/",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    // Disambiguate the join: withdrawals has two FKs to users (user_id and
    // processed_by), so PostgREST needs the explicit column hint.
    let query = supabase
      .from("withdrawals")
      .select("*, users!withdrawals_user_id_fkey(username, email)")
      .order("requested_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw new HttpError(500, error.message);
    res.json(data);
  }),
);

// POST /api/admin/withdrawals/:id/approve — re-validate balance, deduct, ledger.
adminWithdrawalsRouter.post(
  "/:id/approve",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = z.string().uuid().parse(req.params.id);

    const { data: w, error } = await supabase.from("withdrawals").select("*").eq("id", id).single();
    if (error || !w) throw new HttpError(404, "Withdrawal not found");
    if (w.status !== "pending") throw new HttpError(400, `Withdrawal already ${w.status}`);

    // Deduct only now, on approval — atomic debit that re-validates balance.
    const remaining = await debitWallet(w.user_id, Number(w.amount), false);
    if (remaining === null) throw new HttpError(400, "User no longer has sufficient balance");
    await supabase.from("transactions").insert({ user_id: w.user_id, type: "withdraw", amount: -Number(w.amount) });
    const { data: updated, error: uErr } = await supabase
      .from("withdrawals")
      .update({ status: "approved", processed_by: req.userId!, processed_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (uErr) throw new HttpError(500, uErr.message);

    res.json(updated);
  }),
);

// POST /api/admin/withdrawals/:id/reject — mark rejected with an optional note.
adminWithdrawalsRouter.post(
  "/:id/reject",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: AuthedRequest, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const { note } = z.object({ note: z.string().optional() }).parse(req.body ?? {});

    const { data: w } = await supabase.from("withdrawals").select("status").eq("id", id).single();
    if (!w) throw new HttpError(404, "Withdrawal not found");
    if (w.status !== "pending") throw new HttpError(400, `Withdrawal already ${w.status}`);

    const { data: updated, error } = await supabase
      .from("withdrawals")
      .update({ status: "rejected", note: note ?? null, processed_by: req.userId!, processed_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new HttpError(500, error.message);

    res.json(updated);
  }),
);
