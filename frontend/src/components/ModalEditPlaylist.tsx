import { useEffect, useRef, useState } from 'react';
import type { UpdatePlaylistInput } from '../types';

interface ModalEditPlaylistProps {
  initialName: string;
  initialDescription: string;
  onClose: () => void;
  /** Throw -> pesan error ditampilkan di dalam modal (sama seperti create). */
  onSave: (input: UpdatePlaylistInput) => Promise<void>;
}

/** Edit Playlist (nama + deskripsi) — mengikuti pola ModalCreatePlaylist. */
export default function ModalEditPlaylist({
  initialName,
  initialDescription,
  onClose,
  onSave,
}: ModalEditPlaylistProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
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

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const changed = trimmedName !== initialName.trim() || trimmedDescription !== initialDescription.trim();
  const invalid = trimmedName.length === 0;

  const submit = async () => {
    if (invalid || !changed) return;
    setError('');
    setSubmitting(true);
    try {
      await onSave({ title: trimmedName, description: trimmedDescription });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save playlist.');
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
        aria-label="Edit playlist"
        tabIndex={-1}
        className="w-full max-w-[520px] border border-line/60 bg-base shadow-card outline-none"
      >
        <div className="flex flex-col p-8">
          <p className="pb-2 text-[12px] font-semibold uppercase leading-4 tracking-[0.6px] text-muted">
            EDIT PLAYLIST
          </p>

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

          <div className="flex items-center justify-end gap-3 border-t border-line/40 pt-[17px]">
            <button
              type="button"
              onClick={onClose}
              className="border border-line px-[17px] py-[9px] text-[12px] font-semibold uppercase leading-4 tracking-[0.6px] text-muted transition-colors hover:border-muted hover:text-ink"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || invalid || !changed}
              className="bg-primary px-6 py-2 text-[12px] font-bold uppercase leading-4 tracking-[0.6px] text-on-primary transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
          </div>
          {invalid && (
            <p role="alert" className="pt-3 text-right text-[12px] text-primary-soft">
              Nama playlist tidak boleh kosong.
            </p>
          )}
          {error && (
            <p role="alert" className="pt-3 text-right text-[12px] text-primary-soft">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
