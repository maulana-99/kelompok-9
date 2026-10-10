import { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, ImagePlus, ListMusic, Search, Check } from 'lucide-react';
import { cx, initialsOf, toClock, toSeconds, toDurationLabel } from '../lib/utils';
import { tracks as allTracks } from '../data/mock';

const COLS = 'grid grid-cols-12 items-center';

/**
 * Create Playlist sebagai modal overlay.
 * Isi mengikuti frame "Create Playlist": header form, empty state + search, dan daftar Recommended.
 */
export default function ModalCreatePlaylist({ onClose, onCreate }) {
  const [name, setName] = useState('New Playlist');
  const [description, setDescription] = useState('');
  const [cover, setCover] = useState(null);
  const [query, setQuery] = useState('');
  const [addedIds, setAddedIds] = useState([]);
  const fileRef = useRef(null);
  const panelRef = useRef(null);

  // Tutup dengan Esc + kunci scroll body
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => () => cover && URL.revokeObjectURL(cover), [cover]);

  const recommended = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = allTracks.slice(0, 5);
    if (!q) return pool;
    return allTracks.filter((t) => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(q));
  }, [query]);

  const addedTracks = allTracks.filter((t) => addedIds.includes(t.id));
  const totalSeconds = addedTracks.reduce((sum, t) => sum + toSeconds(t.duration), 0);

  const toggle = (id) => setAddedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (cover) URL.revokeObjectURL(cover);
    setCover(URL.createObjectURL(file));
  };

  const submit = () =>
    onCreate({
      name: name.trim() || 'New Playlist',
      description: description.trim(),
      trackIds: addedIds,
      cover,
    });

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
        className="w-full max-w-[1000px] border border-line/60 bg-base shadow-card outline-none"
      >
        <div className="flex flex-col gap-10 p-8">
          {/* Header form */}
          <section className="flex flex-col gap-6 border border-line/50 bg-card p-[33px] sm:flex-row sm:items-end">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative flex size-[192px] shrink-0 flex-col items-center justify-center overflow-hidden border border-line bg-sunken p-px transition-colors hover:border-primary/60"
            >
              {cover ? (
                <img src={cover} alt="Playlist cover" className="absolute inset-0 size-full object-cover" />
              ) : (
                <>
                  <ImagePlus className="size-12 text-muted" strokeWidth={1.2} />
                  <span className="pt-2 text-[12px] font-medium leading-4 text-muted">Choose photo</span>
                </>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

            <div className="flex min-w-0 flex-1 flex-col self-stretch">
              <p className="pb-2 text-[12px] font-semibold uppercase leading-4 tracking-[0.6px] text-muted">PLAYLIST</p>

              <div className="relative pb-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-label="Playlist name"
                  className="w-full border border-transparent bg-transparent px-[13px] py-[5px] pr-9 text-[36px] font-bold leading-10 tracking-[-0.9px] text-ink outline-none transition-colors focus:border-line"
                />
                <Pencil className="pointer-events-none absolute right-2 top-[15px] size-[15px] text-muted" />
              </div>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add an optional description"
                rows={2}
                className="mb-[26px] w-full resize-none border border-line/60 bg-sunken/70 px-[13px] pb-[33px] pt-[13px] text-[14px] leading-5 text-ink outline-none placeholder:text-muted/70 focus:border-primary/50"
              />

              <div className="mt-auto flex items-center justify-between border-t border-line/40 pt-[17px]">
                <div className="flex items-center gap-2 text-[12px] leading-4">
                  <span className="font-medium text-ink">
                    {addedTracks.length} {addedTracks.length === 1 ? 'song' : 'songs'}
                  </span>
                  <span className="text-muted">•</span>
                  <span className="text-muted">{totalSeconds ? toDurationLabel(totalSeconds) : '0 min'}</span>
                </div>
                <div className="flex items-center gap-3">
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
                    className="bg-primary px-6 py-2 text-[12px] font-bold uppercase leading-4 tracking-[0.6px] text-on-primary transition hover:brightness-110"
                  >
                    CREATE PLAYLIST
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Empty state + search */}
          <section className="flex flex-col gap-6">
            <div className="flex flex-col items-center border border-line/50 bg-sunken p-[33px]">
              <div className="mb-3 flex size-12 items-center justify-center bg-line">
                <ListMusic className="h-[14px] w-[19px] text-muted" strokeWidth={2.2} />
              </div>
              <h3 className="text-center text-[18px] font-bold leading-7 tracking-[-0.45px] text-ink">
                Let&apos;s find something for your playlist
              </h3>
              <p className="pb-5 pt-1 text-center text-[12px] leading-4 text-muted">
                Search for songs or artists, or pick from recommendations below
              </p>
              <div className="relative w-full max-w-[512px]">
                <Search className="pointer-events-none absolute left-[14px] top-1/2 size-[13.5px] -translate-y-1/2 text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for songs or artists..."
                  className="h-10 w-full border border-line bg-raised pl-[41px] pr-[17px] text-[12px] text-ink outline-none placeholder:text-muted focus:border-primary/60"
                />
              </div>
            </div>

            {/* Recommended */}
            <div>
              <div className="flex items-center justify-between pb-3">
                <h4 className="text-[14px] font-bold uppercase leading-5 tracking-[0.35px] text-ink">
                  {query ? 'RESULTS' : 'RECOMMENDED'}
                </h4>
                <span className="text-[12px] leading-4 text-muted">{query ? `${recommended.length} found` : 'Based on your activity'}</span>
              </div>

              <div className="border border-line/50 bg-sunken p-px">
                <div className={cx(COLS, 'border-b border-line/40 bg-card px-4 pb-[11px] pt-[10px] text-[11px] font-semibold uppercase leading-[16.5px] tracking-[0.55px] text-muted')}>
                  <span className="col-span-1">#</span>
                  <span className="col-span-5 col-start-2">TITLE</span>
                  <span className="col-span-4 col-start-7">ALBUM</span>
                  <span className="col-start-11">DURATION</span>
                </div>

                {recommended.length === 0 && (
                  <p className="px-4 py-8 text-center text-[12px] text-muted">No songs match &ldquo;{query}&rdquo;.</p>
                )}

                {recommended.map((t, i) => {
                  const added = addedIds.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      className={cx(COLS, 'h-[61px] px-4 transition-colors hover:bg-card/50', i < recommended.length - 1 && 'border-b border-line/20')}
                    >
                      <span className="col-span-1 text-[12px] leading-4 text-muted">{i + 1}</span>
                      <div className="col-span-5 col-start-2 flex min-w-0 items-center gap-3 pr-2">
                        <div className="flex size-8 shrink-0 items-center justify-center bg-line text-[12px] font-semibold leading-4 text-muted">
                          {initialsOf(t.artist)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium leading-5 text-ink">{t.title}</p>
                          <p className="truncate text-[12px] leading-4 text-muted">{t.artist}</p>
                        </div>
                      </div>
                      <p className="col-span-4 col-start-7 truncate pr-2 text-[12px] leading-4 text-muted">{t.album}</p>
                      <p className="col-start-11 text-[12px] leading-4 text-muted">{t.duration}</p>
                      <div className="col-start-12 flex justify-end">
                        <button
                          type="button"
                          onClick={() => toggle(t.id)}
                          className={cx(
                            'flex items-center gap-1 border px-[11px] py-[5px] text-[12px] font-medium leading-4 transition-colors',
                            added ? 'border-primary text-primary' : 'border-line text-ink hover:border-muted',
                          )}
                        >
                          {added ? <Check className="size-3" strokeWidth={3} /> : '+'} {added ? 'Added' : 'Add'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
