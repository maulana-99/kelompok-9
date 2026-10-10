import { Music, MoreVertical } from 'lucide-react';
import { cx } from '../lib/utils';
import { getTrack } from '../data/mock';
import Equalizer from './Equalizer';

/** Daftar "Recently Played" pada Home (baris aktif punya badge "Playing"). */
export default function RecentTrackList({ items, currentTrackId, isPlaying, onPlay }) {
  return (
    <div className="flex flex-col border border-dash-line/40 bg-dash-card p-[9px]">
      {items.map((item, i) => {
        const track = getTrack(item.trackId);
        const active = track.id === currentTrackId;
        return (
          <div
            key={item.trackId}
            role="button"
            tabIndex={0}
            onClick={() => onPlay(track.id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onPlay(track.id)}
            className={cx(
              'flex cursor-pointer items-center px-4 py-[10px] transition-colors',
              i > 0 && 'border-t border-dash-line/30 pt-[11px]',
              active ? 'bg-dash-hover' : 'hover:bg-dash-hover/60',
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="flex w-5 items-center justify-center text-[12px] font-medium leading-4 text-dash-muted">
                {active ? <Equalizer playing={isPlaying} /> : i + 1}
              </div>
              <div
                className={cx(
                  'flex size-10 shrink-0 items-center justify-center border bg-dash-line shadow-sm',
                  active ? 'border-primary/40 ring-1 ring-primary/30' : 'border-dash-line2',
                )}
              >
                <Music className={cx('size-[13px]', active ? 'text-primary' : 'text-dash-muted')} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cx('truncate text-[14px] font-semibold leading-5', active ? 'text-primary-soft' : 'text-dash-ink')}>
                    {track.title}
                  </p>
                  {active && (
                    <span className="bg-primary px-2 py-[2px] text-[10px] font-semibold leading-[15px] text-dash-on-primary">
                      Playing
                    </span>
                  )}
                </div>
                <p className={cx('truncate text-[12px] leading-4', active ? 'text-dash-dim' : 'text-dash-muted')}>
                  {item.subtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className={cx('text-[12px] leading-4', active ? 'font-medium text-primary-soft' : 'text-dash-muted')}>
                {track.duration}
              </span>
              <button
                type="button"
                aria-label="More options"
                onClick={(e) => e.stopPropagation()}
                className="px-1 pb-[10px] pt-1 text-dash-muted hover:text-primary"
              >
                <MoreVertical className="size-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
