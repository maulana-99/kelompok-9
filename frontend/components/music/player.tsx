"use client";

import { useEffect, useState } from "react";

import { useMusicPlayer } from "@/components/music/music-player-context";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

/**
 * Sticky transport bar. The <audio> element itself lives in the provider, so
 * this component only reflects and drives it through the context.
 */
export function Player() {
  const { current, isPlaying, isLoading, error, toggle, next, previous, enqueue, audioRef } =
    useMusicPlayer();
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onVolume = () => setVolume(audio.volume);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("volumechange", onVolume);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("volumechange", onVolume);
    };
  }, [audioRef]);

  if (!current) return null;

  function seek(value: number) {
    if (audioRef.current) audioRef.current.currentTime = value;
  }

  function changeVolume(value: number) {
    if (audioRef.current) audioRef.current.volume = value;
  }

  return (
    <div className="sticky bottom-0 z-10 border-t border-black/10 bg-white/90 backdrop-blur dark:border-white/15 dark:bg-zinc-950/90">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-6 py-3">
        {error ? (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail, no fixed dimensions to declare */}
          <img src={current.thumbnail} alt="" className="size-12 shrink-0 rounded-lg object-cover" />

          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{current.title}</span>
            <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">{current.artist}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={previous}
              aria-label="Previous track"
              className="grid size-9 place-items-center rounded-full transition-colors hover:bg-black/[.06] dark:hover:bg-white/[.08]"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
                <path d="M7 6h2v12H7zm3 6 8-6v12z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={toggle}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="grid size-10 place-items-center rounded-full bg-black text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
            >
              {isLoading && !isPlaying ? (
                <span className="block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : isPlaying ? (
                <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
                  <path d="M7 5h4v14H7zm6 0h4v14h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={next}
              aria-label="Next track"
              className="grid size-9 place-items-center rounded-full transition-colors hover:bg-black/[.06] dark:hover:bg-white/[.08]"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
                <path d="M15 6h2v12h-2zM6 6l8 6-8 6z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => enqueue(current)}
              aria-label="Add to queue"
              className="hidden size-9 place-items-center rounded-full transition-colors hover:bg-black/[.06] sm:grid dark:hover:bg-white/[.08]"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          <div className="hidden w-28 shrink-0 items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => changeVolume(volume > 0 ? 0 : 1)}
              aria-label={volume > 0 ? "Mute" : "Unmute"}
              className="text-zinc-500 transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
                <path d="M4 9h3l4-3v12l-4-3H4zM15 8.5a4 4 0 0 1 0 7v-7z" />
              </svg>
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => changeVolume(Number(event.target.value))}
              aria-label="Volume"
              className="h-1 w-full cursor-pointer accent-black dark:accent-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
            {formatTime(time)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={time}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="Seek"
            className="h-1 w-full cursor-pointer accent-black dark:accent-white"
          />
          <span className="w-10 shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
