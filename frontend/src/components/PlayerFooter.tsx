import { type MouseEvent } from 'react';
import {
  Heart,
  Shuffle,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Repeat,
  Repeat1,
  Mic2,
  ListMusic,
  MonitorSpeaker,
  Volume2,
} from 'lucide-react';
import { REPEAT_LABEL, cx, toClock } from '../lib/utils';
import TrackThumb from './TrackThumb';
import AddToPlaylistButton from './AddToPlaylistMenu';
import type { RepeatMode, Track } from '../types';
import type { NowPlayingTab } from './NowPlaying';

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
  shuffle: boolean;
  onToggleShuffle: () => void;
  repeat: RepeatMode;
  onCycleRepeat: () => void;
  /** Tab halaman "Sedang diputar" yang terbuka (null = tertutup). */
  nowPlaying: NowPlayingTab | null;
  /** Buka/tutup halaman "Sedang diputar" di tab tertentu. */
  onNowPlaying: (tab: NowPlayingTab) => void;
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
  shuffle,
  onToggleShuffle,
  repeat,
  onCycleRepeat,
  nowPlaying,
  onNowPlaying,
}: PlayerFooterProps) {
  const percent = total ? Math.min(100, (progress / total) * 100) : 0;

  const handleBar = (cb: (value: number) => void) => (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    cb(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
  };

  const ghostBtn = 'p-1 text-muted transition-colors hover:text-primary';

  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 flex h-[76px] items-center justify-between gap-3 border-t border-line/40 bg-sunken/95 px-3 backdrop-blur-[12px] sm:px-6">
      {/* Thin progress bar on small screens (the full seek bar is hidden there) */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-line sm:hidden">
        <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
      </div>

      {/* Now playing */}
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-[14px] lg:w-[308px] lg:flex-none">
        {/* Klik artwork/judul membuka halaman "Sedang diputar" (juga satu-satunya jalan ke antrean di HP). */}
        <button
          type="button"
          aria-label="Buka pemutar"
          aria-expanded={nowPlaying !== null}
          onClick={() => onNowPlaying('queue')}
          disabled={!track}
          className="flex min-w-0 items-center gap-3 text-left sm:gap-[14px]"
        >
          <TrackThumb track={track} className="size-11 shrink-0 border-line/60 bg-line sm:size-12" iconClassName="size-4 text-primary-soft" />
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
        </button>
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
      <div className="flex shrink-0 flex-col items-center justify-center sm:w-[576px] sm:max-w-[672px] sm:shrink sm:px-4">
        <div className="flex items-center gap-4 sm:gap-5 sm:pb-1">
          <button
            type="button"
            aria-label="Acak"
            aria-pressed={shuffle}
            title={shuffle ? 'Acak: aktif' : 'Acak: mati'}
            onClick={onToggleShuffle}
            className={cx(ghostBtn, 'hidden sm:block', shuffle && 'text-primary')}
          >
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
          <button
            type="button"
            aria-label={REPEAT_LABEL[repeat]}
            title={REPEAT_LABEL[repeat]}
            onClick={onCycleRepeat}
            className={cx(ghostBtn, 'hidden sm:block', repeat !== 'off' && 'text-primary')}
          >
            {repeat === 'one' ? <Repeat1 className="size-[14px]" /> : <Repeat className="size-[14px]" />}
          </button>
        </div>

        <div className="hidden w-full items-center gap-3 sm:flex">
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
      <div className="hidden w-[308px] min-w-[200px] items-center justify-end gap-[14px] lg:flex">
        <button
          type="button"
          aria-label="Lirik"
          aria-pressed={nowPlaying === 'lyrics'}
          onClick={() => onNowPlaying('lyrics')}
          disabled={!track}
          className={cx(ghostBtn, nowPlaying === 'lyrics' && 'text-primary', !track && 'cursor-not-allowed opacity-40')}
        >
          <Mic2 className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Antrean"
          aria-pressed={nowPlaying === 'queue'}
          onClick={() => onNowPlaying('queue')}
          className={cx(ghostBtn, nowPlaying === 'queue' && 'text-primary')}
        >
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
