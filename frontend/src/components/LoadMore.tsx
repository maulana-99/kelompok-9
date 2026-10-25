import { cx } from '../lib/utils';

interface LoadMoreProps {
  pending: boolean;
  onClick: () => void;
  label?: string;
}

/** Centered "Muat lebih banyak" button used by paginated lists. */
export default function LoadMore({ pending, onClick, label = 'Muat lebih banyak' }: LoadMoreProps) {
  return (
    <div className="flex justify-center pt-4">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={cx(
          'h-9 border border-line/60 bg-card px-4 text-[13px] font-medium leading-5 text-dim transition-colors hover:border-primary/50 hover:text-ink',
          pending && 'cursor-wait opacity-60',
        )}
      >
        {pending ? 'Memuat...' : label}
      </button>
    </div>
  );
}
