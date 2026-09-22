"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { clearUser, useCurrentUser } from "@/lib/session";

export default function DashboardPage() {
  const router = useRouter();
  const user = useCurrentUser();

  // Redirecting is a navigation, not a state update, so it belongs in an effect.
  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  function logout() {
    clearUser();
    router.replace("/login");
  }

  if (!user) return null;

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col gap-4 w-full max-w-sm p-8 border rounded-xl">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-zinc-500">
          Signed in as <span className="font-medium text-black">{user.username}</span>
        </p>
        <button onClick={logout} className="bg-black text-white rounded-lg py-2 font-medium">
          Logout
        </button>
      </div>
    </main>
  );
}
