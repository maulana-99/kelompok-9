import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/15 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          {subtitle}
        </p>
        {children}
      </div>
    </main>
  );
}
