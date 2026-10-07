import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { API_URL, api } from '../lib/api';

// Bentuk satu hasil pencarian lagu dari GET /music/search
interface MusicResult {
  video_id: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail: string;
  duration: string;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Thumbnail di-proxy lewat backend; sebagian ad-blocker/firewall memblokir
// request langsung ke domain googleusercontent.com dari origin lain.
function thumbProxy(url: string): string {
  return `${API_URL}/music/thumb?url=${encodeURIComponent(url)}`;
}

export default function Music() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MusicResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Riwayat pemutaran sebagai stack (seperti history browser):
  // klik lagu baru = push (potong cabang forward), tombol back/forward
  // hanya memindahkan posisi index tanpa menambah entri.
  const [history, setHistory] = useState<MusicResult[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const current = historyIndex >= 0 ? history[historyIndex] : null;

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const data = await api<MusicResult[]>(`/music/search?q=${encodeURIComponent(q)}&limit=20`);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencari lagu');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  // <audio> selalu ter-render di dalam player; setiap `current` berganti
  // (klik lagu maupun navigasi back/forward) muat ulang lalu putar.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    setCurrentTime(0);
    setDuration(0);
    audio.load();
    audio.play().catch(() => setPlaying(false));
  }, [current]);

  // Sinkronkan volume ke elemen audio.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // Klik lagu dari hasil pencarian: buang riwayat "forward" setelah posisi
  // sekarang lalu push lagu baru (persis perilaku history browser).
  function playSong(song: MusicResult) {
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), song]);
    setHistoryIndex(historyIndex + 1);
  }

  // delta -1 = lagu sebelumnya, +1 = maju lagi.
  function skip(delta: number) {
    setHistoryIndex((prev) => Math.min(Math.max(prev + delta, 0), history.length - 1));
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }

  function changeVolume(v: number) {
    setVolume(v);
    setMuted(v === 0);
  }

  const canBack = historyIndex > 0;
  const canForward = historyIndex < history.length - 1;

  return (
    <div className="min-h-screen bg-[#121212] p-6 pb-32 text-white">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Cari Musik</h1>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Judul lagu, artis, atau album..."
            className="flex-1 rounded-full border border-gray-700 bg-[#1e1e1e] px-4 py-2 text-sm focus:border-purple-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-[#E9204F] px-5 py-2 text-sm font-semibold hover:brightness-110 disabled:opacity-50"
          >
            {loading ? '...' : 'Cari'}
          </button>
        </form>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {/* Results */}
        <div className="space-y-2">
          {results.map((song) => (
            <button
              key={song.video_id}
              onClick={() => playSong(song)}
              className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-[#231f36] ${
                current?.video_id === song.video_id ? 'bg-[#231f36]' : 'bg-[#181524]'
              }`}
            >
              {song.thumbnail ? (
                <img
                  src={thumbProxy(song.thumbnail)}
                  alt=""
                  className="h-12 w-12 rounded object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-12 w-12 rounded bg-[#2a263c]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{song.title}</p>
                <p className="truncate text-xs text-gray-400">
                  {song.artist}
                  {song.album ? ` • ${song.album}` : ''}
                </p>
              </div>
              <span className="text-xs text-gray-500">{song.duration}</span>
            </button>
          ))}
          {!loading && !error && results.length === 0 && (
            <p className="text-sm text-gray-500">Ketik judul lagu di atas lalu klik Cari.</p>
          )}
        </div>
      </div>

      {/* Player */}
      {current && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-[#303030] bg-[#151515]/95 px-5 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-2xl items-center gap-4">
            {/* Info lagu */}
            <div className="flex w-[180px] items-center gap-3">
              {current.thumbnail ? (
                <img src={thumbProxy(current.thumbnail)} alt="" className="h-12 w-12 rounded object-cover" />
              ) : (
                <div className="h-12 w-12 rounded bg-[#2a263c]" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{current.title}</p>
                <p className="truncate text-xs text-gray-500">{current.artist}</p>
              </div>
            </div>

            {/* Kontrol + slider progres */}
            <div className="flex flex-1 flex-col items-center gap-1">
              <div className="flex items-center gap-5">
                <button
                  onClick={() => skip(-1)}
                  disabled={!canBack}
                  title={canBack ? 'Lagu sebelumnya' : 'Belum ada riwayat'}
                  className="text-gray-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <SkipBack size={18} />
                </button>
                <button
                  onClick={togglePlay}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E9204F] transition hover:brightness-110"
                >
                  {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                </button>
                <button
                  onClick={() => skip(1)}
                  disabled={!canForward}
                  title={canForward ? 'Lagu berikutnya (riwayat)' : 'Sudah paling depan'}
                  className="text-gray-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <SkipForward size={18} />
                </button>
              </div>

              <div className="flex w-full items-center gap-2">
                <span className="w-10 text-right text-[10px] text-gray-500">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={Math.min(currentTime, duration || 0)}
                  disabled={duration <= 0}
                  onChange={(e) => {
                    const t = Number(e.target.value);
                    const audio = audioRef.current;
                    if (audio) {
                      audio.currentTime = t;
                      setCurrentTime(t);
                    }
                  }}
                  className="h-1 flex-1 cursor-pointer accent-[#E9204F] disabled:cursor-default"
                />
                <span className="w-10 text-[10px] text-gray-500">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Volume */}
            <div className="hidden w-[150px] items-center justify-end gap-2 sm:flex">
              <button onClick={() => setMuted((m) => !m)} className="text-gray-400 transition hover:text-white">
                {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                className="h-1 w-24 cursor-pointer accent-[#E9204F]"
              />
            </div>
          </div>

          <audio
            ref={audioRef}
            src={`${API_URL}/music/${current.video_id}/stream`}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => {
              setPlaying(false);
              setCurrentTime(0);
            }}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onError={() => setPlaying(false)}
          />
        </div>
      )}
    </div>
  );
}
