import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Library, ListMusic, Plus, Search, type LucideIcon } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import MusicPlaylistCard from '../components/MusicPlaylistCard';
import PageHeader from '../components/PageHeader';
import PlaylistCard from '../components/PlaylistCard';
import RecentTrackList from '../components/RecentTrackList';
import SectionHeading from '../components/SectionHeading';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { getGenre, getGenres, getRecommendations } from '../lib/music';
import { useAsync } from '../lib/useAsync';
import { toTrack } from '../lib/utils';
import type { MusicGenre, MusicMix } from '../types';

// Categories shown on Home (YouTube names with hl=id); the rest are filled from the genre list.
const FEATURED = ['indonesian pop', 'santai', 'hip-hop', 'k-pop', 'semangat!', 'dangdut', 'pop', 'r&b & soul'];
const SHELF_COUNT = 8;
const SHELF_SIZE = 5;
const FOR_YOU_SIZE = 10;

function pickFeatured(genres: MusicGenre[]): MusicGenre[] {
  const featured = FEATURED.map((name) => genres.find((g) => g.name.toLowerCase() === name)).filter(
    (g): g is MusicGenre => g !== undefined,
  );
  const rest = genres.filter((g) => g.group === 'genre' && !featured.includes(g));
  return [...featured, ...rest].slice(0, SHELF_COUNT);
}

/** Satu baris playlist dari sebuah kategori + tombol "Lihat semua". */
function GenreShelf({ genre }: { genre: MusicGenre }) {
  const navigate = useNavigate();
  const { data, error } = useAsync(`genre:${genre.id}`, () => getGenre(genre.id));
  const openGenre = () => navigate(`/explore/${encodeURIComponent(genre.id)}`);

  if (error) return null;
  return (
    <section>
      <SectionHeading title={genre.name} action="Lihat semua" onAction={openGenre} />
      {/* Horizontal scroll on small screens, 5-column grid on large screens. */}
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:gap-5 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0 lg:pb-0">
        {data
          ? data.playlists.slice(0, SHELF_SIZE).map((p) => (
              <div key={p.id} className="w-40 min-w-0 shrink-0 sm:w-44 lg:w-auto">
                <MusicPlaylistCard playlist={p} onOpen={(id) => navigate(`/explore/playlist/${encodeURIComponent(id)}`)} />
              </div>
            ))
          : Array.from({ length: SHELF_SIZE }, (_, i) => (
              <div key={i} aria-hidden="true" className="w-40 shrink-0 border border-line/40 bg-card p-3 sm:w-44 lg:w-auto">
                <div className="mb-3 aspect-square w-full animate-pulse bg-line" />
                <div className="h-4 w-3/4 animate-pulse bg-line" />
              </div>
            ))}
      </div>
    </section>
  );
}

/** "Mix untuk kamu" + "Rekomendasi untuk kamu" dari GET /recommendations. Kosong saat user belum punya riwayat. */
function ForYouSections() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { currentTrackId, isPlaying, playMix, rememberTracks } = usePlayer();
  const { data } = useAsync(`recs:${user?.id ?? ''}`, () =>
    token ? getRecommendations(token) : Promise.resolve(null),
  );
  const forYou = useMemo(() => data?.for_you.slice(0, FOR_YOU_SIZE).map(toTrack) ?? [], [data]);

  // Lagu harus dikenal player dulu sebelum bisa diputar.
  useEffect(() => {
    if (forYou.length) rememberTracks(forYou);
  }, [forYou, rememberTracks]);

  const openMix = (mix: MusicMix) => navigate(`/mix/${encodeURIComponent(mix.id)}`, { state: { mix } });

  return (
    <>
      {data && data.mixes.length > 0 && (
        <section>
          <SectionHeading title="Mix untuk kamu" />
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:gap-5 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 lg:pb-0">
            {data.mixes.map((mix) => (
              <div key={mix.id} className="w-40 min-w-0 shrink-0 sm:w-44 lg:w-auto">
                <MusicPlaylistCard playlist={mix} onOpen={() => openMix(mix)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {forYou.length > 0 && (
        <section>
          <SectionHeading title="Rekomendasi untuk kamu" />
          <RecentTrackList
            items={forYou}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            onPlay={playMix}
          />
        </section>
      )}
    </>
  );
}

function greeting(hour: number): string {
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 19) return 'Selamat sore';
  return 'Selamat malam';
}

function QuickTile({ icon: Icon, label, meta, onClick }: { icon: LucideIcon; label: string; meta: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-w-0 items-center gap-2 border border-line/40 bg-card p-2 sm:gap-3 sm:p-3 text-left transition-colors hover:border-line hover:bg-hover"
    >
      <span className="flex size-9 shrink-0 items-center justify-center bg-line text-primary sm:size-11 transition-colors group-hover:bg-primary group-hover:text-on-primary">
        <Icon className="size-[18px]" strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold leading-5 text-ink">{label}</span>
        <span className="block truncate text-[12px] leading-4 text-muted">{meta}</span>
      </span>
    </button>
  );
}

/** Home/Dashboard View. */
export default function HomeView() {
  const { user } = useAuth();
  const {
    playlists,
    recentTracks,
    likedIds,
    currentTrackId,
    isPlaying,
    playMix,
    openPlaylist,
    openCreate,
    navigate: navigateTo,
  } = usePlayer();
  const { data: genres } = useAsync('genres', getGenres);
  const shelves = genres ? pickFeatured(genres) : [];
  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-10 p-4 sm:p-8">
      <PageHeader
        eyebrow="Home"
        title={firstName ? `${greeting(new Date().getHours())}, ${firstName}` : greeting(new Date().getHours())}
        subtitle="Lanjutkan lagu terakhirmu atau temukan musik baru."
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <QuickTile icon={Heart} label="Liked Songs" meta={`${likedIds.length} lagu`} onClick={() => navigateTo('liked-songs')} />
        <QuickTile
          icon={Library}
          label="Your Library"
          meta={`${playlists.length} playlist`}
          onClick={() => navigateTo('library')}
        />
        <QuickTile icon={Search} label="Search" meta="Cari lagu, mood & genre" onClick={() => navigateTo('search')} />
      </section>

      {/* Hidden until something has been played, so the playlists show up first. */}
      {recentTracks.length > 0 && (
        <section>
          <SectionHeading title="Recently Played" />
          <RecentTrackList
            items={recentTracks}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            onPlay={playMix}
          />
        </section>
      )}

      <ForYouSections />

      {shelves.map((g) => (
        <GenreShelf key={g.id} genre={g} />
      ))}

      <section>
        <SectionHeading title="Your Playlists">
          <button
            type="button"
            aria-label="Create playlist"
            onClick={openCreate}
            className="flex size-8 items-center justify-center bg-card text-dim hover:text-primary"
          >
            <Plus className="size-[10.5px]" strokeWidth={3} />
          </button>
        </SectionHeading>

        {playlists.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {playlists.slice(0, 4).map((p) => (
              <PlaylistCard key={p.id} playlist={p} onOpen={openPlaylist} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ListMusic}
            title="Belum ada playlist"
            text="Buat playlist pertamamu dan kumpulkan lagu favorit di satu tempat."
            action={{ label: 'Buat playlist', onClick: openCreate }}
          />
        )}
      </section>
    </div>
  );
}
