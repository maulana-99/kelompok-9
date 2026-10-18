import { History, Music } from 'lucide-react';
import EmptyState from './EmptyState';
import { cx } from '../lib/utils';
import Equalizer from './Equalizer';
import type { Track } from '../types';

interface RecentTrackListProps {
  items: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  onPlay: (id: string) => void;
  onSearch?: () => void;
}

/** Daftar "Recently Played" pada Home (baris aktif punya badge "Playing"). */
export default function RecentTrackList({
  items,
  currentTrackId,
  isPlaying,
  onPlay,
  onSearch,
}: RecentTrackListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Belum ada lagu yang diputar"
        text="Lagu yang kamu putar akan muncul di sini."
        action={onSearch ? { label: 'Cari lagu', onClick: onSearch } : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col border border-line/40 bg-card p-[9px]">
      {items.map((track, i) => {
        const active = track.id === currentTrackId;
        return (
          <div
            key={track.id}
            role="button"
            tabIndex={0}
            onClick={() => onPlay(track.id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onPlay(track.id)}
            className={cx(
              'flex cursor-pointer items-center px-4 py-[10px] transition-colors',
              i > 0 && 'border-t border-line/30 pt-[11px]',
              active ? 'bg-hover' : 'hover:bg-hover/60',
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="flex w-5 items-center justify-center text-[12px] font-medium leading-4 text-muted">
                {active ? <Equalizer playing={isPlaying} /> : i + 1}
              </div>
              <div
                className={cx(
                  'flex size-10 shrink-0 items-center justify-center border bg-line shadow-sm',
                  active ? 'border-primary/40 ring-1 ring-primary/30' : 'border-line',
                )}
              >
                <Music className={cx('size-[13px]', active ? 'text-primary' : 'text-muted')} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cx('truncate text-[14px] font-semibold leading-5', active ? 'text-primary-soft' : 'text-ink')}>
                    {track.title}
                  </p>
                  {active && (
                    <span className="bg-primary px-2 py-[2px] text-[10px] font-semibold leading-[15px] text-on-primary">
                      Playing
                    </span>
                  )}
                </div>
                <p className={cx('truncate text-[12px] leading-4', active ? 'text-dim' : 'text-muted')}>
                  {track.album && track.album !== '-' ? `${track.artist} — ${track.album}` : track.artist}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className={cx('text-[12px] leading-4', active ? 'font-medium text-primary-soft' : 'text-muted')}>
                {track.duration}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
