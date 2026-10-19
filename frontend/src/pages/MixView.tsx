import { useEffect, useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Play } from 'lucide-react';
import SearchSongsTable from '../components/SearchSongsTable';
import TrackThumb from '../components/TrackThumb';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { getRecommendations } from '../lib/music';
import { useAsync } from '../lib/useAsync';
import { toTrack } from '../lib/utils';
import type { MusicMix } from '../types';

/** Isi satu mix personal dari Home. Data dibawa lewat state navigasi; saat reload diambil ulang. */
export default function MixView() {
  const { mixId = '' } = useParams();
  const passed = (useLocation().state as { mix?: MusicMix } | null)?.mix;
  const { token } = useAuth();
  const { currentTrackId, isPlaying, likedIds, playTrack, toggleLike, rememberTracks } = usePlayer();

  const fromState = passed?.id === mixId ? passed : undefined;
  const { data, error, loading } = useAsync(fromState ? `mix-state:${mixId}` : `mix:${mixId}`, async () => {
    if (fromState) return fromState;
    if (!token) throw new Error('Sesi berakhir, login ulang.');
    const found = (await getRecommendations(token)).mixes.find((m) => m.id === mixId);
    if (!found) throw new Error('Mix tidak ditemukan. Mix berubah mengikuti lagu yang kamu dengar.');
    return found;
  });

  const tracks = useMemo(() => data?.tracks.map(toTrack) ?? [], [data]);

  // Lagu harus dikenal player dulu sebelum bisa diputar.
  useEffect(() => {
    if (tracks.length) rememberTracks(tracks);
  }, [tracks, rememberTracks]);

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-4 sm:p-8">
      {loading && (
        <p role="status" className="text-center text-[12px] text-muted">
          Menyusun mix...
        </p>
      )}
      {error && (
        <p role="alert" className="text-center text-[14px] text-primary-soft">
          {error}
        </p>
      )}

      {data && (
        <>
          <header className="flex flex-col gap-6 sm:flex-row sm:items-end">
            <TrackThumb
              track={tracks[0] ? { ...tracks[0], thumbnail: data.thumbnail || tracks[0].thumbnail } : null}
              className="size-40 border-line/60 bg-line"
              iconClassName="size-10 text-muted"
            />
            <div className="flex min-w-0 flex-col gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.55px] text-muted">Mix untuk kamu</p>
              <h1 className="truncate text-[32px] font-bold leading-10 text-ink">{data.title}</h1>
              <p className="text-[12px] text-muted">
                {data.subtitle} · {tracks.length} lagu
              </p>
              <button
                type="button"
                disabled={!tracks.length}
                onClick={() => playTrack(tracks[0].id, tracks)}
                className="flex w-fit items-center gap-2 bg-primary px-5 py-2 text-[14px] font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Play className="size-4" fill="currentColor" />
                Putar
              </button>
            </div>
          </header>

          <SearchSongsTable
            tracks={tracks}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            likedIds={likedIds}
            onPlay={(id) => playTrack(id, tracks)}
            onToggleLike={toggleLike}
          />
        </>
      )}
    </div>
  );
}
