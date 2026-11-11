"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

type Props = {
  name: string;
  currency: string;
};

export function GroupHeader({ name, currency }: Props) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function copyLink() {
    try {
      await navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <header className="group-header">
      <Link href="/" className="group-header-side group-header-back" aria-label="Back to stubs">
        <span aria-hidden>←</span>
      </Link>

      <div className="group-header-center" ref={menuRef}>
        <h1 className="group-header-title" title={name}>
          {name}
        </h1>
        <button
          type="button"
          className="group-header-more"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label="Stub menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span aria-hidden>···</span>
        </button>
        {menuOpen && (
          <div id={menuId} role="menu" className="group-header-popover anim-stamp">
            <div className="group-header-popover-meta" role="presentation">
              <p className="font-800 tracking-tight truncate">{name}</p>
              <p className="text-xs text-ink-soft">Currency · {currency}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              className="account-popover-item"
              onClick={async () => {
                setMenuOpen(false);
                await copyLink();
              }}
            >
              Copy share link
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        className="group-header-side group-header-copy"
        aria-label={copied ? "Link copied" : "Copy share link"}
        title={copied ? "Copied" : "Copy share link"}
        onClick={copyLink}
      >
        {copied ? (
          <span className="group-header-copy-done" aria-hidden>
            ✓
          </span>
        ) : (
          <svg
            className="group-header-copy-icon"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            aria-hidden
          >
            <rect
              x="9"
              y="9"
              width="11"
              height="11"
              rx="2.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M7 15H6a2.2 2.2 0 0 1-2.2-2.2V6A2.2 2.2 0 0 1 6 3.8h6.8A2.2 2.2 0 0 1 15 6v1"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
    </header>
  );
}
