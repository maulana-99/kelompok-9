import { useState } from 'react';
import { ListMusic } from 'lucide-react';
import { cx } from '../lib/utils';
import { thumbUrl } from '../lib/music';
import type { Track } from '../types';

interface CoverCellProps {
  track?: Track;
}

// Satu petak mosaiik; kalau thumbnail kosong/gagal, petak jadi tone polos.
function CoverCell({ track }: CoverCellProps) {
  const [failed, setFailed] = useState(false);
  const src = track?.thumbnail && !failed ? thumbUrl(track.thumbnail) : '';

  if (!src) return <div className="size-full bg-line" />;

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-full object-cover"
    />
  );
}

interface PlaylistCoverProps {
  /** Lagu playlist (sudah hydrate); cover memakai 4 lagu pertama. */
  tracks: Track[];
  /** Ukuran & warna kotak, contoh: `size-12 border-line/40`. */
  className?: string;
  /** Ikon fallback saat playlist masih kosong. */
  iconClassName?: string;
}

/**
 * Cover playlist tanpa upload gambar: mosaiik 2x2 dari thumbnail 4 lagu
 * pertama. Playlist tanpa lagu jatuh ke ikon.
 */
export default function PlaylistCover({ tracks, className = '', iconClassName = 'size-5 text-muted' }: PlaylistCoverProps) {
  const shown = tracks.slice(0, 4);

  if (shown.length === 0) {
    return (
      <div className={cx('flex items-center justify-center overflow-hidden bg-gradient-to-br from-card to-sunken', className)}>
        <ListMusic className={iconClassName} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className={cx('grid grid-cols-2 grid-rows-2 overflow-hidden bg-sunken', className)}>
      {[0, 1, 2, 3].map((i) => (
        <CoverCell key={i} track={shown[i]} />
      ))}
    </div>
  );
}
