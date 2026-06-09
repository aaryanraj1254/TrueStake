import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// Service-role client — bypasses RLS. Only ever used server-side.
export const supabase = createClient(env.supabaseUrl || "http://localhost", env.supabaseServiceKey || "anon", {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
