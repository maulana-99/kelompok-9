import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Create an account and sign in
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Register with a unique username and a password, then sign in to reach
        your dashboard.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/register"
          className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 font-medium text-background transition-opacity hover:opacity-90"
        >
          Register
        </Link>
        <Link
          href="/login"
          className="inline-flex h-11 items-center justify-center rounded-full border border-black/15 px-6 font-medium transition-colors hover:bg-black/[.04] dark:border-white/20 dark:hover:bg-white/[.06]"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
