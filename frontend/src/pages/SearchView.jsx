import { useMemo, useState } from 'react';
import { Play, ListMusic, Check } from 'lucide-react';
import { cx } from '../lib/utils';
import SearchSongsTable from '../components/SearchSongsTable';
import Equalizer from '../components/Equalizer';
import {
  tracks,
  searchFilters,
  topResult,
  relevantPlaylists,
  people as peopleData,
} from '../data/mock';

function SectionTitle({ children, action }) {
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

function PlaylistTile({ item }) {
  return (
    <button
      type="button"
      className="flex w-[200px] shrink-0 flex-col border border-line/50 bg-sunken/60 p-[17px] text-left transition-colors hover:bg-card"
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
export default function SearchView({ query, currentTrackId, isPlaying, likedIds, onPlayTrack, onToggleLike }) {
  const [filter, setFilter] = useState('ALL');
  const [following, setFollowing] = useState(() =>
    Object.fromEntries(peopleData.map((p) => [p.id, p.following])),
  );

  const q = query.trim().toLowerCase();

  const songResults = useMemo(() => {
    if (!q) return tracks.filter((t) => t.artist === 'Frank Ocean').slice(0, 4);
    return tracks.filter((t) => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(q)).slice(0, 8);
  }, [q]);

  const matches = (hay) => !q || hay.toLowerCase().includes(q);
  const showTop = matches(topResult.name) || songResults.length > 0;
  const people = peopleData.filter((p) => matches(`${p.name} ${p.handle}`));
  const plays = relevantPlaylists.filter((p) => matches(`${p.title} ${p.subtitle}`) || matches(topResult.name));

  const show = (name) => filter === 'ALL' || filter === name;
  const nothing = q && !songResults.length && !people.length && !plays.length && !matches(topResult.name);

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

      {!nothing && (
        <>
          {(show('ARTISTS') || show('PLAYLISTS')) && (
            <div className="grid gap-6 xl:grid-cols-[304px_minmax(0,1fr)]">
              {show('ARTISTS') && showTop && (
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
              )}

              {show('PLAYLISTS') && plays.length > 0 && (
                <section className="min-w-0">
                  <SectionTitle action="SEE ALL">RELEVANT PLAYLISTS</SectionTitle>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {plays.map((p) => (
                      <PlaylistTile key={p.id} item={p} />
                    ))}
                  </div>
                </section>
              )}
            </div>
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
