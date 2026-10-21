import { useState } from 'react';
import { Music } from 'lucide-react';
import { cx } from '../lib/utils';
import { largeThumb, thumbUrl } from '../lib/music';
import type { Track } from '../types';

interface TrackThumbProps {
  track: Track | null | undefined;
  /** Ukuran & warna kotak, contoh: `size-9 border-line/60 bg-line`. */
  className?: string;
  /** Ikon fallback kalau thumbnail tidak ada atau gagal dimuat. */
  iconClassName?: string;
  /** Minta versi resolusi besar (artwork halaman pemutar). */
  large?: boolean;
}

/** Artwork lagu (di-proxy lewat backend). Kalau tidak ada, tampilkan ikon musik. */
export default function TrackThumb({
  track,
  className = '',
  iconClassName = 'size-[13px] text-muted',
  large = false,
}: TrackThumbProps) {
  const [failed, setFailed] = useState(false);
  const raw = track?.thumbnail && !failed ? track.thumbnail : '';
  const src = raw ? thumbUrl(large ? largeThumb(raw) : raw) : '';

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
      loading={large ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      className={cx('shrink-0 border object-cover', className)}
    />
  );
}
