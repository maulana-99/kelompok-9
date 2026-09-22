"use client";

import type { Track } from "@/lib/music";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

type SearchResultsProps = {
  tracks: Track[];
  onSelect: (track: Track, queue: Track[]) => void;
  currentVideoId?: string;
};

export function SearchResults({ tracks, onSelect, currentVideoId }: SearchResultsProps) {
  if (tracks.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No results yet. Search for something to get started.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {tracks.map((track) => {
        const active = track.videoId === currentVideoId;

        return (
          <li key={track.videoId}>
            <button
              type="button"
              onClick={() => onSelect(track, tracks)}
              className={`flex w-full items-center gap-4 rounded-xl p-2 text-left transition-colors ${
                active ? "bg-black/[.06] dark:bg-white/[.08]" : "hover:bg-black/[.04] dark:hover:bg-white/[.06]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnails, no fixed dimensions to declare */}
              <img
                src={track.thumbnail}
                alt=""
                loading="lazy"
                className="size-14 shrink-0 rounded-lg object-cover"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={`truncate text-sm font-medium ${active ? "text-black dark:text-white" : ""}`}>
                  {track.title}
                </span>
                <span className="truncate text-sm text-zinc-500 dark:text-zinc-400">{track.artist}</span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                {formatDuration(track.duration)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
