import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseEnv } from "@/lib/env";

/**
 * Browser Supabase client. Session + PKCE code verifier are stored in cookies
 * via `@supabase/ssr` so the server `/auth/callback` route can exchange codes.
 */
export function createClient() {
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase env vars are not configured");
  }
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
    },
    // Callback route handles `?code=` server-side — avoid a second client race.
    auth: {
      detectSessionInUrl: false,
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
