import { cx } from '../lib/utils';

/** Judul section (mis. "Recently Played" + link "See all"). */
export default function SectionHeading({ title, action, onAction, variant = 'dash', className = '', children }) {
  const dash = variant === 'dash';
  return (
    <div className={cx('flex items-center justify-between pb-4', className)}>
      <h2
        className={cx(
          dash
            ? 'text-[20px] font-bold leading-7 tracking-[-0.5px] text-dash-ink'
            : 'text-[14px] font-bold uppercase leading-5 tracking-[0.35px] text-ink',
        )}
      >
        {title}
      </h2>
      {children}
      {action && (
        <button
          type="button"
          onClick={onAction}
          className={cx(
            'transition-colors hover:text-primary',
            dash ? 'text-[12px] font-semibold leading-4 text-dash-muted' : 'text-[12px] font-semibold uppercase tracking-[0.6px] text-primary-soft',
          )}
        >
          {action}
        </button>
      )}
    </div>
  );
}
