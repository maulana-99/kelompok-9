import { useEffect, useRef, useState } from 'react';
import { Play, ListMusic, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '../lib/utils';
import SearchSongsTable from '../components/SearchSongsTable';
import Equalizer from '../components/Equalizer';
import {
  searchFilters,
  topResult,
  relevantPlaylists,
  people as peopleData,
  tracks,
} from '../data/mock';
import { searchMusic } from '../lib/api';
import { toTrack } from '../lib/utils';
import type { Track } from '../types';

interface SectionTitleProps {
  children: React.ReactNode;
  action?: string;
}

interface PlaylistTileProps {
  item: (typeof relevantPlaylists)[number];
}

interface SearchViewProps {
  query: string;
  currentTrackId: string;
  isPlaying: boolean;
  likedIds: string[];
  onPlayTrack: (id: string) => void;
  onToggleLike: (id: string) => void;
  onTracksFound: (tracks: Track[]) => void;
}

function SectionTitle({ children, action }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between pb-3">
      <h3 className="text-[12px] font-semibold uppercase leading-4 tracking-[1.2px] text-muted">{children}</h3>
      {action && (
        <button type="button" className="text-[12px] font-semibold uppercase leading-4 tracking-[0.6px] text-primary-soft hover:underline">
          {action}
        </button>
      )}
    </div>
  );
}

function PlaylistTile({ item }: PlaylistTileProps) {
  return (
    <button
      type="button"
      className="flex w-[200px] min-w-[200px] shrink-0 snap-start flex-col border border-line/50 bg-sunken/60 p-[17px] text-left transition-colors hover:bg-card"
    >
      <div className="relative mb-[17px] flex aspect-square w-full flex-col items-center justify-center bg-line">
        {item.kind === 'wave' && (
          <>
            <span className="absolute left-0 top-0 bg-primary/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.5px] text-primary-soft">
              {item.badge}
            </span>
            <Equalizer playing={false} className="h-8 gap-1" barClass="bg-primary-soft" />
            <span className="mt-3 text-[11px] font-semibold uppercase tracking-[0.5px] text-muted">MELODI</span>
          </>
        )}
        {item.kind === 'text' && (
          <>
            <span className="text-[28px] font-bold leading-8 text-ink">{item.big}</span>
            <span className="pt-2 text-[11px] font-medium text-muted">{item.small}</span>
          </>
        )}
        {item.kind === 'icon' && (
          <>
            <ListMusic className="size-[30px] text-primary-soft" strokeWidth={1.5} />
            <span className="pt-2 text-[11px] font-medium uppercase text-muted">{item.small}</span>
          </>
        )}
      </div>
      <p className="truncate text-[14px] font-medium leading-5 text-ink">{item.title}</p>
      <p className="truncate pt-[2px] text-[12px] leading-4 text-muted">{item.subtitle}</p>
    </button>
  );
}

/** Search View (hasil pencarian) — frame "Search Bar". */
export default function SearchView({
  query,
  currentTrackId,
  isPlaying,
  likedIds,
  onPlayTrack,
  onToggleLike,
  onTracksFound,
}: SearchViewProps) {
  const [filter, setFilter] = useState('ALL');
  const [following, setFollowing] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(peopleData.map((p) => [p.id, p.following])),
  );
  const [songResults, setSongResults] = useState<Track[]>([]);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const playlistScroller = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  const scrollPlaylists = (direction: -1 | 1) => {
    playlistScroller.current?.scrollBy({ left: direction * 432, behavior: 'smooth' });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!playlistScroller.current) return;
    isDragging.current = true;
    startX.current = e.pageX - playlistScroller.current.offsetLeft;
    scrollLeftStart.current = playlistScroller.current.scrollLeft;
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !playlistScroller.current) return;
    e.preventDefault();
    const x = e.pageX - playlistScroller.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    playlistScroller.current.scrollLeft = scrollLeftStart.current - walk;
  };

  const q = query.trim().toLowerCase();

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const results = (await searchMusic(query.trim() || 'Frank Ocean', 20)).map(toTrack);
        if (active) {
          setSongResults(results);
          onTracksFound(results);
        }
      } catch (cause) {
        if (active) {
          // In development or demo mode, fallback to mock tracks instead of showing error
          const queryLower = (query.trim() || 'Frank Ocean').toLowerCase();
          const fallback = tracks.filter((t) =>
            `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(queryLower),
          );
          setSongResults(fallback.length > 0 ? fallback : tracks);
          if (!import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE !== 'true') {
            setSearchError(cause instanceof Error ? cause.message : 'Unable to search songs.');
          }
        }
      } finally {
        if (active) setSearching(false);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, onTracksFound]);

  const matches = (hay: string) => !q || hay.toLowerCase().includes(q);
  const showTop = matches(topResult.name) || songResults.length > 0;
  const people = peopleData.filter((p) => matches(`${p.name} ${p.handle}`));
  const plays = relevantPlaylists.filter((p) => matches(`${p.title} ${p.subtitle}`) || matches(topResult.name));

  const show = (name: string) => filter === 'ALL' || filter === name;
  const nothing = Boolean(q && !songResults.length && !people.length && !plays.length && !matches(topResult.name));

  return (
    <div className="flex flex-col gap-10 px-8 pb-8 pt-0">
      {/* Filter chips */}
      <div className="sticky top-16 z-10 -mx-8 border-b border-line/40 bg-base/90 px-8 py-5 backdrop-blur-[12px]">
        <div className="flex gap-2">
          {searchFilters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cx(
                'border px-[17px] py-[7px] text-[12px] font-semibold leading-4 tracking-[0.3px] transition-colors',
                filter === f ? 'border-primary bg-primary text-on-primary' : 'border-line bg-card text-dim hover:border-muted',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {nothing && (
        <p className="py-16 text-center text-[14px] text-muted">
          No results for &ldquo;{query}&rdquo;. Try another artist, song or playlist.
        </p>
      )}

      {searchError && <p role="alert" className="text-center text-[14px] text-primary-soft">{searchError}</p>}
      {searching && <p role="status" className="text-center text-[12px] text-muted">Searching songs...</p>}

      {!nothing && (
        <>
          {show('ARTISTS') && showTop && show('PLAYLISTS') && plays.length > 0 && (
            <div className="grid gap-6 xl:grid-cols-[304px_minmax(0,1fr)] min-w-0">
              <section>
                <SectionTitle>TOP RESULT</SectionTitle>
                <div className="relative border border-line/50 bg-card/60 p-[25px] shadow-card">
                  <div className="flex items-center gap-5">
                    <div className="flex size-24 shrink-0 items-center justify-center border border-line bg-line text-[30px] font-bold text-muted">
                      {topResult.initials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-[24px] font-bold leading-8 text-ink">{topResult.name}</h4>
                      <p className="pt-1 text-[12px] font-semibold uppercase leading-4 tracking-[0.6px] text-primary-soft">
                        {topResult.type}
                      </p>
                      <p className="pt-[2px] text-[12px] leading-4 text-muted">{topResult.listeners}</p>
                    </div>
                  </div>
                  <div className="mt-[70px] flex justify-end">
                    <button
                      type="button"
                      aria-label="Play top result"
                      onClick={() => songResults[0] && onPlayTrack(songResults[0].id)}
                      className="flex size-12 items-center justify-center bg-primary text-on-primary shadow-primary transition hover:brightness-110"
                    >
                      <Play className="size-[14px]" fill="currentColor" />
                    </button>
                  </div>
                </div>
              </section>

              <section className="min-w-0 w-full overflow-hidden">
                <div className="flex items-center justify-between pb-3">
                  <h3 className="text-[12px] font-semibold uppercase leading-4 tracking-[1.2px] text-muted">
                    RELEVANT PLAYLISTS
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Scroll playlists left"
                      onClick={() => scrollPlaylists(-1)}
                      className="flex size-7 items-center justify-center border border-line bg-card text-dim transition-colors hover:border-primary hover:text-primary active:scale-95"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Scroll playlists right"
                      onClick={() => scrollPlaylists(1)}
                      className="flex size-7 items-center justify-center border border-line bg-card text-dim transition-colors hover:border-primary hover:text-primary active:scale-95"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
                <div
                  ref={playlistScroller}
                  onWheel={(e) => {
                    if (e.deltaY !== 0 && playlistScroller.current) {
                      playlistScroller.current.scrollLeft += e.deltaY;
                    }
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUpOrLeave}
                  onMouseLeave={handleMouseUpOrLeave}
                  onMouseMove={handleMouseMove}
                  className="flex flex-nowrap gap-4 overflow-x-auto overscroll-x-contain pb-4 pt-1 select-none cursor-grab active:cursor-grabbing scroll-smooth"
                >
                  {plays.map((p) => (
                    <PlaylistTile key={p.id} item={p} />
                  ))}
                </div>
              </section>
            </div>
          )}

          {!(show('ARTISTS') && showTop) && show('PLAYLISTS') && plays.length > 0 && (
            <section className="w-full min-w-0">
              <div className="flex items-center justify-between pb-3">
                <h3 className="text-[12px] font-semibold uppercase leading-4 tracking-[1.2px] text-muted">
                  RELEVANT PLAYLISTS
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Scroll playlists left"
                    onClick={() => scrollPlaylists(-1)}
                    className="flex size-7 items-center justify-center border border-line bg-card text-dim transition-colors hover:border-primary hover:text-primary active:scale-95"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Scroll playlists right"
                    onClick={() => scrollPlaylists(1)}
                    className="flex size-7 items-center justify-center border border-line bg-card text-dim transition-colors hover:border-primary hover:text-primary active:scale-95"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
              <div
                ref={playlistScroller}
                onWheel={(e) => {
                  if (e.deltaY !== 0 && playlistScroller.current) {
                    playlistScroller.current.scrollLeft += e.deltaY;
                  }
                }}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onMouseMove={handleMouseMove}
                className="flex flex-nowrap gap-4 overflow-x-auto overscroll-x-contain pb-4 pt-1 select-none cursor-grab active:cursor-grabbing scroll-smooth"
              >
                {plays.map((p) => (
                  <PlaylistTile key={p.id} item={p} />
                ))}
              </div>
            </section>
          )}

          {show('ARTISTS') && showTop && !(show('PLAYLISTS') && plays.length > 0) && (
            <section className="w-full max-w-[400px]">
              <SectionTitle>TOP RESULT</SectionTitle>
              <div className="relative border border-line/50 bg-card/60 p-[25px] shadow-card">
                <div className="flex items-center gap-5">
                  <div className="flex size-24 shrink-0 items-center justify-center border border-line bg-line text-[30px] font-bold text-muted">
                    {topResult.initials}
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-[24px] font-bold leading-8 text-ink">{topResult.name}</h4>
                    <p className="pt-1 text-[12px] font-semibold uppercase leading-4 tracking-[0.6px] text-primary-soft">
                      {topResult.type}
                    </p>
                    <p className="pt-[2px] text-[12px] leading-4 text-muted">{topResult.listeners}</p>
                  </div>
                </div>
                <div className="mt-[70px] flex justify-end">
                  <button
                    type="button"
                    aria-label="Play top result"
                    onClick={() => songResults[0] && onPlayTrack(songResults[0].id)}
                    className="flex size-12 items-center justify-center bg-primary text-on-primary shadow-primary transition hover:brightness-110"
                  >
                    <Play className="size-[14px]" fill="currentColor" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {show('PEOPLE') && people.length > 0 && (
            <section>
              <SectionTitle action="VIEW ALL">PEOPLE</SectionTitle>
              <div className="grid gap-4 md:grid-cols-3">
                {people.map((p) => {
                  const isFollowing = following[p.id];
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3 border border-line/50 bg-sunken/60 p-[17px]">
                      <div className="flex min-w-0 items-center gap-[14px]">
                        <div className="flex size-12 shrink-0 items-center justify-center border border-line bg-line text-[14px] font-semibold text-muted">
                          {p.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium leading-5 text-ink">{p.name}</p>
                          <p className="truncate text-[12px] leading-4 text-muted">{p.handle}</p>
                          <p className="pt-[2px] text-[11px] leading-[15px] text-muted/80">{p.followers}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFollowing((s) => ({ ...s, [p.id]: !s[p.id] }))}
                        className={cx(
                          'flex shrink-0 items-center gap-1 border px-3 py-[5px] text-[11px] font-semibold uppercase leading-4 tracking-[0.55px] transition-colors',
                          isFollowing ? 'border-line text-muted hover:border-primary hover:text-primary' : 'border-primary text-primary hover:bg-primary hover:text-on-primary',
                        )}
                      >
                        {isFollowing && <Check className="size-3" strokeWidth={3} />}
                        {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {show('TRACKS') && songResults.length > 0 && (
            <section>
              <SectionTitle action="VIEW ALL">SONGS</SectionTitle>
              <SearchSongsTable
                tracks={songResults}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                likedIds={likedIds}
                onPlay={onPlayTrack}
                onToggleLike={onToggleLike}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
