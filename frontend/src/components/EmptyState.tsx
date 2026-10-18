import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: { label: string; onClick: () => void };
}

/** Kotak kosong bergaris putus-putus untuk daftar yang belum ada isinya. */
export default function EmptyState({ icon: Icon, title, text, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center border border-dashed border-line/60 bg-card/30 px-6 py-10 text-center">
      <div className="mb-4 flex size-12 items-center justify-center border border-line/60 bg-line text-primary">
        <Icon className="size-5" strokeWidth={2} />
      </div>
      <p className="text-[14px] font-semibold leading-5 text-ink">{title}</p>
      {text && <p className="max-w-[420px] pt-1 text-[13px] leading-5 text-muted">{text}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 bg-primary px-5 py-2 text-[12px] font-bold uppercase tracking-[0.6px] text-on-primary transition hover:brightness-110"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
