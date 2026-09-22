"use client";

import { useEffect, useRef, useState } from "react";

import type { Track } from "@/lib/music";

const DEBOUNCE_MS = 400;

type SearchBarProps = {
  onResults: (tracks: Track[]) => void;
};

export function SearchBar({ onResults }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timers and in-flight requests live in refs: they are not render inputs, and
  // an effect that called setState on every keystroke would render twice.
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestRef = useRef<AbortController | undefined>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      requestRef.current?.abort();
    },
    [],
  );

  async function search(term: string) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(term)}`, {
        signal: controller.signal,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Search failed.");
        onResults([]);
      } else {
        setError(null);
        onResults(data.tracks);
      }
    } catch (cause) {
      // An abort is the expected outcome of typing another character.
      if ((cause as Error).name !== "AbortError") {
        setError("Could not reach the server. Check your connection.");
        onResults([]);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function handleChange(value: string) {
    setQuery(value);
    clearTimeout(timerRef.current);

    const term = value.trim();
    if (!term) {
      requestRef.current?.abort();
      setLoading(false);
      setError(null);
      onResults([]);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(() => void search(term), DEBOUNCE_MS);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(event) => handleChange(event.target.value)}
          placeholder="Search songs, artists, albums..."
          aria-label="Search music"
          className="w-full rounded-full border border-black/15 bg-white py-3 pr-4 pl-11 text-base outline-none transition focus:border-black/40 focus:ring-2 focus:ring-black/10 dark:border-white/20 dark:bg-zinc-950 dark:focus:border-white/40 dark:focus:ring-white/10"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-zinc-400"
        >
          {loading ? (
            <span className="block size-4 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          )}
        </span>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
