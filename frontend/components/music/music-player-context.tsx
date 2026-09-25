"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import type { Track } from "@/lib/music";

type MusicPlayerValue = {
  current: Track | null;
  queue: Track[];
  isPlaying: boolean;
  /** `true` while the audio element is buffering and cannot play yet. */
  isLoading: boolean;
  error: string | null;
  play: (track: Track, queue?: Track[]) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  enqueue: (track: Track) => void;
  /** The single <audio> element, owned here and driven by <Player>. */
  audioRef: RefObject<HTMLAudioElement | null>;
};

const MusicPlayerContext = createContext<MusicPlayerValue | null>(null);

export function useMusicPlayer(): MusicPlayerValue {
  const value = useContext(MusicPlayerContext);
  if (!value) throw new Error("useMusicPlayer must be used within <MusicPlayerProvider>");
  return value;
}

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const play = useCallback((track: Track, nextQueue?: Track[]) => {
    setError(null);
    setCurrent(track);
    if (nextQueue) setQueue(nextQueue);
  }, []);

  // Driving the element from an effect keeps state and playback from diverging:
  // `current` is committed first, then this loads and starts the new source.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;

    setIsLoading(true);
    audio.src = `/api/music/stream/${current.videoId}`;
    audio.play().catch(() => {
      // Autoplay policies reject play() until the user interacts with the page.
      setIsPlaying(false);
    });
  }, [current]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [current]);

  const step = useCallback(
    (offset: number) => {
      setCurrent((active) => {
        if (!active || queue.length === 0) return active;
        const index = queue.findIndex((track) => track.videoId === active.videoId);
        if (index === -1) return active;
        return queue[(index + offset + queue.length) % queue.length];
      });
    },
    [queue],
  );

  const next = useCallback(() => step(1), [step]);
  const previous = useCallback(() => step(-1), [step]);

  const enqueue = useCallback((track: Track) => {
    setQueue((pending) =>
      pending.some((item) => item.videoId === track.videoId) ? pending : [...pending, track],
    );
  }, []);

  const value = useMemo<MusicPlayerValue>(
    () => ({
      current,
      queue,
      isPlaying,
      isLoading,
      error,
      play,
      toggle,
      next,
      previous,
      enqueue,
      audioRef,
    }),
    [current, queue, isPlaying, isLoading, error, play, toggle, next, previous, enqueue],
  );

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onEnded={next}
        onError={() => {
          setIsLoading(false);
          setIsPlaying(false);
          setError("This track could not be played.");
        }}
      />
    </MusicPlayerContext.Provider>
  );
}
