import type { NextFunction, Response } from "express";
import { supabase } from "../config/supabase.js";
import type { AuthedRequest } from "./auth.js";

/**
 * Requires the authenticated user to have users.is_admin = true.
 * Must run after `requireAuth`.
 */
export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const { data, error } = await supabase.from("users").select("is_admin").eq("id", req.userId).single();
  if (error || !data?.is_admin) {
    res.status(403).json({ error: "forbidden", message: "Admin access required" });
    return;
  }
  next();
}
