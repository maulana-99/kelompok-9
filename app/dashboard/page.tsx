import { redirect } from "next/navigation";

import { logoutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // The proxy already gates this route, but a cookie is not proof of a valid
  // session, so re-check against the database before rendering.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="rounded-2xl border border-black/10 bg-white p-8 dark:border-white/15 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500">Signed in as</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {user.username}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          This page is only reachable with a valid session.
        </p>

        <form action={logoutAction} className="mt-6">
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-full border border-black/15 px-5 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/20 dark:hover:bg-white/[.06]"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
