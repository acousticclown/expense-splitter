import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabase } from "@/lib/env";

export function createBrowserSupabase() {
  if (!hasSupabase()) {
    throw new Error("Supabase is not configured");
  }
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
