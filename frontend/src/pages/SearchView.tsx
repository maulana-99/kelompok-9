import { useEffect, useState } from 'react';
import SearchSongsTable from '../components/SearchSongsTable';
import { searchMusic } from '../lib/music';
import { toTrack } from '../lib/utils';
import { usePlayer } from '../context/PlayerContext';
import type { Track } from '../types';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between pb-3">
      <h3 className="text-[12px] font-semibold uppercase leading-4 tracking-[1.2px] text-muted">{children}</h3>
    </div>
  );
}

/** Search View — hasil pencarian lagu dari GET /music/search. */
export default function SearchView() {
  const { query, currentTrackId, isPlaying, likedIds, playTrack, toggleLike, rememberTracks } = usePlayer();

  const [store, setStore] = useState<{ q: string; tracks: Track[]; error: string; searched: boolean }>({
    q: '',
    tracks: [],
    error: '',
    searched: false,
  });

  const trimmed = query.trim();

  // Hasil hanya berlaku untuk query yang sedang diketik (hindari hasil usang).
  const matchesCurrent = store.q === trimmed;
  const songResults = matchesCurrent ? store.tracks : [];
  const searchError = matchesCurrent ? store.error : '';
  const searched = matchesCurrent && store.searched;
  const pending = Boolean(trimmed) && !searched && !searchError;

  useEffect(() => {
    if (!trimmed) return undefined;

    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const results = (await searchMusic(trimmed, 20)).map(toTrack);
        if (active) {
          setStore({ q: trimmed, tracks: results, error: '', searched: true });
          rememberTracks(results);
        }
      } catch (cause) {
        if (active) {
          setStore({
            q: trimmed,
            tracks: [],
            error: cause instanceof Error ? cause.message : 'Unable to search songs.',
            searched: true,
          });
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [trimmed, rememberTracks]);

  return (
    <div className="flex flex-col gap-6 px-8 pb-8 pt-6">
      {pending && (
        <p role="status" className="text-center text-[12px] text-muted">
          Searching songs...
        </p>
      )}

      {searchError && (
        <p role="alert" className="text-center text-[14px] text-primary-soft">
          {searchError}
        </p>
      )}

      {!trimmed && (
        <p className="py-16 text-center text-[14px] text-muted">
          Ketik judul lagu, artis, atau album di kolom pencarian.
        </p>
      )}

      {trimmed && !searchError && searched && songResults.length === 0 && (
        <p className="py-16 text-center text-[14px] text-muted">
          Tidak ada hasil untuk &ldquo;{query}&rdquo;. Coba kata kunci lain.
        </p>
      )}

      {songResults.length > 0 && (
        <section>
          <SectionTitle>SONGS</SectionTitle>
          <SearchSongsTable
            tracks={songResults}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            likedIds={likedIds}
            onPlay={(id) => playTrack(id, songResults)}
            onToggleLike={toggleLike}
          />
        </section>
      )}
    </div>
  );
}
