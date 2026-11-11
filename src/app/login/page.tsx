import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next || "/";

  return (
    <main className="shell flex min-h-[100dvh] flex-col justify-center py-10">
      <p className="text-[0.72rem] font-800 uppercase tracking-[0.18em] text-ink-soft">
        Shared Mini Apps login
      </p>
      <p className="font-display anim-rise mt-2 mb-6 text-4xl font-800 tracking-tight">
        Expense Splitter
      </p>
      {params.error && (
        <p className="anim-rise mb-4 max-w-md text-sm font-semibold text-[var(--bad)]">
          {params.error}
        </p>
      )}
      <div className="anim-rise-delay max-w-md">
        <AuthForm next={next} />
      </div>
      <p className="mt-8 text-sm text-ink-soft">
        <Link href="/" className="text-link">
          ← Back home
        </Link>
      </p>
    </main>
  );
}
