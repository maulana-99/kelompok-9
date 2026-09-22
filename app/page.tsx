import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col gap-4 items-center text-center">
        <h1 className="text-3xl font-semibold">Kelompok 9</h1>
        <div className="flex gap-3">
          <Link href="/login" className="bg-black text-white rounded-lg px-5 py-2 font-medium">
            Sign in
          </Link>
          <Link href="/register" className="border rounded-lg px-5 py-2 font-medium">
            Register
          </Link>
          <Link href="/music" className="border rounded-lg px-5 py-2 font-medium">
            Music
          </Link>
        </div>
      </div>
    </main>
  );
}
