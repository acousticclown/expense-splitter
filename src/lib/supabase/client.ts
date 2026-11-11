import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseEnv } from "@/lib/env";

export function createClient() {
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase env vars are not configured");
  }
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
