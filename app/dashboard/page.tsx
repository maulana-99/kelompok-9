"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = { id: number; username: string };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(stored));
  }, [router]);

  function logout() {
    localStorage.removeItem("user");
    router.push("/login");
  }

  if (!user) return null;

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col gap-4 w-full max-w-sm p-8 border rounded-xl">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-zinc-500">Signed in as <span className="font-medium text-black">{user.username}</span></p>
        <button
          onClick={logout}
          className="bg-black text-white rounded-lg py-2 font-medium"
        >
          Logout
        </button>
      </div>
    </main>
  );
}
