import Link from "next/link";
import { CreateGroupForm } from "@/components/CreateGroupForm";

export default function HomePage() {
  return (
    <main className="shell flex min-h-[100dvh] flex-col justify-center py-10 sm:py-16">
      <div className="anim-rise max-w-xl">
        <p className="font-display text-[clamp(2.75rem,12vw,4.75rem)] font-800 leading-[0.92] tracking-tight text-ink">
          Expense
          <br />
          Splitter
        </p>
        <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
          Split spends, see who owes whom, settle up. Share one link — no
          accounts.
        </p>
      </div>

      <div className="mt-8 max-w-lg sm:mt-10">
        <CreateGroupForm />
      </div>

      <p className="mt-8 text-sm text-ink-soft">
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
