import { Home, Search, Library, Heart, Plus, Settings, LogOut, User } from 'lucide-react';
import { cx } from '../lib/utils';
import { usePlayer } from '../context/PlayerContext';
import PlaylistCover from './PlaylistCover';
import type { AppUser, AppView, Playlist } from '../types';

interface SidebarProps {
  navLabel?: string;
  view: AppView;
  playlists: Playlist[];
  activePlaylistId: string | null;
  user: AppUser;
  footerHeight: number;
  onNavigate: (target: 'home' | 'search' | 'library' | 'liked-songs') => void;
  onOpenPlaylist: (id: string) => void;
  onOpenProfile: (id: number) => void;
  onCreatePlaylist: () => void;
  onLogout: () => void;
}

/** Sidebar kiri. */
export default function Sidebar({
  navLabel = 'MENU',
  view,
  playlists,
  activePlaylistId,
  user,
  footerHeight,
  onNavigate,
  onOpenPlaylist,
  onOpenProfile,
  onCreatePlaylist,
  onLogout,
}: SidebarProps) {
  const { tracksOf } = usePlayer();

  const navItems = [
    { key: 'home', label: 'Home', icon: Home, target: 'home' },
    { key: 'search', label: 'Search', icon: Search, target: 'search' },
    { key: 'library', label: 'Your Library', icon: Library, target: 'library' },
    { key: 'liked-songs', label: 'Liked Songs', icon: Heart, target: 'liked-songs' },
  ] as const;

  return (
    <aside
      className="fixed left-0 top-0 z-30 flex w-64 flex-col border-r border-line/60 bg-sunken"
      style={{ bottom: footerHeight }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-line/40 px-6">
          <div className="flex size-8 items-center justify-center bg-primary text-[14px] font-bold text-on-primary">M</div>
          <span className="text-[16px] font-bold leading-6 tracking-[0.4px] text-ink">Melodi</span>
        </div>

        {/* Navigation */}
        <div className="shrink-0 px-4 pb-4 pt-[15px]">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase leading-[16.5px] tracking-[0.55px] text-muted/80">
            {navLabel}
          </p>
          <nav className="flex flex-col gap-1">
            {navItems.map(({ key, label, icon: Icon, target }) => {
              const active = view === target && !activePlaylistId;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onNavigate(target)}
                  className={cx(
                    'flex w-full items-center gap-3 px-3 py-2 text-left text-[14px] leading-5 transition-colors',
                    active ? 'bg-card font-semibold text-primary' : 'font-medium text-dim hover:bg-card/60',
                  )}
                >
                  <Icon className="size-[15px] shrink-0" strokeWidth={2} />
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Playlists */}
        <div className="flex shrink-0 flex-col gap-2 px-4 py-2">
          <div className="flex items-center justify-between px-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.55px] text-muted/80">YOUR PLAYLISTS</span>
            <button
              type="button"
              onClick={onCreatePlaylist}
              aria-label="Create playlist"
              className="flex size-6 items-center justify-center text-muted"
            >
              <Plus className="size-[10.5px]" strokeWidth={2.5} />
            </button>
          </div>

          <nav className="flex flex-col gap-1 pb-1">
            {playlists.map((p) => {
              const active = p.id === activePlaylistId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onOpenPlaylist(p.id)}
                  className={cx(
                    'flex w-full items-center gap-2 overflow-hidden px-3 py-2 text-left text-[14px] leading-5 transition-colors',
                    active ? 'font-medium text-primary' : 'text-dim hover:text-ink',
                  )}
                >
                  <PlaylistCover tracks={tracksOf(p.trackIds).slice(0, 4)} className="size-7 shrink-0 border border-line/40" iconClassName="size-2.5 text-muted" />
                  {active && <span className="size-[6px] shrink-0 bg-primary" />}
                  <span className="truncate">{p.name}</span>
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={onCreatePlaylist}
            className="flex w-[215px] items-center justify-center gap-2 border border-dashed border-line px-px py-[7px] text-[12px] font-medium text-muted transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="size-[9.3px]" strokeWidth={3} />
            Create Playlist
          </button>
        </div>
      </div>

      {/* Profile */}
      <div className="shrink-0 border-t border-line/40 bg-sunken px-4 pb-4 pt-[17px]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (user.id != null) onOpenProfile(user.id);
            }}
            disabled={user.id == null}
            title={user.id != null ? 'Open your profile' : undefined}
            className="flex min-w-0 items-center gap-3 text-left transition-colors hover:opacity-80 disabled:cursor-default disabled:opacity-100"
          >
            <div className="flex size-8 items-center justify-center border border-primary-soft/30 bg-primary-soft/20 text-primary-soft">
              <User className="size-[13px]" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="-mt-px truncate text-[14px] font-medium leading-[17.5px] text-ink">{user.name}</p>
              {user.username && <p className="truncate text-[11px] leading-4 text-muted">@{user.username}</p>}
            </div>
          </button>
          <div className="flex items-center gap-1 text-muted">
            <button type="button" aria-label="Settings" className="p-[6px] hover:text-primary">
              <Settings className="size-[13.5px]" />
            </button>
            <button type="button" aria-label="Log out" onClick={onLogout} className="p-[6px] hover:text-primary">
              <LogOut className="size-[13.5px]" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
