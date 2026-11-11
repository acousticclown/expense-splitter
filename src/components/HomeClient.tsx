"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { AppCredit } from "@/components/AppCredit";
import { CreateGroupForm } from "@/components/CreateGroupForm";
import { GroupsList } from "@/components/GroupsList";
import {
  ensureProfile,
  getSessionUser,
  type AppProfile,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { Loader } from "@/components/ui/Loader";
import { Sheet } from "@/components/ui/Sheet";
import type { User } from "@supabase/supabase-js";

export function HomeClient() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

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
        <Loader />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="shell flex min-h-[100dvh] flex-col justify-center py-10 sm:py-16">
        <div className="welcome-card anim-rise">
          <p className="text-[0.72rem] font-800 uppercase tracking-[0.14em] text-ink-soft">
            Stub Ledger
          </p>
          <p className="font-display mt-3 text-[clamp(2.6rem,11vw,4.2rem)] font-800 leading-[0.92] tracking-tight text-ink">
            Expense
            <br />
            Splitter
          </p>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-ink-soft">
            Split spends. Settle the crew.
          </p>
          {bootError && (
            <p className="mt-4 text-sm font-semibold text-[var(--bad)]">{bootError}</p>
          )}
          <Link href="/login" className="btn btn-primary mt-7 inline-flex">
            Sign in / Sign up
          </Link>
        </div>
        <AppCredit />
      </main>
    );
  }

  return (
    <>
      <main className="shell page-pad space-y-8 py-8 sm:py-12">
        <header className="home-topbar anim-rise flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-800 uppercase tracking-[0.16em] text-ink-soft">
              Stub Ledger
            </p>
            <p className="font-display truncate text-xl font-800 tracking-tight sm:text-2xl">
              Expense Splitter
            </p>
          </div>
          <AccountMenu profile={profile} email={user.email || ""} />
        </header>

        <div className="anim-rise-delay relative z-0">
          <GroupsList onCreate={() => setCreateOpen(true)} />
        </div>

        <AppCredit />
      </main>

      <Sheet
        open={createOpen}
        title="New stub"
        onClose={() => setCreateOpen(false)}
      >
        <CreateGroupForm />
      </Sheet>
    </>
  );
}
