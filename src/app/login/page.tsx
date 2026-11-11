import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next || "/";

  return (
    <main className="shell flex min-h-[100dvh] flex-col justify-center py-10">
      <p className="font-display anim-rise mb-6 text-4xl font-800 tracking-tight">
        Expense Splitter
      </p>
      <div className="anim-rise-delay max-w-md">
        <AuthForm next={next} />
      </div>
      <p className="mt-8 text-sm text-ink-soft">
        <Link href="/" className="font-650 underline underline-offset-4">
          ← Back home
        </Link>
      </p>
    </main>
  );
}
