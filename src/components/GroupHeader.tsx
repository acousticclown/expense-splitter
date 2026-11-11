"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  name: string;
  currency: string;
};

export function GroupHeader({ name, currency }: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const panelId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.classList.add("group-header-overlay-open");
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("group-header-overlay-open");
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function copyLink() {
    try {
      await navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  const scrim =
    open && mounted
      ? createPortal(
          <button
            type="button"
            className="group-header-scrim"
            aria-label="Close stub details"
            onClick={() => setOpen(false)}
          />,
          document.body,
        )
      : null;

  return (
    <>
      {scrim}
      <header
        ref={rootRef}
        className={`group-header${open ? " is-open" : ""}`}
      >
        <div className="group-header-sheet">
          <div className="group-header-bar">
            <Link
              href="/"
              className="group-header-side group-header-back"
              aria-label="Back to stubs"
            >
              <span aria-hidden>←</span>
            </Link>

            <div className="group-header-center">
              <button
                type="button"
                className="group-header-title-btn"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen((v) => !v)}
              >
                <h1 className="group-header-title" title={name}>
                  {name}
                </h1>
                <span
                  className={`group-header-chevron${open ? " is-open" : ""}`}
                  aria-hidden
                >
                  <svg viewBox="0 0 20 20" width="16" height="16">
                    <path
                      d="M5 7.5 10 12.5 15 7.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
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
                <CopyIcon />
              )}
            </button>
          </div>

          {open && (
            <div
              id={panelId}
              className="group-header-panel"
              role="region"
              aria-label="Stub details"
            >
              <div className="group-header-panel-body">
                <p className="group-header-panel-name">{name}</p>
                <p className="group-header-panel-meta">Currency · {currency}</p>
                <button
                  type="button"
                  className="btn-boxy-split group-header-panel-cta"
                  onClick={async () => {
                    await copyLink();
                  }}
                >
                  <span className="btn-boxy-split-label">
                    {copied ? "Link copied" : "Copy share link"}
                  </span>
                  <span className="btn-boxy-split-arrow" aria-hidden>
                    →
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}

function CopyIcon() {
  return (
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
  );
}
