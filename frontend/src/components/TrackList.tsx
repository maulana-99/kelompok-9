import { Clock, Heart, Trash2 } from 'lucide-react';
import { cx } from '../lib/utils';
import Equalizer from './Equalizer';
import TrackThumb from './TrackThumb';
import type { Track } from '../types';

const COLS =
  'grid grid-cols-[28px_minmax(0,1fr)_72px] items-center gap-3 md:grid-cols-[48px_minmax(0,1fr)_minmax(0,220px)_96px] md:gap-4 lg:grid-cols-[62px_minmax(0,1fr)_220px_141px_96px]';

interface TrackListProps {
  tracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  likedIds: string[];
  /** music id -> "18 Oct 2025" (kapan lagu ditambahkan). */
  addedLabels?: Record<string, string>;
  onPlay: (id: string) => void;
  onToggleLike: (id: string) => void;
  /** Hanya untuk pemilik playlist — tampilkan tombol hapus per baris. */
  onRemove?: (track: Track) => void;
  removingId?: string | null;
}

/** Tabel tracklist di Playlist Preview. */
export default function TrackList({
  tracks,
  currentTrackId,
  isPlaying,
  likedIds,
  addedLabels,
  onPlay,
  onToggleLike,
  onRemove,
  removingId,
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
          const removing = removingId === t.id;
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
                'group/row h-14 border-b border-line/20 px-2 transition-colors sm:px-4',
                !streamable
                  ? 'cursor-not-allowed opacity-50'
                  : 'cursor-pointer',
                removing && 'opacity-40',
                active ? 'bg-card' : streamable && !removing && 'hover:bg-card/60',
              )}
            >
              <div className="flex items-center justify-center text-[14px] leading-5 text-muted">
                {active ? <Equalizer playing={isPlaying} className="h-4" /> : i + 1}
              </div>

              <div className="flex min-w-0 items-center gap-[14px]">
                <TrackThumb track={t} className="size-10 shrink-0 border-line/60 bg-line" iconClassName="size-[13px] text-muted" />
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
              <p className="hidden truncate text-[12px] leading-4 text-muted lg:block">{addedLabels?.[t.id] ?? t.added}</p>

              <div className="flex items-center justify-end gap-3">
                {onRemove && (
                  <button
                    type="button"
                    aria-label="Remove from playlist"
                    title="Remove from playlist"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(t);
                    }}
                    className="hidden text-muted opacity-0 transition-opacity hover:text-red-400 focus-visible:opacity-100 group-hover/row:opacity-100 md:block"
                  >
                    <Trash2 className="size-[14px]" />
                  </button>
                )}
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
                <span className="w-10 text-right text-[12px] leading-4 text-muted">{t.duration}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
