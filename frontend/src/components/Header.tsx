import { ChevronLeft, ChevronRight, Search, X, Download } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../lib/utils';

interface HeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
  onBack: () => void;
  onForward: () => void;
  canBack: boolean;
  canForward: boolean;
  rightSlot?: ReactNode;
  autoFocus?: boolean;
}

/** Top header: tombol back/forward + search bar + aksi kanan. */
export default function Header({
  query,
  onQueryChange,
  onBack,
  onForward,
  canBack,
  canForward,
  rightSlot,
  autoFocus = false,
}: HeaderProps) {
  return (
    <header className="fixed left-64 right-0 top-0 z-20 flex h-16 items-center gap-4 border-b border-line/40 bg-base/80 px-8 pb-px backdrop-blur-[12px]">
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
              'flex size-8 items-center justify-center bg-card text-dim transition-colors disabled:opacity-50',
              enabled && 'hover:text-primary',
            )}
          >
            <Icon className="size-3" strokeWidth={2.5} />
          </button>
        ))}
      </div>

      <div className="relative min-w-0 max-w-[448px] flex-1">
        <Search className="pointer-events-none absolute left-[14px] top-1/2 size-[13.5px] -translate-y-1/2 text-muted" strokeWidth={2.2} />
        <input
          type="text"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="What do you want to play?"
          className="h-10 w-full border border-line/50 bg-card pl-[41px] pr-9 text-[14px] text-ink outline-none transition-colors placeholder:text-muted focus:border-primary/60"
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
            className="flex size-9 items-center justify-center border border-line/60 bg-line text-dim hover:text-primary"
          >
            <Download className="size-[13.3px]" strokeWidth={2} />
          </button>
        )}
      </div>
    </header>
  );
}
