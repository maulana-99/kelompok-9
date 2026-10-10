import { cx } from '../lib/utils';

/** Bar animasi "sedang diputar" (3 batang), seperti di desain. */
export default function Equalizer({ playing = true, className = '', barClass = 'bg-primary' }) {
  const heights = ['h-[12px]', 'h-[8px]', 'h-[12px]'];
  return (
    <div className={cx('flex items-end gap-[3px] h-[12px]', className)} aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={i}
          className={cx('w-[3px]', h, barClass, playing && 'eq-bar')}
          style={playing ? { animationDelay: `${i * 0.18}s` } : undefined}
        />
      ))}
    </div>
  );
}
