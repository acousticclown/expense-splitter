import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseEnv } from "@/lib/env";

/**
 * Completes Supabase Auth (PKCE code or email token_hash) and redirects.
 * Cookies MUST be written onto the redirect response or the session is lost
 * and the home client can hang waiting on auth/profile.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const nextParam = url.searchParams.get("next") || "/";
  const next = nextParam.startsWith("/") ? nextParam : "/";

  const redirectTo = new URL(next, url.origin);
  const response = NextResponse.redirect(redirectTo);

  if (!hasSupabaseEnv()) {
    return response;
  }

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("auth callback exchangeCodeForSession", error.message);
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
        );
      }
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type: type as "magiclink" | "email" | "signup" | "invite" | "recovery",
        token_hash: tokenHash,
      });
      if (error) {
        console.error("auth callback verifyOtp", error.message);
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
        );
      }
    }
  } catch (err) {
    console.error("auth callback failed", err);
    return NextResponse.redirect(
      new URL("/login?error=auth_callback_failed", url.origin),
    );
  }

  return response;
}
