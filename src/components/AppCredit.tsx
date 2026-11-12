import Link from "next/link";

/** Quiet product attribution — never a primary nav control. */
export function AppCredit() {
  return (
    <p className="app-credit">
      Part of{" "}
      <Link
        href="https://shivanshs-mini-apps.vercel.app"
        className="app-credit-link"
        target="_blank"
        rel="noreferrer"
      >
        Shivansh&apos;s Mini Apps
      </Link>
    </p>
  );
}
