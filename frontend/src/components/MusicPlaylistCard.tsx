import { useState } from 'react';
import { ListMusic } from 'lucide-react';
import { thumbUrl } from '../lib/music';
import type { MusicPlaylist } from '../types';

/** Kartu playlist YouTube Music (Explore, Genre, Home). */
export default function MusicPlaylistCard({ playlist, onOpen }: { playlist: MusicPlaylist; onOpen: (id: string) => void }) {
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onOpen(playlist.id)}
      className="flex w-full min-w-0 flex-col overflow-hidden border border-line/40 bg-card p-3 text-left transition-colors hover:bg-hover"
    >
      {playlist.thumbnail && !failed ? (
        <img
          src={thumbUrl(playlist.thumbnail)}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="mb-3 aspect-square w-full object-cover"
        />
      ) : (
        <div className="mb-3 flex aspect-square w-full items-center justify-center bg-line">
          <ListMusic className="size-8 text-muted" strokeWidth={1.5} />
        </div>
      )}
      <p className="w-full truncate text-[14px] font-semibold leading-5 text-ink">{playlist.title}</p>
      {playlist.subtitle && <p className="line-clamp-2 pt-[2px] text-[12px] leading-4 text-muted">{playlist.subtitle}</p>}
    </button>
  );
}
