import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ListMusic } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import { getGenre, thumbUrl } from '../lib/music';
import { useAsync } from '../lib/useAsync';
import type { MusicPlaylist } from '../types';

function MusicPlaylistCard({ playlist, onOpen }: { playlist: MusicPlaylist; onOpen: (id: string) => void }) {
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onOpen(playlist.id)}
      className="flex min-w-0 flex-col border border-line/40 bg-card p-3 text-left transition-colors hover:bg-hover"
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

/** Genre View — playlist-playlist dalam satu kategori (GET /music/genres/:genreId). */
export default function GenreView() {
  const navigate = useNavigate();
  const { genreId = '' } = useParams();
  const { data, error, loading } = useAsync(`genre:${genreId}`, () => getGenre(genreId));

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-8">
      {loading && (
        <p role="status" className="text-center text-[12px] text-muted">
          Memuat playlist...
        </p>
      )}
      {error && (
        <p role="alert" className="text-center text-[14px] text-primary-soft">
          {error}
        </p>
      )}

      {data && (
        <section>
          <SectionHeading title={data.name || 'Playlist'} />
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {data.playlists.map((p) => (
              <MusicPlaylistCard
                key={p.id}
                playlist={p}
                onOpen={(id) => navigate(`/explore/playlist/${encodeURIComponent(id)}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
