"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { saveUser } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }

    saveUser(data);
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm p-8 border rounded-xl">
        <h1 className="text-2xl font-semibold">Sign in</h1>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-black/20"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-black/20"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white rounded-lg py-2 font-medium disabled:opacity-50"
        >
          {loading ? "Loading..." : "Sign in"}
        </button>

        <p className="text-sm text-center text-zinc-500">
          No account?{" "}
          <Link href="/register" className="underline">Register</Link>
        </p>
      </form>
    </main>
  );
}
