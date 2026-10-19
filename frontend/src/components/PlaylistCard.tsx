import { usePlayer } from '../context/PlayerContext';
import { toSeconds, toDurationLabel } from '../lib/utils';
import { ListMusic } from 'lucide-react';
import PlaylistCover from './PlaylistCover';
import type { Playlist } from '../types';

interface PlaylistCardProps {
  playlist: Playlist;
  onOpen: (id: string) => void;
}

/** Kartu playlist di Home (mosaiik cover 4 lagu pertama + judul + info). */
export default function PlaylistCard({ playlist, onOpen }: PlaylistCardProps) {
  const { tracksOf } = usePlayer();
  const tracks = tracksOf(playlist.trackIds);
  const count = playlist.trackIds.length;
  const duration = toDurationLabel(tracks.reduce((sum, t) => sum + toSeconds(t.duration), 0));

  return (
    <button
      type="button"
      onClick={() => onOpen(playlist.id)}
      className="flex min-w-0 flex-1 flex-col border border-line/40 bg-card p-[17px] text-left transition-colors hover:bg-hover"
    >
      {tracks.length === 0 ? (
        <div className="mb-[14px] flex w-full items-center justify-center border border-line/40 bg-gradient-to-br from-card to-sunken py-[73.5px]">
          <ListMusic className="h-[25.7px] w-[34.8px] text-muted" strokeWidth={1.5} />
        </div>
      ) : (
        <PlaylistCover
          tracks={tracks}
          className="mb-[14px] aspect-square w-full border border-line/40"
          iconClassName="h-[25.7px] w-[34.8px] text-muted"
        />
      )}
      <p className="w-full truncate text-[14px] font-semibold leading-5 text-ink">{playlist.name}</p>
      <p className="w-full pt-[2px] text-[12px] leading-4 text-muted">
        {count} tracks • {duration}
      </p>
    </button>
  );
}
