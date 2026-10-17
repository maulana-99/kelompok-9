import { useNavigate, useParams } from 'react-router-dom';
import MusicPlaylistCard from '../components/MusicPlaylistCard';
import PageHeader from '../components/PageHeader';
import { getGenre, getGenres } from '../lib/music';
import { useAsync } from '../lib/useAsync';

/** Genre View — playlist-playlist dalam satu kategori (GET /music/genres/:genreId). */
export default function GenreView() {
  const navigate = useNavigate();
  const { genreId = '' } = useParams();
  const { data, error, loading } = useAsync(`genre:${genreId}`, () => getGenre(genreId));
  // Category list is cached by the backend; only used for the accent color and group label.
  const { data: genres } = useAsync('genres', getGenres);
  const genre = genres?.find((g) => g.id === genreId);

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-8 p-4 sm:p-8">
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
        <>
          <PageHeader
            eyebrow={`Jelajahi / ${genre?.group === 'mood' ? 'Mood' : 'Genre'}`}
            eyebrowTo="/search"
            accent={genre?.color}
            title={data.name || genre?.name || 'Playlist'}
            subtitle={`${data.playlists.length} playlist`}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
            {data.playlists.map((p) => (
              <MusicPlaylistCard
                key={p.id}
                playlist={p}
                onOpen={(id) => navigate(`/explore/playlist/${encodeURIComponent(id)}`)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
