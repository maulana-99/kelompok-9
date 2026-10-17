import { Heart } from 'lucide-react';
import { cx } from '../lib/utils';
import Equalizer from './Equalizer';
import TrackThumb from './TrackThumb';
import type { Track } from '../types';

const COLS = 'grid grid-cols-[32px_minmax(0,1fr)_56px_32px] items-center sm:grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)_80px_40px]';
// Without the album column (e.g. playlists of music videos with no album data).
const COLS_NO_ALBUM = 'grid grid-cols-[32px_minmax(0,1fr)_56px_32px] items-center sm:grid-cols-[40px_minmax(0,1fr)_80px_40px]';

interface SearchSongsTableProps {
  tracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  likedIds: string[];
  onPlay: (id: string) => void;
  onToggleLike: (id: string) => void;
}

/** Tabel "SONGS" pada hasil pencarian. */
export default function SearchSongsTable({
  tracks,
  currentTrackId,
  isPlaying,
  likedIds,
  onPlay,
  onToggleLike,
}: SearchSongsTableProps) {
  const showAlbum = tracks.some((t) => t.album && t.album !== '-');
  const cols = showAlbum ? COLS : COLS_NO_ALBUM;

  return (
    <div className="overflow-hidden border border-line/50 bg-sunken/60">
      <div className={cx(cols, 'bg-card/90 px-3 py-3 sm:px-5 text-[11px] font-semibold uppercase leading-4 tracking-[0.55px] text-muted')}>
        <span className="pl-[11px]">#</span>
        <span>Title</span>
        {showAlbum && <span className="hidden sm:block">Album</span>}
        <span className="pr-2 text-right sm:pr-[18px]">Duration</span>
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
              cols,
              'h-14 cursor-pointer border-t border-line/40 px-3 transition-colors sm:px-5',
              active ? 'bg-card' : 'hover:bg-card/60',
            )}
          >
            <div className="flex items-center text-[12px] leading-4 text-muted">
              {active ? <Equalizer playing={isPlaying} className="ml-[11px] h-[14px]" /> : <span className="pl-[11px]">{String(i + 1).padStart(2, '0')}</span>}
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <TrackThumb track={t} className="size-9 border-line/60 bg-line" />
              <div className="min-w-0">
                <p className={cx('truncate text-[14px] font-medium leading-5', active ? 'text-primary-soft' : 'text-ink')}>{t.title}</p>
                <p className="truncate text-[12px] leading-4 text-muted">{t.artist}</p>
              </div>
            </div>
            {showAlbum && <p className="hidden truncate pr-4 text-[12px] sm:block leading-4 text-muted">{t.album || '-'}</p>}
            <p className="pr-2 text-right text-[12px] leading-4 text-muted sm:pr-[18px]">{t.duration}</p>
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
