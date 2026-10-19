import { useEffect, useState } from 'react';
import { Play, Pause, Trash2, ListMusic, Pencil } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { cx, toDurationLabel, toSeconds } from '../lib/utils';
import TrackList from '../components/TrackList';
import PlaylistCover from '../components/PlaylistCover';
import ModalEditPlaylist from '../components/ModalEditPlaylist';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import type { Track } from '../types';

const formatters = new Map<string, Intl.DateTimeFormat>();
function addedLabel(iso?: string): string {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    let fmt = formatters.get('label');
    if (!fmt) {
      fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      formatters.set('label', fmt);
    }
    return fmt.format(date);
  } catch {
    return '';
  }
}

/** Playlist Detail View — data dari backend, lagu di-hydrate via /music/info. */
export default function PlaylistView() {
  const { playlistId = '' } = useParams<{ playlistId: string }>();
  const { user } = useAuth();
  const {
    playlists,
    visitedPlaylists,
    tracksOf,
    loadPlaylist,
    removeFromPlaylist,
    deletePlaylist,
    updatePlaylist,
    currentTrackId,
    isPlaying,
    likedIds,
    playTrack,
    toggleLike,
    togglePlay,
  } = usePlayer();

  const [failedId, setFailedId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const playlist = playlists.find((p) => p.id === playlistId) ?? visitedPlaylists[playlistId];
  const loadFailed = !playlist && failedId === playlistId;

  // Bila playlist belum ada di state (akses URL langsung / device lain),
  // ambil detailnya sekali dari backend.
  useEffect(() => {
    if (playlist || !playlistId) return undefined;
    let cancelled = false;
    loadPlaylist(playlistId).catch(() => {
      if (!cancelled) setFailedId(playlistId);
    });
    return () => {
      cancelled = true;
    };
  }, [playlistId, playlist, loadPlaylist]);

  if (!playlist) {
    return (
      <p className="px-4 py-12 text-center text-[14px] text-muted sm:px-8">
        {loadFailed
          ? 'Playlist tidak ditemukan atau bersifat privat.'
          : 'Memuat playlist...'}
      </p>
    );
  }

  const list = tracksOf(playlist.trackIds);
  const playableList = list.filter((track) => track.videoId);
  const count = playlist.trackIds.length;
  const duration = toDurationLabel(list.reduce((sum, t) => sum + toSeconds(t.duration), 0));
  const playlistIsPlaying = isPlaying && playableList.some((t) => t.id === currentTrackId);
  const canPlay = playableList.length > 0;
  const isOwner = user != null && playlist.userId === user.id;
  const addedMap = Object.fromEntries(playlist.trackIds.map((id) => [id, addedLabel(playlist.songAdded[id])]));

  const handlePlay = () => {
    if (playlistIsPlaying) return togglePlay();
    if (playableList.length) playTrack(playableList[0].id, playableList);
  };

  const handleRemove = (track: Track) => {
    if (!isOwner || removingId) return;
    setRemovingId(track.id);
    removeFromPlaylist(playlist.id, track.id)
      .catch(() => undefined)
      .finally(() => setRemovingId(null));
  };

  const handleDelete = async () => {
    if (!isOwner || deleting) return;
    if (!window.confirm(`Hapus playlist "${playlist.name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setDeleting(true);
    try {
      await deletePlaylist(playlist.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/15 via-primary/5 to-transparent">
        <div className="flex flex-col gap-6 p-4 sm:flex-row sm:items-end sm:gap-7 sm:p-8">
          <PlaylistCover
            tracks={list.slice(0, 4)}
            className="size-40 shrink-0 border border-line/60 shadow-card sm:size-56"
            iconClassName="size-14 text-muted"
          />
          <div className="min-w-0 flex-1">
            <p className="pb-1 text-[12px] font-semibold uppercase leading-4 tracking-[1.2px] text-muted">
              PLAYLIST{isOwner ? '' : ` • ${playlist.status === 'private' ? 'PRIVATE' : 'PUBLIC'}`}
            </p>
            <h1 className="break-words pb-1 text-[32px] font-bold leading-10 tracking-[-1.2px] text-ink sm:text-[48px] sm:leading-[48px]">{playlist.name}</h1>
            <p className="max-w-[672px] pb-4 pt-2 text-[14px] leading-5 text-dim sm:pt-3 sm:text-[16px] sm:leading-[23px]">
              {playlist.description || 'A playlist made with Melodi.'}
            </p>
            <div className="flex items-center gap-2 pb-6 text-[12px] leading-4">
              <span className="font-medium text-ink">{count} {count === 1 ? 'song' : 'songs'}</span>
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
              {/* Like & Download: disembunyikan sementara, mungkin menyusul. */}
              {isOwner && (
                <>
                  <button
                    type="button"
                    aria-label="Edit playlist"
                    onClick={() => setShowEdit(true)}
                    className="flex size-10 items-center justify-center text-muted transition-colors hover:text-primary"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete playlist"
                    onClick={() => void handleDelete()}
                    disabled={deleting}
                    className="flex size-10 items-center justify-center text-muted transition-colors hover:text-red-400 disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tracklist */}
      <section className="pt-4">
        {count === 0 ? (
          <div className="flex flex-col items-center gap-3 px-8 py-12 text-center">
            <div className="mb-3 flex size-14 items-center justify-center bg-line">
              <ListMusic className="size-6 text-muted" strokeWidth={1.5} />
            </div>
            <p className="text-[14px] font-semibold text-ink">This playlist is empty</p>
            <p className="max-w-[420px] text-[12px] leading-4 text-muted">
              Cari lagu di halaman Search, lalu tekan tombol &ldquo;+&rdquo; di sebelah lagu untuk menambahkannya ke
              &ldquo;{playlist.name}&rdquo;.
            </p>
          </div>
        ) : (
          <TrackList
            tracks={list}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            likedIds={likedIds}
            addedLabels={addedMap}
            onPlay={(id) => playTrack(id, playableList)}
            onToggleLike={toggleLike}
            onRemove={isOwner ? handleRemove : undefined}
            removingId={removingId}
          />
        )}
      </section>

      {showEdit && (
        <ModalEditPlaylist
          initialName={playlist.name}
          initialDescription={playlist.description}
          onClose={() => setShowEdit(false)}
          onSave={async (input) => {
            await updatePlaylist(playlist.id, input);
            setShowEdit(false);
          }}
        />
      )}
    </div>
  );
}
