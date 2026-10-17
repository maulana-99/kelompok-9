import { useNavigate } from 'react-router-dom';
import GenreGrid from './GenreGrid';
import SectionHeading from './SectionHeading';
import { getGenres } from '../lib/music';
import { useAsync } from '../lib/useAsync';

/** Semua kategori "Mood & Momen" dan "Genre" dari GET /music/genres. */
export default function GenreSections() {
  const navigate = useNavigate();
  const { data, error, loading } = useAsync('genres', getGenres);
  const open = (id: string) => navigate(`/explore/${encodeURIComponent(id)}`);

  const moods = data?.filter((g) => g.group === 'mood') ?? [];
  const genres = data?.filter((g) => g.group === 'genre') ?? [];

  return (
    <>
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
    </>
  );
}
