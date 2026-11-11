"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/auth";
import { Loader } from "@/components/ui/Loader";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("Completing sign-in…");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const sb = createClient();
      const nextRaw = params.get("next") || "/";
      const next = nextRaw.startsWith("/") ? nextRaw : "/";
      const code = params.get("code");
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      try {
        if (code) {
          const { error } = await sb.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && type) {
          const { error } = await sb.auth.verifyOtp({
            type: type as
              | "magiclink"
              | "email"
              | "signup"
              | "invite"
              | "recovery",
            token_hash: tokenHash,
          });
          if (error) throw error;
        } else if (
          typeof window !== "undefined" &&
          window.location.hash.includes("access_token")
        ) {
          // Implicit magic-link: tokens live in the hash (server never sees them).
          const hash = new URLSearchParams(window.location.hash.slice(1));
          const access_token = hash.get("access_token");
          const refresh_token = hash.get("refresh_token");
          if (!access_token || !refresh_token) {
            throw new Error("Magic-link tokens missing from redirect");
          }
          const { error } = await sb.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) throw error;
        } else {
          const { data } = await sb.auth.getSession();
          if (!data.session) {
            throw new Error("Missing auth code — request a new magic link");
          }
        }

        const { data: userData } = await sb.auth.getUser();
        if (userData.user) {
          try {
            await ensureProfile(userData.user);
          } catch {
            /* non-blocking */
          }
        }

        if (!cancelled) {
          window.history.replaceState({}, "", next);
          router.replace(next);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Sign-in failed";
        if (!cancelled) {
          setMessage(msg);
          router.replace(`/login?error=${encodeURIComponent(msg)}`);
        }
      }
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <main className="shell flex min-h-[100dvh] flex-col items-center justify-center gap-4 py-16">
      <Loader label={message} />
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="shell flex min-h-[100dvh] items-center justify-center py-16">
          <Loader label="Completing sign-in…" />
        </main>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
