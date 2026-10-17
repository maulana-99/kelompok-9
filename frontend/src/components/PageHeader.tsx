import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  /** Makes the eyebrow a link (e.g. back to Explore). */
  eyebrowTo?: string;
  /** Color of the small square next to the eyebrow; defaults to primary. */
  accent?: string;
  /** Actions on the right (buttons). */
  children?: ReactNode;
}

/** Judul halaman: label kecil + judul besar + keterangan, dipakai di semua halaman utama. */
export default function PageHeader({ eyebrow, title, subtitle, eyebrowTo, accent, children }: PageHeaderProps) {
  const label = (
    <>
      <span className="size-2 shrink-0 bg-primary" style={accent ? { backgroundColor: accent } : undefined} />
      {eyebrow}
    </>
  );
  const labelClass = 'flex w-fit items-center gap-2 pb-2 text-[12px] font-semibold uppercase leading-4 tracking-[1.2px] text-primary-soft';

  return (
    <header className="flex flex-col gap-6 border-b border-line/40 pb-6 sm:flex-row sm:items-end sm:justify-between sm:pb-8">
      <div className="min-w-0">
        {eyebrowTo ? (
          <Link to={eyebrowTo} className={`${labelClass} transition-colors hover:text-primary`}>
            {label}
          </Link>
        ) : (
          <p className={labelClass}>{label}</p>
        )}
        <h1 className="break-words text-[28px] font-bold leading-9 tracking-[-0.8px] text-ink sm:text-[38px] sm:leading-[44px]">{title}</h1>
        {subtitle && <p className="pt-2 text-[14px] leading-5 text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-3">{children}</div>}
    </header>
  );
}
