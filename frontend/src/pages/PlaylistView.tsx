import { Play, Pause, Heart, Download, MoreHorizontal, ListMusic } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { cx, toDurationLabel, toSeconds } from '../lib/utils';
import TrackList from '../components/TrackList';
import { usePlayer } from '../context/PlayerContext';
import type { Playlist, Track } from '../types';

const BARS = ['h-3', 'h-6', 'h-9', 'h-4', 'h-7', 'h-2', 'h-5'];

interface CoverProps {
  playlist: Playlist;
}

function Cover({ playlist }: CoverProps) {
  const meta = playlist.meta;
  if (playlist.cover) {
    return <img src={playlist.cover} alt={`${playlist.name} cover`} className="size-40 shrink-0 object-cover shadow-card sm:size-56" />;
  }
  if (!meta) {
    return (
      <div className="flex size-40 shrink-0 items-center justify-center border border-line/60 sm:size-56 bg-gradient-to-br from-raised to-sunken shadow-card">
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
export default function PlaylistView() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const { playlists, tracks, currentTrackId, isPlaying, likedIds, playTrack, toggleLike, togglePlay } = usePlayer();

  const playlist = playlists.find((p) => p.id === playlistId);
  if (!playlist) {
    return <p className="px-4 py-12 text-center text-[14px] text-muted sm:px-8">Playlist tidak ditemukan.</p>;
  }

  const list = playlist.trackIds
    .map((id) => tracks.find((track) => track.id === id))
    .filter((track): track is Track => track !== undefined);
  const playableList = list.filter((track) => track.videoId);
  const count = playlist.trackCount ?? list.length;
  const duration =
    playlist.durationLabel ?? toDurationLabel(list.reduce((s, t) => s + toSeconds(t.duration), 0));
  const playlistIsPlaying = isPlaying && playableList.some((t) => t.id === currentTrackId);
  const canPlay = playlistIsPlaying || playableList.length > 0;

  const handlePlay = () => {
    if (playlistIsPlaying) return togglePlay();
    if (playableList.length) playTrack(playableList[0].id, playableList);
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/15 via-primary/5 to-transparent">
        <div className="flex flex-col gap-6 p-4 sm:flex-row sm:items-end sm:gap-7 sm:p-8">
          <Cover playlist={playlist} />
          <div className="min-w-0 flex-1">
            <p className="pb-1 text-[12px] font-semibold uppercase leading-4 tracking-[1.2px] text-muted">PLAYLIST</p>
            <h1 className="break-words pb-1 text-[32px] font-bold leading-10 tracking-[-1.2px] text-ink sm:text-[48px] sm:leading-[48px]">{playlist.name}</h1>
            <p className="max-w-[672px] pb-4 pt-2 text-[14px] leading-5 text-dim sm:pt-3 sm:text-[16px] sm:leading-[23px]">
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
                disabled={!canPlay}
                className={cx(
                  'flex h-11 items-center gap-2 bg-primary px-7 text-[14px] font-semibold leading-5 text-on-primary shadow-primary transition hover:brightness-110',
                  !canPlay && 'cursor-not-allowed opacity-50',
                )}
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
            onPlay={(id) => playTrack(id, list)}
            onToggleLike={toggleLike}
          />
        ) : (
          <p className="px-4 py-12 text-center text-[14px] text-muted sm:px-8">This playlist is empty. Use search to add songs.</p>
        )}
      </section>
    </div>
  );
}
