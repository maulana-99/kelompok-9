"use client";

import { useCallback, useState } from "react";

import { MusicPlayerProvider, useMusicPlayer } from "@/components/music/music-player-context";
import { Player } from "@/components/music/player";
import { SearchBar } from "@/components/music/search-bar";
import { SearchResults } from "@/components/music/search-results";
import type { Track } from "@/lib/music";

function MusicBrowser() {
  const { current, play } = useMusicPlayer();
  const [results, setResults] = useState<Track[]>([]);

  // Stable identity: SearchBar debounces on this callback, so a new function
  // identity on every render would restart the timer forever.
  const onResults = useCallback((tracks: Track[]) => setResults(tracks), []);

  return (
    <>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Music</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Search and play from YouTube Music.
          </p>
        </header>

        <SearchBar onResults={onResults} />

        <SearchResults
          tracks={results}
          onSelect={(track, queue) => play(track, queue)}
          currentVideoId={current?.videoId}
        />
      </main>

      <Player />
    </>
  );
}

export default function MusicPage() {
  return (
    <MusicPlayerProvider>
      <MusicBrowser />
    </MusicPlayerProvider>
  );
}
