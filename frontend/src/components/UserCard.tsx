import { Link } from 'react-router-dom';
import { User as UserIcon } from 'lucide-react';
import { cx, initialsOf } from '../lib/utils';
import type { BackendUser } from '../types';

interface UserCardProps {
  user: BackendUser;
}

/** Clickable person row used in search results and follower/following lists. */
export default function UserCard({ user }: UserCardProps) {
  return (
    <Link
      to={`/users/${user.id}`}
      className="flex items-center gap-3 border border-line/50 bg-sunken/60 px-4 py-3 transition-colors hover:border-primary/50 hover:bg-card/60"
    >
      <div
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center border border-primary-soft/30 bg-primary-soft/20 text-[13px] font-bold text-primary-soft"
      >
        {user.name ? (
          <span>{initialsOf(user.name)}</span>
        ) : (
          <UserIcon className="size-4" strokeWidth={2} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cx('truncate text-[14px] font-medium leading-5 text-ink')}>{user.name}</p>
        <p className="truncate text-[12px] leading-4 text-muted">@{user.username}</p>
      </div>
      <span className="shrink-0 text-[12px] font-medium text-muted transition-colors hover:text-primary">
        View profile
      </span>
    </Link>
  );
}
