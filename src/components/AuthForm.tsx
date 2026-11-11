"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/auth";

type Mode = "magic" | "password" | "signup";

export function AuthForm({ next = "/" }: { next?: string }) {
  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createClient();
      if (mode === "magic") {
        const { error: err } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            data: { phone, display_name: displayName || undefined },
          },
        });
        if (err) throw err;
        setMessage("Check your email for the magic link.");
      } else if (mode === "signup") {
        if (password.length < 8) throw new Error("Password must be at least 8 characters");
        if (!phone.trim()) throw new Error("Add a phone number to your profile");
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            data: {
              phone: phone.trim(),
              display_name: displayName.trim() || email.split("@")[0],
            },
          },
        });
        if (err) throw err;
        if (data.user) {
          try {
            await ensureProfile(data.user);
          } catch {
            /* trigger may create it */
          }
        }
        if (data.session) {
          window.location.href = next;
          return;
        }
        setMessage("Check your email to confirm your account, then sign in.");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        window.location.href = next;
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="surface space-y-4 p-5 sm:p-6">
      <div>
        <p className="font-display text-2xl font-700 tracking-tight">
          {mode === "signup" ? "Create account" : "Sign in"}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Shared login across Shivansh&apos;s Mini Apps (same Supabase userbase).
        </p>
      </div>

      {(mode === "signup" || mode === "magic") && (
        <div>
          <label className="label" htmlFor="display">
            Display name {mode === "magic" ? "(optional)" : ""}
          </label>
          <input
            id="display"
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
        </div>
      )}

      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="input"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>

      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            className="input"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91…"
            autoComplete="tel"
          />
          <p className="mt-1 text-xs text-ink-soft">
            Stored on your shared profile. SMS OTP needs a paid Twilio hookup — ask before enabling.
          </p>
        </div>
      )}

      {(mode === "password" || mode === "signup") && (
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </div>
      )}

      {error && <p className="text-sm font-semibold text-[var(--bad)]">{error}</p>}
      {message && <p className="text-sm font-650 text-[var(--good)]">{message}</p>}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending
          ? "Working…"
          : mode === "magic"
            ? "Send magic link"
            : mode === "signup"
              ? "Sign up"
              : "Sign in"}
      </button>

      <div className="flex flex-col gap-2 text-center text-sm font-650 text-ink-soft">
        {mode !== "magic" && (
          <button type="button" onClick={() => setMode("magic")}>
            Use magic link instead
          </button>
        )}
        {mode !== "password" && (
          <button type="button" onClick={() => setMode("password")}>
            Use password instead
          </button>
        )}
        {mode !== "signup" ? (
          <button type="button" onClick={() => setMode("signup")}>
            Create an account
          </button>
        ) : (
          <button type="button" onClick={() => setMode("magic")}>
            Already have an account? Sign in
          </button>
        )}
      </div>
    </form>
  );
}
