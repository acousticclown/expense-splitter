"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CreateGroupForm } from "@/components/CreateGroupForm";
import { GroupsList } from "@/components/GroupsList";
import {
  ensureProfile,
  getSessionUser,
  signOut,
  type AppProfile,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { Loader } from "@/components/ui/Loader";
import type { User } from "@supabase/supabase-js";

export function HomeClient() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const sb = createClient();

        if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
          await sb.auth.getSession();
          window.history.replaceState({}, "", window.location.pathname + window.location.search);
        }

        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code) {
          const { error } = await sb.auth.exchangeCodeForSession(code);
          if (error) throw error;
          params.delete("code");
          const qs = params.toString();
          window.history.replaceState(
            {},
            "",
            window.location.pathname + (qs ? `?${qs}` : ""),
          );
        }

        const u = await getSessionUser();
        if (cancelled) return;
        setUser(u);
        if (u) {
          const p = await ensureProfile(u);
          if (!cancelled) setProfile(p);
        }
      } catch (err) {
        if (!cancelled) {
          setBootError(err instanceof Error ? err.message : "Could not restore session");
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        setBootError((prev) => prev || "Sign-in is taking too long — try again.");
      }
    }, 8000);

    void boot().finally(() => window.clearTimeout(timeout));

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  if (loading) {
    return (
      <main className="shell flex min-h-[40vh] items-center justify-center py-16">
        <Loader label="Warming the stamp pad…" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="shell relative flex min-h-[100dvh] flex-col justify-end overflow-hidden pb-12 pt-10 sm:justify-center sm:pb-16">
        <div
          className="pointer-events-none absolute -right-10 top-16 h-40 w-40 rotate-12 rounded-[1.25rem] bg-[var(--accent)]/25 blur-[1px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-[-2rem] top-[28%] h-24 w-56 -rotate-6 rounded-full border border-[var(--line)] bg-white/40"
          aria-hidden
        />
        <div className="anim-rise relative max-w-xl">
          <p className="text-[0.72rem] font-800 uppercase tracking-[0.18em] text-ink-soft">
            Stub Ledger
          </p>
          <p className="font-display mt-3 text-[clamp(3rem,14vw,5.2rem)] font-800 leading-[0.88] tracking-tight text-ink">
            Expense
            <br />
            Splitter
          </p>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
            Tear off a stub, stamp the spends, settle the crew. One shared login
            across Shivansh&apos;s Mini Apps.
          </p>
          {bootError && (
            <p className="mt-4 text-sm font-semibold text-[var(--bad)]">{bootError}</p>
          )}
          <Link href="/login" className="btn btn-primary mt-8 inline-flex anim-stamp">
            Sign in / Sign up
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="shell page-pad space-y-10 py-10 sm:py-14">
      <header className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.72rem] font-800 uppercase tracking-[0.18em] text-ink-soft">
            Stub Ledger
          </p>
          <p className="font-display mt-2 text-[clamp(2.4rem,10vw,3.75rem)] font-800 leading-[0.9] tracking-tight">
            Expense Splitter
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            Hi {profile?.display_name || user.email}
            {profile?.phone ? ` · ${profile.phone}` : " · add phone in profile"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/profile" className="btn btn-ghost text-sm">
            Profile
          </Link>
          <button
            type="button"
            className="btn btn-ink text-sm"
            onClick={async () => {
              await signOut();
              window.location.href = "/";
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="anim-rise-delay">
        <GroupsList />
      </div>

      <section className="anim-rise-delay max-w-lg">
        <div className="perforation" aria-hidden />
        <h2 className="font-display mb-1 text-2xl font-800 tracking-tight">
          New stub
        </h2>
        <p className="mb-4 text-sm text-ink-soft">
          Name the trip, stamp the crew, pick a currency.
        </p>
        <CreateGroupForm />
      </section>

      <p className="text-sm text-ink-soft">
        <Link
          href="https://shivanshs-mini-apps.vercel.app"
          className="font-semibold text-ink underline decoration-[var(--accent)] underline-offset-4"
        >
          ← Shivansh&apos;s Mini Apps
        </Link>
      </p>
    </main>
  );
}
