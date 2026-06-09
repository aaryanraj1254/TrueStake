import { createClient } from "@supabase/supabase-js";

// Note: `||` (not `??`) so empty-string env values fall back too — an empty
// VITE_SUPABASE_URL would otherwise make createClient throw and crash the app.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "https://placeholder.supabase.co";
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || "placeholder-anon-key";

if (url.includes("placeholder")) {
  console.warn("[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — auth will not work until set.");
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
