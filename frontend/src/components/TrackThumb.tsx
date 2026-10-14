import { useState } from 'react';
import { Music } from 'lucide-react';
import { cx } from '../lib/utils';
import { thumbUrl } from '../lib/music';
import type { Track } from '../types';

interface TrackThumbProps {
  track: Track | null | undefined;
  /** Ukuran & warna kotak, contoh: `size-9 border-line/60 bg-line`. */
  className?: string;
  /** Ikon fallback kalau thumbnail tidak ada atau gagal dimuat. */
  iconClassName?: string;
}

/** Artwork lagu (di-proxy lewat backend). Kalau tidak ada, tampilkan ikon musik. */
export default function TrackThumb({
  track,
  className = '',
  iconClassName = 'size-[13px] text-muted',
}: TrackThumbProps) {
  const [failed, setFailed] = useState(false);
  const src = track?.thumbnail && !failed ? thumbUrl(track.thumbnail) : '';

  if (!src) {
    return (
      <div className={cx('flex shrink-0 items-center justify-center border', className)}>
        <Music className={iconClassName} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={cx('shrink-0 border object-cover', className)}
    />
  );
}
