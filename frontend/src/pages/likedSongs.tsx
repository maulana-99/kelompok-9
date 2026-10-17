import { useNavigate } from 'react-router-dom';
import { Heart, Play, Pause } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { cx, toDurationLabel, toSeconds } from '../lib/utils';
import TrackList from '../components/TrackList';
import { usePlayer } from '../context/PlayerContext';

/** Halaman Liked Songs — daftar lagu yang disukai user (state in-app). */
export default function LikedSongs() {
  const { likedTracks: tracks, currentTrackId, isPlaying, likedIds, playTrack, toggleLike, togglePlay } = usePlayer();

  const navigate = useNavigate();
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
        <div className="flex flex-col gap-6 p-4 sm:flex-row sm:items-end sm:gap-7 sm:p-8">
          <div className="flex size-40 shrink-0 sm:size-56 items-center justify-center border border-line/60 bg-gradient-to-br from-primary to-primary-deep shadow-card">
            <Heart className="size-16 text-on-primary" fill="currentColor" strokeWidth={1.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="pb-1 text-[12px] font-semibold uppercase leading-4 tracking-[1.2px] text-muted">PLAYLIST</p>
            <h1 className="break-words pb-1 text-[32px] font-bold leading-10 tracking-[-1.2px] text-ink sm:text-[48px] sm:leading-[48px]">Liked Songs</h1>
            <p className="max-w-[672px] pb-4 pt-2 text-[14px] leading-5 text-dim sm:pt-3 sm:text-[16px] sm:leading-[23px]">
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
          <div className="px-4 sm:px-8">
            <EmptyState
              icon={Heart}
              title="Belum ada lagu yang disukai"
              text="Tekan tombol hati pada lagu favoritmu, lagunya akan tersimpan di sini."
              action={{ label: 'Cari lagu', onClick: () => navigate('/search') }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
