import { Heart, Play, Pause } from 'lucide-react';
import { cx, toDurationLabel, toSeconds } from '../lib/utils';
import TrackList from '../components/TrackList';
import { usePlayer } from '../context/PlayerContext';

/** Halaman Liked Songs — daftar lagu yang disukai user (state in-app). */
export default function LikedSongs() {
  const { likedTracks: tracks, currentTrackId, isPlaying, likedIds, playTrack, toggleLike, togglePlay } = usePlayer();

  const playable = tracks.filter((track) => track.videoId);
  const listPlaying = isPlaying && playable.some((track) => track.id === currentTrackId);
  const canPlay = listPlaying || playable.length > 0;
  const duration = toDurationLabel(tracks.reduce((sum, track) => sum + toSeconds(track.duration), 0));

  const handlePlay = () => {
    if (listPlaying) return togglePlay();
    if (playable.length) playTrack(playable[0].id, playable);
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/15 via-primary/5 to-transparent">
        <div className="flex flex-col gap-7 p-8 sm:flex-row sm:items-end">
          <div className="flex size-56 shrink-0 items-center justify-center border border-line/60 bg-gradient-to-br from-primary to-primary-deep shadow-card">
            <Heart className="size-16 text-on-primary" fill="currentColor" strokeWidth={1.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="pb-1 text-[12px] font-semibold uppercase leading-4 tracking-[1.2px] text-muted">PLAYLIST</p>
            <h1 className="pb-1 text-[48px] font-bold leading-[48px] tracking-[-1.2px] text-ink">Liked Songs</h1>
            <p className="max-w-[672px] pb-4 pt-3 text-[16px] leading-[23px] text-dim">
              {tracks.length === 0
                ? 'Lagu yang kamu beri tanda hati akan muncul di sini.'
                : `${tracks.length} lagu yang kamu sukai.`}
            </p>
            <div className="flex items-center gap-2 pb-6 text-[12px] leading-4">
              <span className="font-medium text-ink">{tracks.length} songs</span>
              <span className="text-muted">•</span>
              <span className="text-muted">{duration}</span>
            </div>

            <button
              type="button"
              onClick={handlePlay}
              disabled={!canPlay}
              className={cx(
                'flex h-11 items-center gap-2 bg-primary px-7 text-[14px] font-semibold leading-5 text-on-primary shadow-primary transition hover:brightness-110',
                !canPlay && 'cursor-not-allowed opacity-50',
              )}
            >
              {listPlaying ? <Pause className="size-[13px]" fill="currentColor" /> : <Play className="size-[13px]" fill="currentColor" />}
              {listPlaying ? 'Pause' : 'Play'}
            </button>
          </div>
        </div>
      </section>

      {/* Tracklist */}
      <section className="pt-4">
        {tracks.length ? (
          <TrackList
            tracks={tracks}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            likedIds={likedIds}
            onPlay={(id) => playTrack(id, tracks)}
            onToggleLike={toggleLike}
          />
        ) : (
          <p className="px-8 py-12 text-center text-[14px] text-muted">
            Belum ada lagu yang disukai. Buka Search lalu tekan tombol hati pada lagu favoritmu.
          </p>
        )}
      </section>
    </div>
  );
}
