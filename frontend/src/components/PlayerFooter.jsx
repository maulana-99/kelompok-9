import { useRef } from 'react';
import {
  Music,
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
import { cx, toClock, toSeconds } from '../lib/utils';

/** Bottom player bar (persisten di semua halaman setelah login). */
export default function PlayerFooter({
  variant = 'base',
  track,
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
}) {
  const dash = variant === 'dash';
  const total = toSeconds(track.duration);
  const percent = total ? Math.min(100, (progress / total) * 100) : 0;

  const scrubRef = useRef(null);
  const volRef = useRef(null);

  const handleBar = (ref, cb) => (e) => {
    const rect = ref.current.getBoundingClientRect();
    cb(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
  };

  const ghostBtn = cx('p-1 transition-colors hover:text-primary', dash ? 'text-dash-dim' : 'text-muted');

  return (
    <footer
      className={cx(
        'fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t px-6 backdrop-blur-[12px]',
        dash
          ? 'h-[72px] gap-5 border-dash-line/60 bg-dash-side/95'
          : 'h-[76px] border-line/40 bg-sunken/95',
      )}
    >
      {/* Now playing */}
      <div className={cx('flex min-w-[200px] w-[308px] items-center', dash ? 'gap-3' : 'gap-[14px]')}>
        <div
          className={cx(
            'flex size-12 shrink-0 items-center justify-center border p-px',
            dash ? 'border-primary/40 bg-dash-hover' : 'border-line/60 bg-line',
          )}
        >
          <Music className={cx('size-4', dash ? 'text-primary' : 'text-primary-soft')} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-[6px]">
            <p className={cx('truncate text-[14px] font-semibold leading-5', dash ? 'text-dash-ink' : 'text-ink')}>
              {track.title}
            </p>
            {!dash && track.explicit && (
              <span className="bg-primary/10 px-1 text-[10px] font-semibold leading-[15px] text-primary">E</span>
            )}
          </div>
          <p className={cx('truncate text-[12px] leading-4', dash ? 'text-dash-muted' : 'text-muted')}>{track.artist}</p>
        </div>
        <button
          type="button"
          aria-label="Like"
          aria-pressed={liked}
          onClick={onToggleLike}
          className={cx(ghostBtn, 'ml-1', liked && 'text-primary')}
        >
          <Heart className="size-[16.6px]" fill={liked ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Controls */}
      <div className="flex w-[576px] max-w-[672px] flex-col items-center justify-center px-4">
        <div className={cx('flex items-center pb-1', dash ? 'gap-4' : 'gap-5')}>
          <button type="button" aria-label="Shuffle" className={ghostBtn}>
            <Shuffle className="size-3" />
          </button>
          <button type="button" aria-label="Previous" onClick={onPrev} className={ghostBtn}>
            <SkipBack className="size-[11px]" fill="currentColor" />
          </button>
          <button
            type="button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={onTogglePlay}
            className={cx(
              'flex size-9 items-center justify-center bg-primary hover:brightness-110',
              dash ? 'text-dash-on-primary shadow-primary' : 'text-on-primary',
            )}
          >
            {isPlaying ? (
              <Pause className="size-[12.8px]" fill="currentColor" />
            ) : (
              <Play className="size-[12.8px]" fill="currentColor" />
            )}
          </button>
          <button type="button" aria-label="Next" onClick={onNext} className={ghostBtn}>
            <SkipForward className="size-[11px]" fill="currentColor" />
          </button>
          <button type="button" aria-label="Repeat" className={ghostBtn}>
            <Repeat className="size-[14px]" />
          </button>
        </div>

        <div className="flex w-full items-center gap-3">
          <span className={cx('w-8 text-right leading-[16.5px]', dash ? 'text-[11px] font-medium text-dash-muted' : 'text-[12px] leading-4 text-muted')}>
            {toClock(progress)}
          </span>
          <div
            ref={scrubRef}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={Math.floor(progress)}
            tabIndex={0}
            onClick={handleBar(scrubRef, (r) => onSeek(r * total))}
            className={cx('relative flex-1 cursor-pointer overflow-hidden', dash ? 'h-[6px] bg-dash-line' : 'h-1 bg-line')}
          >
            <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${percent}%` }} />
          </div>
          <span className={cx('w-8 leading-[16.5px]', dash ? 'text-[11px] font-medium text-dash-muted' : 'text-[12px] leading-4 text-muted')}>
            {track.duration}
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div className={cx('flex min-w-[200px] w-[308px] items-center justify-end', dash ? 'gap-3' : 'gap-[14px]')}>
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
          <Volume2 className={cx('size-[13.5px] shrink-0', dash ? 'text-dash-dim' : 'text-muted')} />
          <div
            ref={volRef}
            role="slider"
            aria-label="Volume"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(volume * 100)}
            tabIndex={0}
            onClick={handleBar(volRef, onVolume)}
            className={cx('relative flex-1 cursor-pointer overflow-hidden', dash ? 'h-[6px] bg-dash-line' : 'h-1 bg-line')}
          >
            <div
              className={cx('absolute inset-y-0 left-0', dash ? 'bg-dash-muted' : 'bg-muted')}
              style={{ width: `${volume * 100}%` }}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
