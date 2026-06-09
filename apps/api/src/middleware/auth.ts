import type { NextFunction, Request, Response } from "express";
import { supabase } from "../config/supabase.js";
import { markActiveUser } from "../lib/metrics.js";

export interface AuthedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

/**
 * Validates the Supabase JWT in the Authorization: Bearer <token> header.
 * Attaches userId / userEmail to the request.
 */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", message: "Missing bearer token" });
    return;
  }
  const token = header.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired token" });
    return;
  }
  req.userId = data.user.id;
  req.userEmail = data.user.email ?? undefined;
  markActiveUser(data.user.id);
  next();
}
