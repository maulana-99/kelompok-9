import { useEffect, useRef, useState } from 'react';
import { Lock, Globe, Check } from 'lucide-react';
import { cx } from '../lib/utils';
import type { CreatePlaylistInput } from '../types';

interface ModalCreatePlaylistProps {
  onClose: () => void;
  onCreate: (playlist: CreatePlaylistInput) => Promise<void>;
}

const STATUS_OPTIONS: Array<{ key: 'private' | 'public'; label: string; hint: string; icon: typeof Lock }> = [
  { key: 'private', label: 'Private', hint: 'Only you can see this playlist', icon: Lock },
  { key: 'public', label: 'Public', hint: 'Anyone can open this playlist', icon: Globe },
];

/**
 * Create Playlist sebagai modal overlay — cukup nama, deskripsi, dan
 * visibilitas. Lagu ditambahkan belakangan lewat tombol "+" di halaman
 * Search atau player footer.
 */
export default function ModalCreatePlaylist({ onClose, onCreate }: ModalCreatePlaylistProps) {
  const [name, setName] = useState('New Playlist');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'public' | 'private'>('private');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  // Tutup dengan Esc + kunci scroll body (mount-only: jangan curi fokus tiap render)
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  const submit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await onCreate({
        name: name.trim() || 'New Playlist',
        description: description.trim(),
        status,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal membuat playlist. Coba lagi.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Create playlist"
        tabIndex={-1}
        className="w-full max-w-[520px] border border-line/60 bg-base shadow-card outline-none"
      >
        <div className="flex flex-col p-8">
          <p className="pb-2 text-[12px] font-semibold uppercase leading-4 tracking-[0.6px] text-muted">PLAYLIST</p>

          <div className="relative pb-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Playlist name"
              maxLength={255}
              className="w-full border border-transparent bg-transparent px-[13px] py-[5px] text-[28px] font-bold leading-9 tracking-[-0.7px] text-ink outline-none transition-colors focus:border-line"
            />
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add an optional description"
            rows={3}
            maxLength={5000}
            className="mb-5 w-full resize-none border border-line/60 bg-sunken/70 px-[13px] py-[13px] text-[14px] leading-5 text-ink outline-none placeholder:text-muted/70 focus:border-primary/50"
          />

          <div className="mb-6 flex flex-col gap-2">
            {STATUS_OPTIONS.map(({ key, label, hint, icon: Icon }) => (
              <button
                key={key}
                type="button"
                aria-pressed={status === key}
                onClick={() => setStatus(key)}
                className={cx(
                  'flex items-center gap-3 border px-4 py-3 text-left transition-colors',
                  status === key ? 'border-primary bg-primary/10' : 'border-line/60 bg-card hover:border-muted',
                )}
              >
                <Icon className={cx('size-4 shrink-0', status === key ? 'text-primary' : 'text-muted')} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold leading-5 text-ink">{label}</span>
                  <span className="block pt-0.5 text-[12px] leading-4 text-muted">{hint}</span>
                </span>
                {status === key && <Check className="size-4 shrink-0 text-primary" strokeWidth={3} />}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-line/40 pt-[17px]">
            <button
              type="button"
              onClick={onClose}
              className="border border-line px-[17px] py-[9px] text-[12px] font-semibold uppercase leading-4 tracking-[0.6px] text-muted transition-colors hover:border-muted hover:text-ink"
            >
              DISCARD
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="bg-primary px-6 py-2 text-[12px] font-bold uppercase leading-4 tracking-[0.6px] text-on-primary transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? 'SAVING...' : 'CREATE PLAYLIST'}
            </button>
          </div>
          {error && <p role="alert" className="pt-3 text-right text-[12px] text-primary-soft">{error}</p>}
        </div>
      </div>
    </div>
  );
}
