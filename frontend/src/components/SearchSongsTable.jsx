import { Music, Heart } from 'lucide-react';
import { cx } from '../lib/utils';
import Equalizer from './Equalizer';

const COLS = 'grid grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)_80px_40px] items-center';

/** Tabel "SONGS" pada hasil pencarian. */
export default function SearchSongsTable({ tracks, currentTrackId, isPlaying, likedIds, onPlay, onToggleLike }) {
  return (
    <div className="overflow-hidden border border-line/50 bg-sunken/60">
      <div className={cx(COLS, 'bg-card/90 px-5 py-3 text-[11px] font-semibold uppercase leading-4 tracking-[0.55px] text-muted')}>
        <span className="pl-[11px]">#</span>
        <span>Title</span>
        <span>Album</span>
        <span className="text-right pr-[18px]">Duration</span>
        <span />
      </div>

      {tracks.map((t, i) => {
        const active = t.id === currentTrackId;
        const liked = likedIds.includes(t.id);
        return (
          <div
            key={t.id}
            role="button"
            tabIndex={0}
            onClick={() => onPlay(t.id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onPlay(t.id)}
            className={cx(
              COLS,
              'h-14 cursor-pointer border-t border-line/40 px-5 transition-colors',
              active ? 'bg-card' : 'hover:bg-card/60',
            )}
          >
            <div className="flex items-center text-[12px] leading-4 text-muted">
              {active ? <Equalizer playing={isPlaying} className="ml-[11px] h-[14px]" /> : <span className="pl-[11px]">{String(i + 1).padStart(2, '0')}</span>}
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center border border-line/60 bg-line">
                <Music className="size-[13px] text-muted" />
              </div>
              <div className="min-w-0">
                <p className={cx('truncate text-[14px] font-medium leading-5', active ? 'text-primary-soft' : 'text-ink')}>{t.title}</p>
                <p className="truncate text-[12px] leading-4 text-muted">{t.artist}</p>
              </div>
            </div>
            <p className="truncate pr-4 text-[12px] leading-4 text-muted">{t.album}</p>
            <p className="pr-[18px] text-right text-[12px] leading-4 text-muted">{t.duration}</p>
            <div className="flex justify-center">
              <button
                type="button"
                aria-label={liked ? 'Unlike' : 'Like'}
                aria-pressed={liked}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike(t.id);
                }}
                className={cx('transition-colors hover:text-primary', liked ? 'text-primary' : 'text-muted')}
              >
                <Heart className="size-[14px]" fill={liked ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
