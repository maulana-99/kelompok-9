import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ListPlus, Loader2 } from 'lucide-react';
import { cx } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import PlaylistCover from './PlaylistCover';
import type { Playlist, Track } from '../types';

interface AddToPlaylistButtonProps {
  /** Track yang akan ditambahkan; button disembunyikan bila null. */
  track: Track | null;
  className?: string;
  iconSize?: string;
}

const MENU_W = 264;
const MENU_MAX_H = 320;

// Hanya satu popover yang boleh terbuka di seluruh aplikasi — klik tombol
// "+" lain menutup popover sebelumnya (setiap tombol punya state sendiri).
let activeClose: (() => void) | null = null;

/**
 * Tombol "+" — buka popover daftar playlist milik user, pilih satu untuk
 * menambah/hapus track (klik ulang playlist yang sudah memuat lagu
 * menghapusnya). Rendered via portal supaya tidak kepotong container
 * `overflow-hidden` (tabel search).
 */
export default function AddToPlaylistButton({ track, className = '', iconSize = 'size-[15px]' }: AddToPlaylistButtonProps) {
  const { playlists, tracksOf, addToPlaylist, removeFromPlaylist, openCreate } = usePlayer();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [menuError, setMenuError] = useState('');
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Identitas closer-nya stabil; setState-nya (dari render pertama) selalu valid.
  const closerRef = useRef<() => void>(() => setOpen(false));

  const myPlaylists = playlists.filter((p) => p.userId === user?.id);

  // Bila tombol ini hilang dari layar (pindah halaman dsb), lepas singleton-nya.
  useEffect(() => {
    return () => {
      if (activeClose === closerRef.current) activeClose = null;
    };
  }, []);

  const toggle = () => {
    if (!track || open) {
      setOpen(false);
      if (activeClose === closerRef.current) activeClose = null;
      return;
    }
    if (activeClose && activeClose !== closerRef.current) activeClose();
    activeClose = closerRef.current;

    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - MENU_W - 8));
      const spaceBelow = window.innerHeight - rect.bottom;
      const pos =
        spaceBelow < MENU_MAX_H + 12
          ? // Ruang bawah sempit: tautkan tepi bawah menu ke atas tombol —
            // menu tumbuh ke atas tanpa perlu ukur tingginya dulu.
            { left, bottom: window.innerHeight - rect.top + 8 }
          : { left, top: rect.bottom + 8 };
      setPos(pos);
    }
    setBusyId(null);
    setErrorId(null);
    setMenuError('');
    setOpen(true);
  };

  // Tutup saat klik di luar, Esc, atau scroll/resize (popover posisi fixed).
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const close = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const stop = (e: { stopPropagation(): void }) => e.stopPropagation();

  const toggleIn = async (playlist: Playlist) => {
    if (!track || busyId) return;
    const alreadyAdded = playlist.trackIds.includes(track.id);
    setBusyId(playlist.id);
    setErrorId(null);
    setMenuError('');
    try {
      if (alreadyAdded) {
        await removeFromPlaylist(playlist.id, track.id);
      } else {
        await addToPlaylist(playlist.id, track);
      }
    } catch (cause) {
      setErrorId(playlist.id);
      setMenuError(
        cause instanceof Error
          ? cause.message
          : alreadyAdded
            ? 'Gagal menghapus lagu.'
            : 'Gagal menambah lagu.',
      );
    } finally {
      setBusyId(null);
    }
  };

  if (!track) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Add to playlist"
        aria-expanded={open}
        onMouseDown={stop}
        onKeyDown={stop}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className={cx('transition-colors hover:text-primary', open ? 'text-primary' : 'text-muted', className)}
      >
        <ListPlus className={iconSize} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Add to playlist"
            style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: MENU_W, maxHeight: MENU_MAX_H }}
            // Portal tetap "anak" dari baris/stack React asal — tanpa stop
            // di sini, klik menu naik (bubbling) ke handler baris search
            // yang memanggil playTrack → memutar/menjeda lagu.
            onMouseDown={stop}
            onClick={stop}
            onKeyDown={stop}
            className="fixed z-[60] flex max-h-[320px] flex-col border border-line/60 bg-card shadow-card"
          >
            <p className="border-b border-line/40 px-4 py-3 text-[12px] font-semibold uppercase leading-4 tracking-[0.55px] text-muted">
              Add to playlist
            </p>

            {myPlaylists.length === 0 ? (
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-2 text-[12px] leading-4 text-muted">
                  <ListPlus className="size-4 shrink-0" />
                  <span>You have no playlists yet.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openCreate();
                  }}
                  className="bg-primary px-4 py-2 text-[12px] font-bold uppercase leading-4 tracking-[0.6px] text-on-primary transition hover:brightness-110"
                >
                  CREATE PLAYLIST
                </button>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {myPlaylists.map((playlist) => {
                  const added = playlist.trackIds.includes(track.id);
                  const busy = busyId === playlist.id;
                  return (
                    <div key={playlist.id}>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={busy}
                        title={added ? `Remove from "${playlist.name}"` : `Add to "${playlist.name}"`}
                        onClick={() => void toggleIn(playlist)}
                        className={cx(
                          'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-hover',
                          added && 'bg-primary/5',
                        )}
                      >
                        <PlaylistCover tracks={tracksOf(playlist.trackIds).slice(0, 4)} className="size-9 shrink-0 border border-line/40" iconClassName="size-3 text-muted" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium leading-[18px] text-ink">{playlist.name}</span>
                          <span className="block truncate text-[11px] leading-4 text-muted">
                            {playlist.trackIds.length} {playlist.trackIds.length === 1 ? 'song' : 'songs'}
                          </span>
                        </span>
                        {busy ? (
                          <Loader2 className="size-4 shrink-0 animate-spin text-muted" />
                        ) : (
                          added && <Check className="size-4 shrink-0 text-primary" strokeWidth={3} />
                        )}
                      </button>
                      {errorId === playlist.id && menuError && (
                        <p role="alert" className="px-3 pb-2 text-[11px] leading-4 text-primary-soft">{menuError}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
