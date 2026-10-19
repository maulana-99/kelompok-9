import { useEffect, useRef, useState, type Ref } from 'react';
import { ChevronDown, Heart, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import TrackThumb from './TrackThumb';
import AddToPlaylistButton from './AddToPlaylistMenu';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { ApiError } from '../lib/api';
import { getLyrics, largeThumb, thumbUrl } from '../lib/music';
import { REPEAT_LABEL, cx, toClock } from '../lib/utils';
import type { MixReason, MusicLyrics, Track } from '../types';

export type NowPlayingTab = 'queue' | 'lyrics';

const REASON_LABEL: Partial<Record<MixReason, string>> = {
  artist: 'Artis sama',
  similar: 'Mirip',
  for_you: 'Coba ini',
  favorite: 'Sering kamu putar',
};

type LyricsResult = { status: 'ok'; lyrics: MusicLyrics } | { status: 'none' } | { status: 'error' };

// Lirik per lagu tidak berubah: simpan supaya pindah tab / putar ulang tidak fetch lagi.
const LYRICS_CACHE_MAX = 50;
const lyricsCache = new Map<string, LyricsResult>();

interface NowPlayingProps {
  tab: NowPlayingTab;
  onTab: (tab: NowPlayingTab) => void;
  onClose: () => void;
}

/** Halaman "Sedang diputar" ala YouTube Music: artwork besar + tab Berikutnya / Lirik. */
export default function NowPlaying({ tab, onTab, onClose }: NowPlayingProps) {
  const player = usePlayer();
  const { token } = useAuth();
  const track = player.currentTrack;
  const videoId = track ? (track.videoId ?? track.id) : '';
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Kembalikan fokus ke tombol pembuka saat ditutup.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    // Capture phase: beberapa tombol memanggil stopPropagation. Kalau ada menu terbuka
    // (mis. tambah ke playlist), Esc cukup menutup menu itu dulu.
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('[role="menu"]') && onClose();
    window.addEventListener('keydown', onKey, true);
    // Halaman di belakang tidak ikut ter-scroll.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [onClose]);

  const liked = track ? player.likedIds.includes(track.id) : false;
  const total = player.trackDuration;

  return (
    <section aria-label="Sedang diputar" className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-base lg:bottom-[76px]">
      {/* Latar: artwork diblur, seperti YouTube Music */}
      {track?.thumbnail && (
        <img
          src={thumbUrl(largeThumb(track.thumbnail, 120))}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 size-full scale-125 object-cover opacity-30 blur-3xl"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-base/40 via-base/80 to-base" />

      <div className="relative flex items-center px-4 py-3 sm:px-6">
        <button
          ref={closeRef}
          type="button"
          aria-label="Tutup pemutar"
          onClick={onClose}
          className="p-1 text-dim transition-colors hover:text-ink"
        >
          <ChevronDown className="size-6" />
        </button>
        <p className="flex-1 text-center text-[12px] font-semibold uppercase tracking-widest text-dim">Sedang diputar</p>
        <span className="size-8" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6 sm:px-6 lg:flex-row lg:gap-10 lg:overflow-hidden lg:px-10">
        {/* Artwork + info */}
        <div className="flex shrink-0 flex-col items-center justify-center lg:min-h-0 lg:flex-1">
          {/* Lebar ikut tinggi layar supaya artwork + info muat tanpa scroll. */}
          <div className="w-full max-w-[min(480px,calc(100vh-320px))] lg:max-w-[min(560px,calc(100vh-240px))]">
            <TrackThumb
              key={track?.id ?? 'none'}
              track={track}
              large
              className="aspect-square w-full border-line/60 bg-card shadow-card"
              iconClassName="size-16 text-muted"
            />

            <div className="mt-6 flex w-full items-start gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[20px] font-bold leading-7 text-ink sm:text-[24px] sm:leading-8">
                  {track ? track.title : 'Belum ada lagu'}
                </h2>
                <p className="truncate text-[14px] leading-5 text-dim">
                  {track ? [track.artist, track.album !== '-' ? track.album : ''].filter(Boolean).join(' • ') : 'Pilih lagu untuk mulai'}
                </p>
              </div>
              <AddToPlaylistButton track={track} iconSize="size-5" className="p-1" />
              <button
                type="button"
                aria-label="Like"
                aria-pressed={liked}
                onClick={() => track && player.toggleLike(track.id)}
                disabled={!track}
                className={cx('p-1 text-dim transition-colors hover:text-primary', liked && 'text-primary', !track && 'opacity-40')}
              >
                <Heart className="size-5" fill={liked ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Kontrol besar hanya di layar kecil; di desktop player bar tetap terlihat di bawah. */}
            <div className="mt-4 w-full lg:hidden">
              <input
                type="range"
                aria-label="Seek"
                min={0}
                max={total || 0}
                step={1}
                value={Math.min(player.progress, total || 0)}
                onChange={(e) => player.seek(Number(e.target.value))}
                disabled={!track || !total}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[12px] leading-4 text-muted">
                <span>{toClock(player.progress)}</span>
                <span>{toClock(total)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Acak"
                  aria-pressed={player.shuffle}
                  onClick={player.toggleShuffle}
                  className={cx('p-2 transition-colors', player.shuffle ? 'text-primary' : 'text-dim')}
                >
                  <Shuffle className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label="Previous"
                  onClick={player.prevTrack}
                  disabled={!track}
                  className="p-2 text-ink disabled:opacity-40"
                >
                  <SkipBack className="size-6" fill="currentColor" />
                </button>
                <button
                  type="button"
                  aria-label={player.isPlaying ? 'Pause' : 'Play'}
                  onClick={player.togglePlay}
                  disabled={!track}
                  className="flex size-16 items-center justify-center rounded-full bg-primary text-on-primary hover:brightness-110 disabled:opacity-40"
                >
                  {player.isPlaying ? <Pause className="size-7" fill="currentColor" /> : <Play className="size-7" fill="currentColor" />}
                </button>
                <button
                  type="button"
                  aria-label="Next"
                  onClick={player.nextTrack}
                  disabled={!track}
                  className="p-2 text-ink disabled:opacity-40"
                >
                  <SkipForward className="size-6" fill="currentColor" />
                </button>
                <button
                  type="button"
                  aria-label={REPEAT_LABEL[player.repeat]}
                  onClick={player.cycleRepeat}
                  className={cx('p-2 transition-colors', player.repeat !== 'off' ? 'text-primary' : 'text-dim')}
                >
                  {player.repeat === 'one' ? <Repeat1 className="size-5" /> : <Repeat className="size-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Berikutnya / Lirik */}
        <div className="flex min-h-[320px] flex-col lg:min-h-0 lg:w-[420px] lg:shrink-0 xl:w-[480px]">
          <div
            role="tablist"
            aria-label="Detail lagu"
            onKeyDown={(e) => {
              const next: NowPlayingTab | null =
                e.key === 'Home'
                  ? 'queue'
                  : e.key === 'End'
                    ? 'lyrics'
                    : e.key === 'ArrowLeft' || e.key === 'ArrowRight'
                      ? tab === 'queue'
                        ? 'lyrics'
                        : 'queue'
                      : null;
              if (!next) return;
              e.preventDefault();
              onTab(next);
              document.getElementById(`np-tab-${next}`)?.focus();
            }}
            className="flex border-b border-line/60"
          >
            {(
              [
                ['queue', 'Berikutnya'],
                ['lyrics', 'Lirik'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`np-tab-${id}`}
                aria-selected={tab === id}
                tabIndex={tab === id ? 0 : -1}
                aria-controls={tab === id ? `np-panel-${id}` : undefined}
                onClick={() => onTab(id)}
                className={cx(
                  'flex-1 border-b-2 py-3 text-[13px] font-semibold uppercase tracking-wider transition-colors',
                  tab === id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-dim',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`np-panel-${tab}`} aria-labelledby={`np-tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto py-2">
            {tab === 'queue' ? (
              <QueueList
                current={track}
                played={player.played}
                upNext={player.upNext}
                reasons={player.queueReasons}
                onPlay={player.playFromQueue}
              />
            ) : (
              <LyricsPanel key={videoId} videoId={videoId} token={token} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function QueueList({
  current,
  played,
  upNext,
  reasons,
  onPlay,
}: {
  current: Track | null;
  played: Track[];
  upNext: Track[];
  reasons: Record<string, MixReason>;
  onPlay: (id: string) => void;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const currentId = current?.id;

  // Lagu yang sudah diputar ada di atas: geser daftar supaya lagu sekarang tetap kelihatan.
  // Hanya panel yang punya scroll sendiri (desktop); di HP halaman yang di-scroll.
  // played.length: baris "sudah diputar" bisa muncul belakangan (metadata dimuat async).
  useEffect(() => {
    const row = activeRef.current;
    const panel = row?.closest('[role="tabpanel"]');
    if (!row || !panel || panel.scrollHeight <= panel.clientHeight) return;
    panel.scrollTop += row.getBoundingClientRect().top - panel.getBoundingClientRect().top - 8;
  }, [currentId, played.length]);

  return (
    <>
      {played.length > 0 && (
        <>
          <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Sudah diputar</p>
          {played.map((item) => (
            <QueueRow key={item.id} track={item} label={REASON_LABEL[reasons[item.id]]} dimmed onPlay={onPlay} />
          ))}
        </>
      )}
      {current && <QueueRow ref={activeRef} track={current} label="Sedang diputar" active onPlay={onPlay} />}
      {upNext.length === 0 ? (
        <p className="px-3 py-6 text-center text-[12px] text-muted">Antrean kosong. Lagu mirip akan disambung otomatis.</p>
      ) : (
        upNext.map((item) => <QueueRow key={item.id} track={item} label={REASON_LABEL[reasons[item.id]]} onPlay={onPlay} />)
      )}
    </>
  );
}

function QueueRow({
  ref,
  track,
  label,
  active,
  dimmed,
  onPlay,
}: {
  ref?: Ref<HTMLButtonElement>;
  track: Track;
  label?: string;
  active?: boolean;
  /** Sudah diputar: tetap bisa diklik untuk diputar lagi. */
  dimmed?: boolean;
  onPlay: (id: string) => void;
}) {
  return (
    <button
      ref={ref}
      type="button"
      aria-current={active ? 'true' : undefined}
      onClick={() => onPlay(track.id)}
      className={cx(
        'flex w-full items-center gap-3 px-2 py-2 text-left transition-colors',
        active ? 'bg-white/10' : 'hover:bg-white/5',
        dimmed && 'opacity-50 hover:opacity-100',
      )}
    >
      <TrackThumb track={track} className="size-10 shrink-0 border-line bg-line" iconClassName="size-4 text-muted" />
      <span className="min-w-0 flex-1">
        <span className={cx('block truncate text-[13px] font-semibold leading-5', active ? 'text-primary-soft' : 'text-ink')}>
          {track.title}
        </span>
        <span className="block truncate text-[12px] leading-4 text-muted">{track.artist}</span>
      </span>
      {track.duration && <span className="shrink-0 text-[12px] text-muted">{track.duration}</span>}
      {label && (
        <span
          className={cx('shrink-0 px-2 py-[2px] text-[10px] font-semibold', active ? 'bg-primary text-on-primary' : 'bg-line text-dim')}
        >
          {label}
        </span>
      )}
    </button>
  );
}

/** Di-key per lagu oleh pemanggil, jadi state awal selalu milik lagu ini. */
function LyricsPanel({ videoId, token }: { videoId: string; token: string | null }) {
  const [result, setResult] = useState<LyricsResult | null>(() => lyricsCache.get(videoId) ?? null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!videoId || !token || lyricsCache.has(videoId)) return undefined;
    let alive = true;
    getLyrics(videoId, token)
      .then(
        (lyrics): LyricsResult => ({ status: 'ok', lyrics }),
        // 400 = id bukan lagu YouTube: tidak akan pernah punya lirik, jadi jangan tawarkan "Coba lagi".
        (err): LyricsResult =>
          err instanceof ApiError && (err.status === 404 || err.status === 400) ? { status: 'none' } : { status: 'error' },
      )
      .then((next) => {
        if (next.status !== 'error') {
          if (lyricsCache.size >= LYRICS_CACHE_MAX) lyricsCache.delete(lyricsCache.keys().next().value!);
          lyricsCache.set(videoId, next);
        }
        if (alive) setResult(next);
      });
    return () => {
      alive = false;
    };
  }, [videoId, token, attempt]);

  if (!videoId || !token) return <p className="px-3 py-6 text-center text-[13px] text-muted">Belum ada lagu yang diputar.</p>;
  if (!result) return <p className="px-3 py-6 text-center text-[13px] text-muted">Memuat lirik…</p>;
  if (result.status === 'none') return <p className="px-3 py-6 text-center text-[13px] text-muted">Lirik belum tersedia untuk lagu ini.</p>;
  if (result.status === 'error') {
    return (
      <div className="px-3 py-6 text-center text-[13px] text-muted">
        <p>Gagal memuat lirik.</p>
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setAttempt((n) => n + 1);
          }}
          className="mt-2 font-semibold text-primary hover:underline"
        >
          Coba lagi
        </button>
      </div>
    );
  }
  return (
    <div className="px-3 py-4">
      <p className="whitespace-pre-line text-[16px] font-semibold leading-8 text-ink sm:text-[18px]">{result.lyrics.text}</p>
      {result.lyrics.source && <p className="mt-6 text-[12px] text-muted">Sumber: {result.lyrics.source}</p>}
    </div>
  );
}
