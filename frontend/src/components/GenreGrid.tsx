import type { MusicGenre } from '../types';

const FALLBACK_COLOR = '#E9204F';

/** Grid kotak kategori mood/genre; warna aksen diambil dari YouTube Music. */
export default function GenreGrid({ genres, onOpen }: { genres: MusicGenre[]; onOpen: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {genres.map((g) => {
        const color = g.color ?? FALLBACK_COLOR;
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => onOpen(g.id)}
            style={{
              borderLeftColor: color,
              backgroundImage: `linear-gradient(110deg, color-mix(in srgb, ${color} 18%, transparent), transparent 70%)`,
            }}
            className="flex h-16 items-center border border-l-4 border-line/40 bg-card px-4 text-left text-[14px] font-semibold leading-5 text-ink transition-colors hover:border-y-line hover:border-r-line hover:bg-hover"
          >
            <span className="line-clamp-2">{g.name}</span>
          </button>
        );
      })}
    </div>
  );
}
