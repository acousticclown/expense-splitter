import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabase } from "@/lib/env";

let browserClient: SupabaseClient | null = null;

export function createBrowserSupabase() {
  if (!hasSupabase()) {
    throw new Error("Supabase is not configured");
  }
  if (browserClient) return browserClient;
  browserClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return browserClient;
}
