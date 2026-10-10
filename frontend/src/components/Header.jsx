import { ChevronLeft, ChevronRight, Search, X, Download } from 'lucide-react';
import { cx } from '../lib/utils';

/** Top header: tombol back/forward + search bar + aksi kanan. */
export default function Header({
  variant = 'base',
  query,
  onQueryChange,
  onBack,
  onForward,
  canBack,
  canForward,
  rightSlot,
  autoFocus = false,
}) {
  const dash = variant === 'dash';

  return (
    <header
      className={cx(
        'fixed left-64 right-0 top-0 z-20 flex h-16 items-center gap-4 border-b px-8 pb-px backdrop-blur-[12px]',
        dash ? 'border-dash-line/50 bg-dash-bg/80' : 'border-line/40 bg-base/80',
      )}
    >
      <div className="flex items-center gap-[6px]">
        {[
          { icon: ChevronLeft, label: 'Back', onClick: onBack, enabled: canBack },
          { icon: ChevronRight, label: 'Forward', onClick: onForward, enabled: canForward },
        ].map(({ icon: Icon, label, onClick, enabled }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            onClick={onClick}
            disabled={!enabled}
            className={cx(
              'flex size-8 items-center justify-center text-dim transition-colors disabled:opacity-50',
              dash ? 'bg-dash-card text-dash-dim' : 'bg-card',
              enabled && 'hover:text-primary',
            )}
          >
            <Icon className="size-3" strokeWidth={2.5} />
          </button>
        ))}
      </div>

      <div className="relative min-w-0 max-w-[448px] flex-1">
        <Search
          className={cx(
            'pointer-events-none absolute left-[14px] top-1/2 size-[13.5px] -translate-y-1/2',
            dash ? 'text-dash-muted' : 'text-muted',
          )}
          strokeWidth={2.2}
        />
        <input
          type="text"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="What do you want to play?"
          className={cx(
            'w-full border pl-[41px] pr-9 text-[14px] outline-none transition-colors focus:border-primary/60',
            dash
              ? 'h-9 border-dash-line bg-dash-hover text-dash-ink placeholder:text-dash-muted'
              : 'h-10 border-line/50 bg-card text-ink placeholder:text-muted',
          )}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onQueryChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink"
          >
            <X className="size-[10px]" strokeWidth={3} />
          </button>
        )}
      </div>

      <div className="ml-auto flex items-center gap-4">
        {rightSlot ?? (
          <button
            type="button"
            aria-label="Install app"
            className={cx(
              'flex items-center justify-center text-dim hover:text-primary',
              dash ? 'size-8 bg-dash-line text-dash-dim' : 'size-9 border border-line/60 bg-line',
            )}
          >
            <Download className="size-[13.3px]" strokeWidth={2} />
          </button>
        )}
      </div>
    </header>
  );
}
