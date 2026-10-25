import { useEffect, useState } from 'react';
import { SearchX } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import GenreSections from '../components/GenreSections';
import LoadMore from '../components/LoadMore';
import PageHeader from '../components/PageHeader';
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
  songsHasMore: boolean;
  songsNextPage: number;
  people: BackendUser[];
  peopleHasMore: boolean;
  peopleNextPage: number;
  musicError: string;
  peopleError: string;
  searched: boolean;
}

/** Search View — Spotify-style tabs: All / Music / People. */
export default function SearchView() {
  const { query, currentTrackId, isPlaying, likedIds, playMix, toggleLike, rememberTracks } = usePlayer();
  const { token } = useAuth();
  const [tab, setTab] = useState<SearchTab>('all');
  const [morePending, setMorePending] = useState<'songs' | 'people' | null>(null);

  const [store, setStore] = useState<SearchStore>({
    q: '',
    tracks: [],
    songsHasMore: false,
    songsNextPage: 2,
    people: [],
    peopleHasMore: false,
    peopleNextPage: 2,
    musicError: '',
    peopleError: '',
    searched: false,
  });

  const trimmed = query.trim();

  // Hasil hanya berlaku untuk query yang sedang diketik (hindari hasil usang).
  const matchesCurrent = store.q === trimmed;
  const songResults = matchesCurrent ? store.tracks : [];
  const peopleResults = matchesCurrent ? store.people : [];
  const songsHasMore = matchesCurrent && store.songsHasMore;
  const peopleHasMore = matchesCurrent && store.peopleHasMore;
  const musicError = matchesCurrent ? store.musicError : '';
  const peopleError = matchesCurrent ? store.peopleError : '';
  const searched = matchesCurrent && store.searched;
  const pending = Boolean(trimmed) && !searched;

  useEffect(() => {
    if (!trimmed) return undefined;

    let active = true;
    const timer = window.setTimeout(async () => {
      const [musicSettled, peopleSettled] = await Promise.allSettled([
        searchMusic(trimmed),
        searchUsers(trimmed, token),
      ]);

      if (!active) return;

      const musicPage = musicSettled.status === 'fulfilled' ? musicSettled.value : null;
      const peoplePage = peopleSettled.status === 'fulfilled' ? peopleSettled.value : null;
      const tracks = musicPage ? musicPage.items.map(toTrack) : [];
      const people = peoplePage ? peoplePage.items : [];
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

      setStore({
        q: trimmed,
        tracks,
        songsHasMore: musicPage?.has_more ?? false,
        songsNextPage: 2,
        people,
        peopleHasMore: peoplePage?.has_more ?? false,
        peopleNextPage: 2,
        musicError,
        peopleError,
        searched: true,
      });
      if (tracks.length) rememberTracks(tracks);
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [trimmed, rememberTracks, token]);

  // "Muat lebih banyak" hanya berlaku untuk query yang hasilnya sedang tampil.
  const canLoadMore = store.q === trimmed;

  const loadMoreSongs = async () => {
    if (!canLoadMore || !store.songsHasMore || morePending) return;
    setMorePending('songs');
    try {
      const page = await searchMusic(store.q, store.songsNextPage);
      const tracks = page.items.map(toTrack);
      setStore((prev) => ({
        ...prev,
        tracks: [...prev.tracks, ...tracks],
        songsHasMore: page.has_more,
        songsNextPage: page.page + 1,
      }));
      if (tracks.length) rememberTracks(tracks);
    } catch (cause) {
      setStore((prev) => ({
        ...prev,
        musicError: cause instanceof Error ? cause.message : 'Unable to load more songs.',
      }));
    } finally {
      setMorePending(null);
    }
  };

  const loadMorePeople = async () => {
    if (!canLoadMore || !store.peopleHasMore || morePending) return;
    setMorePending('people');
    try {
      const page = await searchUsers(store.q, token, store.peopleNextPage);
      setStore((prev) => ({
        ...prev,
        people: [...prev.people, ...page.items],
        peopleHasMore: page.has_more,
        peopleNextPage: page.page + 1,
      }));
    } catch (cause) {
      setStore((prev) => ({
        ...prev,
        peopleError: cause instanceof Error ? cause.message : 'Unable to load more people.',
      }));
    } finally {
      setMorePending(null);
    }
  };

  const showMusic = tab === 'all' || tab === 'music';
  const showPeople = tab === 'all' || tab === 'people';
  // "All" shows a preview; dedicated tabs show the full list.
  const visibleSongs = tab === 'all' ? songResults.slice(0, 5) : songResults;
  const visiblePeople = tab === 'all' ? peopleResults.slice(0, 5) : peopleResults;
  const hasNoResults = searched && songResults.length === 0 && peopleResults.length === 0;

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-8 p-4 sm:p-8">
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
        <>
          <PageHeader
            eyebrow="Search"
            title="Jelajahi Musik"
            subtitle="Cari lagu, artis, atau album di kolom atas, atau pilih mood dan genre di bawah."
          />
          <GenreSections />
        </>
      )}

      {trimmed && searched && !pending && hasNoResults && !musicError && !peopleError && (
        <EmptyState icon={SearchX} title={`Tidak ada hasil untuk \u201c${trimmed}\u201d`} text="Coba kata kunci lain." />
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
            onPlay={playMix}
            onToggleLike={toggleLike}
          />
          {tab === 'music' && songResults.length > 0 && songsHasMore && (
            <LoadMore pending={morePending === 'songs'} onClick={() => void loadMoreSongs()} />
          )}
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
          {tab === 'people' && peopleResults.length > 0 && peopleHasMore && (
            <LoadMore pending={morePending === 'people'} onClick={() => void loadMorePeople()} />
          )}
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
