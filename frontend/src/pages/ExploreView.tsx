import { useNavigate } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading';
import { getGenres } from '../lib/music';
import { useAsync } from '../lib/useAsync';
import type { MusicGenre } from '../types';

function GenreGrid({ genres, onOpen }: { genres: MusicGenre[]; onOpen: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {genres.map((g) => (
        <button
          key={g.id}
          type="button"
          onClick={() => onOpen(g.id)}
          className="flex h-20 items-end border border-line/40 bg-card p-4 text-left text-[14px] font-semibold leading-5 text-ink transition-colors hover:border-primary/60 hover:bg-hover"
        >
          {g.name}
        </button>
      ))}
    </div>
  );
}

/** Explore View — kategori mood & genre dari GET /music/genres. */
export default function ExploreView() {
  const navigate = useNavigate();
  const { data, error, loading } = useAsync('genres', getGenres);
  const open = (id: string) => navigate(`/explore/${encodeURIComponent(id)}`);

  const moods = data?.filter((g) => g.group === 'mood') ?? [];
  const genres = data?.filter((g) => g.group === 'genre') ?? [];

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-10 p-8">
      {loading && (
        <p role="status" className="text-center text-[12px] text-muted">
          Memuat kategori...
        </p>
      )}
      {error && (
        <p role="alert" className="text-center text-[14px] text-primary-soft">
          {error}
        </p>
      )}

      {moods.length > 0 && (
        <section>
          <SectionHeading title="Mood & Momen" />
          <GenreGrid genres={moods} onOpen={open} />
        </section>
      )}
      {genres.length > 0 && (
        <section>
          <SectionHeading title="Genre" />
          <GenreGrid genres={genres} onOpen={open} />
        </section>
      )}
    </div>
  );
}
