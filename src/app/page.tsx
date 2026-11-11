import Link from "next/link";
import { CreateGroupForm } from "@/components/CreateGroupForm";

export default function HomePage() {
  return (
    <main className="shell py-12 sm:py-16">
      <p className="font-display text-5xl font-700 tracking-tight text-ink sm:text-6xl">
        Expense Splitter
      </p>
      <h1 className="mt-4 max-w-xl text-xl font-medium text-ink-soft sm:text-2xl">
        Lite Splitwise — people, expenses, balances, settle up.
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
        Create a group, add spends, and see who owes whom. Share the group link
        — no accounts required.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <CreateGroupForm />
        <aside className="panel self-start">
          <p className="font-display text-2xl font-700 tracking-tight">
            How it works
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">
            <li>Name the group and list everyone.</li>
            <li>Log expenses with who paid and who shared.</li>
            <li>Check balances and settle suggested transfers.</li>
          </ol>
          <Link
            href="https://shivanshs-mini-apps.vercel.app"
            className="btn btn-ghost mt-6 text-sm"
          >
            ← Shivansh&apos;s Mini Apps
          </Link>
        </aside>
      </div>
    </main>
  );
}
