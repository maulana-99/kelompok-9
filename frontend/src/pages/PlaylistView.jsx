import { Play, Pause, Heart, Download, MoreHorizontal, ListMusic } from 'lucide-react';
import { cx, toDurationLabel, toSeconds } from '../lib/utils';
import { getTrack } from '../data/mock';
import TrackList from '../components/TrackList';

const BARS = ['h-3', 'h-6', 'h-9', 'h-4', 'h-7', 'h-2', 'h-5'];

function Cover({ playlist }) {
  const meta = playlist.meta;
  if (playlist.cover) {
    return <img src={playlist.cover} alt={`${playlist.name} cover`} className="size-56 shrink-0 object-cover shadow-card" />;
  }
  if (!meta) {
    return (
      <div className="flex size-56 shrink-0 items-center justify-center border border-line/60 bg-gradient-to-br from-raised to-sunken shadow-card">
        <ListMusic className="size-14 text-muted" strokeWidth={1.2} />
      </div>
    );
  }
  return (
    <div className="relative flex size-56 shrink-0 flex-col justify-between border border-line/60 bg-gradient-to-br from-raised via-card to-sunken p-[25px] shadow-card">
      <div className="flex items-start justify-between border-b border-line/40 pb-3 text-[11px] font-semibold uppercase leading-[16.5px] tracking-[0.55px]">
        <span className="text-primary-soft">{meta.volume}</span>
        <span className="text-[10px] font-medium text-muted">{meta.length}</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[34px] font-bold leading-10 tracking-[-0.5px] text-ink">{meta.code}</span>
        <div className="mt-3 flex h-9 items-end gap-1" aria-hidden="true">
          {BARS.map((h, i) => (
            <span key={i} className={cx('w-1 bg-primary', h)} />
          ))}
        </div>
      </div>
      <div className="flex items-end justify-between text-[10px] font-medium uppercase leading-[15px] tracking-[0.5px] text-muted">
        <span>{playlist.name}</span>
        <span>{meta.format}</span>
      </div>
    </div>
  );
}

/** Playlist Preview View. */
export default function PlaylistView({ playlist, currentTrackId, isPlaying, likedIds, onPlayTrack, onToggleLike, onTogglePlay }) {
  const list = playlist.trackIds.map(getTrack).filter(Boolean);
  const count = playlist.trackCount ?? list.length;
  const duration =
    playlist.durationLabel ?? toDurationLabel(list.reduce((s, t) => s + toSeconds(t.duration), 0));
  const playlistIsPlaying = isPlaying && list.some((t) => t.id === currentTrackId);

  const handlePlay = () => {
    if (playlistIsPlaying) return onTogglePlay();
    if (list.length) onPlayTrack(list[0].id);
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/15 via-primary/5 to-transparent">
        <div className="flex flex-col gap-7 p-8 sm:flex-row sm:items-end">
          <Cover playlist={playlist} />
          <div className="min-w-0 flex-1">
            <p className="pb-1 text-[12px] font-semibold uppercase leading-4 tracking-[1.2px] text-muted">PLAYLIST</p>
            <h1 className="pb-1 text-[48px] font-bold leading-[48px] tracking-[-1.2px] text-ink">{playlist.name}</h1>
            <p className="max-w-[672px] pb-4 pt-3 text-[16px] leading-[23px] text-dim">
              {playlist.description || 'A playlist made with Melodi.'}
            </p>
            <div className="flex items-center gap-2 pb-6 text-[12px] leading-4">
              <span className="font-medium text-ink">{count} songs</span>
              <span className="text-muted">•</span>
              <span className="text-muted">{duration}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePlay}
                className="flex h-11 items-center gap-2 bg-primary px-7 text-[14px] font-semibold leading-5 text-on-primary shadow-primary transition hover:brightness-110"
              >
                {playlistIsPlaying ? <Pause className="size-[13px]" fill="currentColor" /> : <Play className="size-[13px]" fill="currentColor" />}
                {playlistIsPlaying ? 'Pause' : 'Play'}
              </button>
              {[
                { icon: Heart, label: 'Like playlist' },
                { icon: Download, label: 'Download' },
                { icon: MoreHorizontal, label: 'More options' },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  className="flex size-10 items-center justify-center text-muted transition-colors hover:text-primary"
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tracklist */}
      <section className="pt-4">
        {list.length ? (
          <TrackList
            tracks={list}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            likedIds={likedIds}
            onPlay={onPlayTrack}
            onToggleLike={onToggleLike}
          />
        ) : (
          <p className="px-8 py-12 text-center text-[14px] text-muted">This playlist is empty. Use search to add songs.</p>
        )}
      </section>
    </div>
  );
}
