import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseEnv } from "@/lib/env";

function safeNext(raw: string | null): string {
  if (!raw) return "/";
  return raw.startsWith("/") ? raw : "/";
}

/** Humanize common Supabase PKCE / magic-link failures. */
export function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("pkce") || lower.includes("code verifier")) {
    return "Magic link expired or was opened in a different browser. Request a new link on this device, or use password.";
  }
  if (lower.includes("expired") || lower.includes("otp")) {
    return "That sign-in link expired. Request a new magic link.";
  }
  return message;
}

function loginErrorRedirect(request: NextRequest, next: string, message: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", next);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

/**
 * Server-side PKCE exchange. The code verifier lives in cookies set by
 * `@supabase/ssr` createBrowserClient when the magic link was requested.
 * Session cookies are written onto the redirect response.
 */
export async function GET(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return loginErrorRedirect(request, "/", "Auth is not configured");
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNext(searchParams.get("next"));

  const successUrl = request.nextUrl.clone();
  successUrl.pathname = next;
  successUrl.search = "";

  // Mutable redirect; cookie setAll writes onto this response.
  let response = NextResponse.redirect(successUrl);

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.redirect(successUrl);
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
        return loginErrorRedirect(request, next, friendlyAuthError(error.message));
      }
      return response;
    }

    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type: type as
          | "magiclink"
          | "email"
          | "signup"
          | "invite"
          | "recovery"
          | "email_change",
        token_hash: tokenHash,
      });
      if (error) {
        return loginErrorRedirect(request, next, friendlyAuthError(error.message));
      }
      return response;
    }

    if (searchParams.has("error") || searchParams.has("error_description")) {
      const desc =
        searchParams.get("error_description") ||
        searchParams.get("error") ||
        "Sign-in failed";
      return loginErrorRedirect(request, next, friendlyAuthError(desc));
    }

    // No code/token — client page can finish hash-based redirects.
    const confirm = request.nextUrl.clone();
    confirm.pathname = "/auth/confirm";
    confirm.search = "";
    confirm.searchParams.set("next", next);
    return NextResponse.redirect(confirm);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sign-in failed";
    return loginErrorRedirect(request, next, friendlyAuthError(msg));
  }
}
