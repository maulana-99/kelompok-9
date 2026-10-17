import { Clock, Heart } from 'lucide-react';
import { cx } from '../lib/utils';
import Equalizer from './Equalizer';
import TrackThumb from './TrackThumb';
import type { Track } from '../types';

const COLS =
  'grid grid-cols-[28px_minmax(0,1fr)_72px] items-center gap-3 md:grid-cols-[48px_minmax(0,1fr)_minmax(0,220px)_80px] md:gap-4 lg:grid-cols-[62px_minmax(0,1fr)_220px_141px_80px]';

interface TrackListProps {
  tracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  likedIds: string[];
  onPlay: (id: string) => void;
  onToggleLike: (id: string) => void;
}

/** Tabel tracklist di Playlist Preview. */
export default function TrackList({
  tracks,
  currentTrackId,
  isPlaying,
  likedIds,
  onPlay,
  onToggleLike,
}: TrackListProps) {
  return (
    <div className="px-2 sm:px-8">
      <div className={cx(COLS, 'px-4 py-[10px] text-[11px] font-semibold uppercase leading-4 tracking-[0.55px] text-muted')}>
        <span className="text-center">#</span>
        <span>Title</span>
        <span className="hidden md:block">Album</span>
        <span className="hidden lg:block">Date added</span>
        <span className="flex justify-end">
          <Clock className="size-[13px]" />
        </span>
      </div>

      <div className="mt-2 flex flex-col">
        {tracks.map((t, i) => {
          const active = t.id === currentTrackId;
          const liked = likedIds.includes(t.id);
          const streamable = Boolean(t.videoId);
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={streamable ? 0 : -1}
              aria-disabled={!streamable}
              title={streamable ? undefined : 'Tidak tersedia untuk diputar'}
              onClick={() => streamable && onPlay(t.id)}
              onKeyDown={(e) => streamable && (e.key === 'Enter' || e.key === ' ') && onPlay(t.id)}
              className={cx(
                COLS,
                'h-14 border-b border-line/20 px-2 transition-colors sm:px-4',
                !streamable
                  ? 'cursor-not-allowed opacity-50'
                  : 'cursor-pointer',
                active ? 'bg-card' : streamable && 'hover:bg-card/60',
              )}
            >
              <div className="flex items-center justify-center text-[14px] leading-5 text-muted">
                {active ? <Equalizer playing={isPlaying} className="h-4" /> : i + 1}
              </div>

              <div className="flex min-w-0 items-center gap-[14px]">
                <TrackThumb track={t} className="size-10 border-line/60 bg-line" />
                <div className="min-w-0">
                  <div className="flex items-center gap-[6px]">
                    <p className={cx('truncate text-[14px] font-medium leading-5', active ? 'text-primary-soft' : 'text-ink')}>
                      {t.title}
                    </p>
                    {t.explicit && (
                      <span className="bg-line px-1 text-[10px] font-semibold leading-[15px] text-muted">E</span>
                    )}
                  </div>
                  <p className="truncate text-[12px] leading-4 text-muted">{t.artist}</p>
                </div>
              </div>

              <p className="hidden truncate text-[14px] leading-5 text-dim md:block">{t.album}</p>
              <p className="hidden truncate text-[12px] leading-4 text-muted lg:block">{t.added}</p>

              <div className="flex items-center justify-end gap-3">
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
                <span className="text-[12px] leading-4 text-muted">{t.duration}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
