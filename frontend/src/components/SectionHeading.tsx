import { cx } from '../lib/utils';
import type { ReactNode } from 'react';

interface SectionHeadingProps {
  title: string;
  action?: string;
  onAction?: () => void;
  className?: string;
  children?: ReactNode;
}

/** Judul section (mis. "Recently Played"). */
export default function SectionHeading({ title, action, onAction, className = '', children }: SectionHeadingProps) {
  return (
    <div className={cx('flex items-center justify-between pb-4', className)}>
      <h2 className="text-[14px] font-bold uppercase leading-5 tracking-[0.35px] text-ink">{title}</h2>
      {children}
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="text-[12px] font-semibold uppercase tracking-[0.6px] text-primary-soft transition-colors hover:text-primary"
        >
          {action}
        </button>
      )}
    </div>
  );
}
