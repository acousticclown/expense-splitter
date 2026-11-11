"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CreateGroupForm } from "@/components/CreateGroupForm";
import { GroupsList } from "@/components/GroupsList";
import { ensureProfile, getSessionUser, signOut, type AppProfile } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

export function HomeClient() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSessionUser()
      .then(async (u) => {
        setUser(u);
        if (u) setProfile(await ensureProfile(u));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="shell py-16 text-ink-soft">Loading…</p>;
  }

  if (!user) {
    return (
      <main className="shell flex min-h-[100dvh] flex-col justify-center py-10 sm:py-16">
        <div className="anim-rise max-w-xl">
          <p className="font-display text-[clamp(2.75rem,12vw,4.75rem)] font-800 leading-[0.92] tracking-tight text-ink">
            Expense
            <br />
            Splitter
          </p>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
            Split spends, see who owes whom, settle up. Sign in to keep your
            groups across devices — shared with Shivansh&apos;s Mini Apps.
          </p>
          <Link href="/login" className="btn btn-primary mt-8 inline-flex">
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
          <p className="font-display text-[clamp(2.4rem,10vw,3.75rem)] font-800 leading-[0.92] tracking-tight">
            Expense Splitter
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            Hi {profile?.display_name || user.email} · {profile?.phone || "add phone in profile"}
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

      <div className="anim-rise-delay surface p-5 sm:p-6">
        <GroupsList />
      </div>

      <section className="max-w-lg">
        <h2 className="font-display mb-4 text-xl font-700 tracking-tight">
          Create a group
        </h2>
        <CreateGroupForm />
      </section>

      <p className="text-sm text-ink-soft">
        <Link
          href="https://shivanshs-mini-apps.vercel.app"
          className="font-semibold text-ink underline decoration-[var(--accent-deep)] underline-offset-4"
        >
          ← Shivansh&apos;s Mini Apps
        </Link>
      </p>
    </main>
  );
}
