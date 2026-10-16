import { useEffect, useState } from 'react';
import SearchSongsTable from '../components/SearchSongsTable';
import UserCard from '../components/UserCard';
import { searchMusic } from '../lib/music';
import { searchUsers } from '../lib/users';
import { cx, toTrack } from '../lib/utils';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import type { BackendUser, Track } from '../types';

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between pb-3">
      <h3 className="text-[12px] font-semibold uppercase leading-4 tracking-[1.2px] text-muted">{children}</h3>
      {action}
    </div>
  );
}

type SearchTab = 'all' | 'music' | 'people';

const TABS: Array<{ key: SearchTab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'music', label: 'Music' },
  { key: 'people', label: 'People' },
];

interface SearchStore {
  q: string;
  tracks: Track[];
  people: BackendUser[];
  musicError: string;
  peopleError: string;
  searched: boolean;
}

/** Search View — Spotify-style tabs: All / Music / People. */
export default function SearchView() {
  const { query, currentTrackId, isPlaying, likedIds, playTrack, toggleLike, rememberTracks } = usePlayer();
  const { token } = useAuth();
  const [tab, setTab] = useState<SearchTab>('all');

  const [store, setStore] = useState<SearchStore>({
    q: '',
    tracks: [],
    people: [],
    musicError: '',
    peopleError: '',
    searched: false,
  });

  const trimmed = query.trim();

  // Hasil hanya berlaku untuk query yang sedang diketik (hindari hasil usang).
  const matchesCurrent = store.q === trimmed;
  const songResults = matchesCurrent ? store.tracks : [];
  const peopleResults = matchesCurrent ? store.people : [];
  const musicError = matchesCurrent ? store.musicError : '';
  const peopleError = matchesCurrent ? store.peopleError : '';
  const searched = matchesCurrent && store.searched;
  const pending = Boolean(trimmed) && !searched;

  useEffect(() => {
    if (!trimmed) return undefined;

    let active = true;
    const timer = window.setTimeout(async () => {
      const [musicSettled, peopleSettled] = await Promise.allSettled([
        searchMusic(trimmed, 20).then((r) => r.map(toTrack)),
        searchUsers(trimmed, token),
      ]);

      if (!active) return;

      const tracks = musicSettled.status === 'fulfilled' ? musicSettled.value : [];
      const people = peopleSettled.status === 'fulfilled' ? peopleSettled.value : [];
      const musicError =
        musicSettled.status === 'rejected'
          ? musicSettled.reason instanceof Error
            ? musicSettled.reason.message
            : 'Unable to search songs.'
          : '';
      const peopleError =
        peopleSettled.status === 'rejected'
          ? peopleSettled.reason instanceof Error
            ? peopleSettled.reason.message
            : 'Unable to search people.'
          : '';

      setStore({ q: trimmed, tracks, people, musicError, peopleError, searched: true });
      if (tracks.length) rememberTracks(tracks);
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [trimmed, rememberTracks, token]);

  const showMusic = tab === 'all' || tab === 'music';
  const showPeople = tab === 'all' || tab === 'people';
  // "All" shows a preview; dedicated tabs show the full list.
  const visibleSongs = tab === 'all' ? songResults.slice(0, 5) : songResults;
  const visiblePeople = tab === 'all' ? peopleResults.slice(0, 5) : peopleResults;
  const hasNoResults = searched && songResults.length === 0 && peopleResults.length === 0;

  return (
    <div className="flex flex-col gap-6 px-8 pb-8 pt-6">
      {trimmed && (
        <div className="flex items-center gap-2" role="tablist" aria-label="Search filter">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cx(
                'h-8 px-4 text-[13px] font-medium leading-5 transition-colors',
                tab === key
                  ? 'bg-ink text-base'
                  : 'border border-line/60 bg-card text-dim hover:border-primary/50 hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {pending && (
        <p role="status" className="text-center text-[12px] text-muted">
          Searching...
        </p>
      )}

      {!trimmed && (
        <p className="py-16 text-center text-[14px] text-muted">
          Ketik judul lagu, artis, album, atau nama/username teman di kolom pencarian.
        </p>
      )}

      {trimmed && searched && !pending && hasNoResults && !musicError && !peopleError && (
        <p className="py-16 text-center text-[14px] text-muted">
          Tidak ada hasil untuk &ldquo;{query}&rdquo;. Coba kata kunci lain.
        </p>
      )}

      {showMusic && musicError && (
        <p role="alert" className="text-center text-[14px] text-primary-soft">
          {musicError}
        </p>
      )}
      {showPeople && peopleError && (
        <p role="alert" className="text-center text-[14px] text-primary-soft">
          {peopleError}
        </p>
      )}

      {showMusic && visibleSongs.length > 0 && (
        <section>
          <SectionTitle
            action={
              tab === 'all' && songResults.length > visibleSongs.length ? (
                <button
                  type="button"
                  onClick={() => setTab('music')}
                  className="text-[12px] font-medium text-muted hover:text-primary"
                >
                  Show all songs
                </button>
              ) : undefined
            }
          >
            Songs
          </SectionTitle>
          <SearchSongsTable
            tracks={visibleSongs}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            likedIds={likedIds}
            onPlay={(id) => playTrack(id, songResults)}
            onToggleLike={toggleLike}
          />
        </section>
      )}

      {showPeople && visiblePeople.length > 0 && (
        <section>
          <SectionTitle
            action={
              tab === 'all' && peopleResults.length > visiblePeople.length ? (
                <button
                  type="button"
                  onClick={() => setTab('people')}
                  className="text-[12px] font-medium text-muted hover:text-primary"
                >
                  Show all people
                </button>
              ) : undefined
            }
          >
            People
          </SectionTitle>
          <div className="flex flex-col gap-2">
            {visiblePeople.map((person) => (
              <UserCard key={person.id} user={person} />
            ))}
          </div>
        </section>
      )}

      {trimmed &&
        searched &&
        !pending &&
        !hasNoResults &&
        ((tab === 'music' && songResults.length === 0 && !musicError) ||
          (tab === 'people' && peopleResults.length === 0 && !peopleError)) && (
          <p className="py-16 text-center text-[14px] text-muted">
            {tab === 'music'
              ? `Tidak ada lagu untuk "${query}". Coba tab People untuk mencari teman.`
              : `Tidak ada orang untuk "${query}". Coba tab Music untuk mencari lagu.`}
          </p>
        )}
    </div>
  );
}
