import { type MouseEvent } from 'react';
import {
  Heart,
  Shuffle,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Repeat,
  Mic2,
  ListMusic,
  MonitorSpeaker,
  Volume2,
} from 'lucide-react';
import { cx, toClock } from '../lib/utils';
import TrackThumb from './TrackThumb';
import AddToPlaylistButton from './AddToPlaylistMenu';
import type { Track } from '../types';

interface PlayerFooterProps {
  track: Track | null;
  total: number;
  isPlaying: boolean;
  progress: number;
  volume: number;
  liked: boolean;
  onToggleLike: () => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onVolume: (volume: number) => void;
}

/** Bottom player bar (persisten di semua halaman setelah login). */
export default function PlayerFooter({
  track,
  total,
  isPlaying,
  progress,
  volume,
  liked,
  onToggleLike,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolume,
}: PlayerFooterProps) {
  const percent = total ? Math.min(100, (progress / total) * 100) : 0;

  const handleBar = (cb: (value: number) => void) => (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    cb(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
  };

  const ghostBtn = 'p-1 text-muted transition-colors hover:text-primary';

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 flex h-[76px] items-center justify-between border-t border-line/40 bg-sunken/95 px-6 backdrop-blur-[12px]">
      {/* Now playing */}
      <div className="flex w-[308px] min-w-[200px] items-center gap-[14px]">
        <TrackThumb track={track} className="size-12 border-line/60 bg-line" iconClassName="size-4 text-primary-soft" />
        <div className="min-w-0">
          <div className="flex items-center gap-[6px]">
            <p className="truncate text-[14px] font-semibold leading-5 text-ink">
              {track ? track.title : 'Belum ada lagu'}
            </p>
            {track && track.explicit && (
              <span className="bg-primary/10 px-1 text-[10px] font-semibold leading-[15px] text-primary">E</span>
            )}
          </div>
          <p className="truncate text-[12px] leading-4 text-muted">{track ? track.artist : 'Pilih lagu dari hasil pencarian'}</p>
        </div>
        <AddToPlaylistButton track={track} iconSize="size-[15px]" className="py-1" />
        <button
          type="button"
          aria-label="Like"
          aria-pressed={liked}
          onClick={onToggleLike}
          disabled={!track}
          className={cx(ghostBtn, 'ml-1', liked && 'text-primary', !track && 'cursor-not-allowed opacity-40')}
        >
          <Heart className="size-[16.6px]" fill={liked ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Controls */}
      <div className="flex w-[576px] max-w-[672px] flex-col items-center justify-center px-4">
        <div className="flex items-center gap-5 pb-1">
          <button type="button" aria-label="Shuffle" className={ghostBtn}>
            <Shuffle className="size-3" />
          </button>
          <button type="button" aria-label="Previous" onClick={onPrev} disabled={!track} className={cx(ghostBtn, !track && 'cursor-not-allowed opacity-40')}>
            <SkipBack className="size-[11px]" fill="currentColor" />
          </button>
          <button
            type="button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={onTogglePlay}
            disabled={!track}
            className={cx('flex size-9 items-center justify-center bg-primary text-on-primary hover:brightness-110', !track && 'cursor-not-allowed opacity-40')}
          >
            {isPlaying ? (
              <Pause className="size-[12.8px]" fill="currentColor" />
            ) : (
              <Play className="size-[12.8px]" fill="currentColor" />
            )}
          </button>
          <button type="button" aria-label="Next" onClick={onNext} disabled={!track} className={cx(ghostBtn, !track && 'cursor-not-allowed opacity-40')}>
            <SkipForward className="size-[11px]" fill="currentColor" />
          </button>
          <button type="button" aria-label="Repeat" className={ghostBtn}>
            <Repeat className="size-[14px]" />
          </button>
        </div>

        <div className="flex w-full items-center gap-3">
          <span className="w-8 text-right text-[12px] leading-4 text-muted">{toClock(progress)}</span>
          <div
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={Math.floor(progress)}
            tabIndex={0}
            onClick={handleBar((r) => onSeek(r * total))}
            className="relative h-1 flex-1 cursor-pointer overflow-hidden bg-line"
          >
            <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${percent}%` }} />
          </div>
          <span className="w-8 text-[12px] leading-4 text-muted">{toClock(total)}</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex w-[308px] min-w-[200px] items-center justify-end gap-[14px]">
        <button type="button" aria-label="Lyrics" className={ghostBtn}>
          <Mic2 className="size-4" />
        </button>
        <button type="button" aria-label="Queue" className={ghostBtn}>
          <ListMusic className="size-[15px]" />
        </button>
        <button type="button" aria-label="Devices" className={ghostBtn}>
          <MonitorSpeaker className="size-[14px]" />
        </button>
        <div className="flex w-[112px] items-center gap-2">
          <Volume2 className="size-[13.5px] shrink-0 text-muted" />
          <div
            role="slider"
            aria-label="Volume"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(volume * 100)}
            tabIndex={0}
            onClick={handleBar(onVolume)}
            className="relative h-1 flex-1 cursor-pointer overflow-hidden bg-line"
          >
            <div className="absolute inset-y-0 left-0 bg-muted" style={{ width: `${volume * 100}%` }} />
          </div>
        </div>
      </div>
    </footer>
  );
}
