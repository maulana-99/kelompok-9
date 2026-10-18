import { useMemo, useState } from 'react';
import { Plus, Play, Pause, Heart, Search, LayoutGrid, List, Sparkles } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { cx, toDurationLabel, toSeconds } from '../lib/utils';
import { usePlayer } from '../context/PlayerContext';
import PlaylistCover from '../components/PlaylistCover';
import type { Track } from '../types';

export default function LibraryView() {
  const {
    playlists,
    tracks,
    currentTrackId,
    isPlaying,
    likedIds,
    playTrack,
    openPlaylist,
    openLiked,
    openCreate,
    togglePlay,
  } = usePlayer();

  const [filter, setFilter] = useState<'all' | 'playlists' | 'liked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const firstStreamable = (ids: string[]): string | undefined =>
    ids.find((id) => tracks.find((track) => track.id === id)?.videoId);

  const listFor = (ids: string[]): Track[] =>
    ids
      .map((id) => tracks.find((track) => track.id === id))
      .filter((track): track is Track => track !== undefined);

  const playableLikedId = firstStreamable(likedIds);
  const likedPlaying = isPlaying && currentTrackId !== null && likedIds.includes(currentTrackId);

  const filteredPlaylists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return playlists.filter((p) => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      if (filter === 'liked') return false;
      return matchesSearch;
    });
  }, [playlists, searchQuery, filter]);

  const totalTracks = useMemo(() => {
    return playlists.reduce((acc, p) => acc + p.trackIds.length, 0);
  }, [playlists]);

  const showLikedCard = filter === 'all' || filter === 'liked';
  const showPlaylists = filter === 'all' || filter === 'playlists';

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-8 p-4 sm:p-8">
      <PageHeader
        eyebrow="Collection"
        title="Your Library"
        subtitle={`${playlists.length} ${playlists.length === 1 ? 'playlist' : 'playlists'} • ${totalTracks} tracks curated`}
      >
        <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.6px] text-on-primary shadow-primary transition hover:brightness-110 active:scale-95"
          >
            <Plus className="size-4" strokeWidth={3} />
            CREATE PLAYLIST
          </button>
      </PageHeader>

      {/* Filter and View Controls Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          {([
            { id: 'all', label: 'All' },
            { id: 'playlists', label: 'Playlists' },
            { id: 'liked', label: `Liked Songs (${likedIds.length})` },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cx(
                'border px-4 py-1.5 text-[12px] font-semibold tracking-[0.3px] transition-colors',
                filter === tab.id
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-line/60 bg-card text-dim hover:border-line hover:text-ink',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search inside library & Grid/List switcher */}
        <div className="flex items-center gap-3">
          <div className="relative min-w-[200px] flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in library..."
              className="h-9 w-full border border-line/60 bg-card pl-9 pr-3 text-[13px] text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-primary/60"
            />
          </div>

          <div className="flex items-center border border-line/60 bg-card p-0.5">
            <button
              type="button"
              aria-label="Grid view"
              onClick={() => setViewMode('grid')}
              className={cx(
                'flex size-8 items-center justify-center transition-colors',
                viewMode === 'grid' ? 'bg-line text-primary' : 'text-muted hover:text-ink',
              )}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              aria-label="List view"
              onClick={() => setViewMode('list')}
              className={cx(
                'flex size-8 items-center justify-center transition-colors',
                viewMode === 'list' ? 'bg-line text-primary' : 'text-muted hover:text-ink',
              )}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {/* Liked Songs Featured Card */}
          {showLikedCard && (
            <div
              className="group relative flex cursor-pointer flex-col justify-between overflow-hidden border border-line/60 bg-gradient-to-br from-primary-deep via-card to-sunken p-5 shadow-card transition-all hover:border-primary/60 hover:bg-card"
              onClick={openLiked}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openLiked()}
            >
              <div>
                <div className="mb-4 flex size-12 items-center justify-center border border-primary/30 bg-primary/20 text-primary">
                  <Heart className="size-6 fill-current" />
                </div>
                <h3 className="text-[18px] font-bold leading-6 text-ink">Liked Songs</h3>
                <p className="pt-1 text-[12px] text-primary-soft">
                  {likedIds.length} {likedIds.length === 1 ? 'song' : 'songs'}
                </p>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted">AUTO PLAYLIST</span>
                {playableLikedId && (
                  <button
                    type="button"
                    aria-label="Play liked songs"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (likedPlaying) togglePlay();
                      else playTrack(playableLikedId, listFor(likedIds));
                    }}
                    className="flex size-10 items-center justify-center bg-primary text-on-primary shadow-primary transition-transform hover:scale-105 active:scale-95"
                  >
                    {likedPlaying ? (
                      <Pause className="size-4" fill="currentColor" />
                    ) : (
                      <Play className="size-4" fill="currentColor" />
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* User Playlists */}
          {showPlaylists &&
            filteredPlaylists.map((p) => {
              const count = p.trackIds.length;
              const playableId = firstStreamable(p.trackIds);
              const isPlaylistPlaying = isPlaying && p.trackIds.includes(currentTrackId ?? '');

              return (
                <div
                  key={p.id}
                  onClick={() => openPlaylist(p.id)}
                  className="group relative flex cursor-pointer flex-col border border-line/50 bg-sunken/60 p-4 transition-all hover:border-line hover:bg-card"
                >
                  {/* Playlist Cover Art — mosaiik 4 lagu pertama */}
                  <div className="relative mb-3 flex aspect-square w-full items-center justify-center overflow-hidden border border-line/40 bg-line">
                    <PlaylistCover tracks={listFor(p.trackIds)} className="size-full" />

                    {/* Floating Play Button on Hover */}
                    {playableId && (
                      <button
                        type="button"
                        aria-label={`Play ${p.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isPlaylistPlaying) togglePlay();
                          else playTrack(playableId, listFor(p.trackIds));
                        }}
                        className={cx(
                          'absolute bottom-2.5 right-2.5 flex size-10 items-center justify-center bg-primary text-on-primary shadow-primary transition-all duration-200 active:scale-95',
                          isPlaylistPlaying
                            ? 'opacity-100 scale-100'
                            : 'opacity-0 translate-y-2 scale-90 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100',
                        )}
                      >
                        {isPlaylistPlaying ? (
                          <Pause className="size-4" fill="currentColor" />
                        ) : (
                          <Play className="size-4 ml-0.5" fill="currentColor" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Playlist Info */}
                  <h3 className="truncate text-[14px] font-semibold leading-5 text-ink transition-colors group-hover:text-primary">
                    {p.name}
                  </h3>
                  <p className="truncate pt-0.5 text-[12px] leading-4 text-muted">
                    {count} {count === 1 ? 'song' : 'songs'} • {toDurationLabel(listFor(p.trackIds).reduce((sum, t) => sum + toSeconds(t.duration), 0))}
                  </p>
                </div>
              );
            })}
        </div>
      ) : (
        /* List View */
        <div className="flex flex-col divide-y divide-line/40 border border-line/50 bg-sunken/40">
          {showLikedCard && (
            <div
              onClick={openLiked}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openLiked()}
              className="group flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-card"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center bg-primary/20 text-primary">
                  <Heart className="size-5 fill-current" />
                </div>
                <div>
                  <h4 className="text-[14px] font-semibold text-ink group-hover:text-primary">Liked Songs</h4>
                  <p className="text-[12px] text-muted">{likedIds.length} songs</p>
                </div>
              </div>
              <span className="text-[12px] font-medium text-primary-soft">Auto collection</span>
            </div>
          )}

          {showPlaylists &&
            filteredPlaylists.map((p) => {
              const count = p.trackIds.length;
              const durationLabel = toDurationLabel(listFor(p.trackIds).reduce((sum, t) => sum + toSeconds(t.duration), 0));
              return (
                <div
                  key={p.id}
                  onClick={() => openPlaylist(p.id)}
                  className="group flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-card"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <PlaylistCover tracks={listFor(p.trackIds)} className="size-12 shrink-0 border border-line/40" iconClassName="size-4 text-muted" />
                    <div className="min-w-0">
                      <h4 className="truncate text-[14px] font-semibold text-ink group-hover:text-primary">
                        {p.name}
                      </h4>
                      <p className="truncate text-[12px] text-muted">
                        {p.description || `${count} songs`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-[12px] text-muted">
                    <span>{count} tracks</span>
                    <span className="hidden sm:inline">{durationLabel}</span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Empty State */}
      {showPlaylists && filteredPlaylists.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-line/60 bg-card/30 p-8">
          <div className="mb-4 flex size-16 items-center justify-center bg-line text-muted">
            <Sparkles className="size-8 text-primary" />
          </div>
          <h3 className="text-[18px] font-bold text-ink">
            {searchQuery ? 'No playlists found' : 'Your Library is empty'}
          </h3>
          <p className="max-w-md pt-2 text-[14px] text-muted">
            {searchQuery
              ? `No playlists match "${searchQuery}". Try a different search term.`
              : 'Create your first playlist and start building your personal music universe.'}
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-6 flex items-center gap-2 bg-primary px-6 py-2.5 text-[12px] font-bold uppercase tracking-[0.6px] text-on-primary transition hover:brightness-110 active:scale-95"
          >
            <Plus className="size-4" strokeWidth={3} />
            CREATE PLAYLIST NOW
          </button>
        </div>
      )}
    </div>
  );
}
