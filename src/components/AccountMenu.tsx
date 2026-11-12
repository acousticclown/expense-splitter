"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { signOut, type AppProfile } from "@/lib/auth";

export function AccountMenu({
  profile,
  email,
}: {
  profile: AppProfile | null;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const label =
    profile?.display_name?.trim() ||
    email.split("@")[0] ||
    "Account";
  const initial = (label[0] || "?").toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="account-menu">
      <button
        type="button"
        className="account-avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
      >
        {initial}
      </button>
      {open && (
        <div id={menuId} role="menu" className="account-popover anim-stamp">
          <div className="account-popover-meta">
            <p className="font-800 tracking-tight">{label}</p>
            <p className="truncate text-xs text-ink-soft">{email}</p>
          </div>
          <Link
            href="/profile"
            role="menuitem"
            className="account-popover-item"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <button
            type="button"
            role="menuitem"
            className="account-popover-item account-popover-danger"
            onClick={async () => {
              setOpen(false);
              await signOut();
              window.location.href = "/";
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
