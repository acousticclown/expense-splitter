"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ensureProfile,
  getSessionUser,
  updateProfile,
  type AppProfile,
} from "@/lib/auth";
import { Loader } from "@/components/ui/Loader";

export default function ProfilePage() {
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSessionUser().then(async (u) => {
      if (!u) {
        window.location.href = "/login?next=/profile";
        return;
      }
      const p = await ensureProfile(u);
      setProfile(p);
      setDisplayName(p.display_name);
      setPhone(p.phone);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <main className="shell flex min-h-[50dvh] items-center justify-center py-16">
        <Loader label="Loading profile…" />
      </main>
    );
  }

  return (
    <main className="shell max-w-lg space-y-6 py-10">
      <Link href="/" className="text-sm font-700 text-ink-soft hover:text-ink">
        ← Stubs
      </Link>
      <h1 className="font-display text-3xl font-800 tracking-tight">Profile</h1>
      <p className="text-sm text-ink-soft">
        Shared across mini-apps via Supabase project <code>yconkkmnfyykhwflumed</code>.
      </p>
      <form
        className="surface space-y-4 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError(null);
          setMessage(null);
          try {
            const p = await updateProfile({
              display_name: displayName.trim(),
              phone: phone.trim(),
            });
            setProfile(p);
            setMessage("Saved.");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save");
          } finally {
            setPending(false);
          }
        }}
      >
        <div>
          <p className="label">Email</p>
          <p className="font-650">{profile?.email}</p>
        </div>
        <div>
          <label className="label" htmlFor="dn">
            Display name
          </label>
          <input
            id="dn"
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="ph">
            Phone
          </label>
          <input
            id="ph"
            className="input"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91…"
          />
        </div>
        {error && <p className="text-sm font-semibold text-[var(--bad)]">{error}</p>}
        {message && <p className="text-sm font-650 text-[var(--good)]">{message}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </main>
  );
}
