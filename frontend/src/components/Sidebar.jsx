import { Home, Search, Library, History, Plus, Users, Settings, LogOut, User } from 'lucide-react';
import { cx } from '../lib/utils';
import { friendActivity } from '../data/mock';

/**
 * Sidebar kiri. `variant="dash"` = palet frame Home/Dashboard,
 * `variant="base"` = palet frame lain (Search, Playlist, Create Playlist).
 */
export default function Sidebar({
  variant = 'base',
  navLabel = 'MENU',
  view,
  playlists,
  activePlaylistId,
  user,
  footerHeight,
  onNavigate,
  onOpenPlaylist,
  onCreatePlaylist,
  onLogout,
}) {
  const dash = variant === 'dash';

  const navItems = [
    { key: 'home', label: 'Home', icon: Home, target: 'home' },
    { key: 'search', label: 'Search', icon: Search, target: 'search' },
    { key: 'library', label: 'Your Library', icon: Library, target: null },
    { key: 'history', label: 'History', icon: History, target: null },
  ];

  const sectionLabel = dash
    ? 'text-[12px] font-semibold text-dash-muted'
    : 'text-[11px] font-semibold uppercase tracking-[0.55px] text-muted/80';

  return (
    <aside
      className={cx(
        'fixed left-0 top-0 z-30 flex w-64 flex-col border-r',
        dash ? 'bg-dash-side border-dash-line/60' : 'bg-sunken border-line/60',
      )}
      style={{ bottom: footerHeight }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Brand */}
        <div
          className={cx(
            'flex shrink-0 items-center gap-3 px-6',
            dash ? 'h-8 mt-0' : 'h-16 border-b border-line/40',
          )}
        >
          <div
            className={cx(
              'flex size-8 items-center justify-center text-[14px] font-bold',
              dash ? 'bg-primary text-dash-on-primary' : 'bg-primary text-on-primary',
            )}
          >
            M
          </div>
          <span
            className={cx(
              'font-bold',
              dash ? 'text-[18px] leading-7 tracking-[-0.45px] text-dash-ink' : 'text-[16px] leading-6 tracking-[0.4px] text-ink',
            )}
          >
            Melodi
          </span>
        </div>

        {/* Navigation */}
        <div className={cx('shrink-0 px-4', dash ? 'py-3' : 'pb-4 pt-[15px]')}>
          {!dash && (
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase leading-[16.5px] tracking-[0.55px] text-muted/80">
              {navLabel}
            </p>
          )}
          <nav className={cx('flex flex-col gap-1', dash && 'mt-0')}>
            {navItems.map(({ key, label, icon: Icon, target }) => {
              const active = view === target && target !== null && !activePlaylistId;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => target && onNavigate(target)}
                  className={cx(
                    'flex w-full items-center text-left text-[14px] leading-5 transition-colors',
                    dash ? 'gap-[14px] px-[14px] py-[10px]' : 'gap-3 px-3 py-2',
                    active
                      ? dash
                        ? 'bg-dash-hover font-semibold text-primary'
                        : 'bg-card font-semibold text-primary'
                      : dash
                        ? 'font-medium text-dash-dim hover:bg-dash-hover/60'
                        : 'font-medium text-dim hover:bg-card/60',
                  )}
                >
                  <Icon className={cx('shrink-0', dash ? 'size-[15px]' : 'size-[15px]')} strokeWidth={2} />
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Playlists */}
        <div className="flex shrink-0 flex-col gap-2 px-4 py-2">
          <div className="flex items-center justify-between px-3">
            <span className={sectionLabel}>{dash ? 'Your Playlists' : 'YOUR PLAYLISTS'}</span>
            <button
              type="button"
              onClick={onCreatePlaylist}
              aria-label="Create playlist"
              className={cx('flex size-6 items-center justify-center', dash ? 'text-dash-muted' : 'text-muted')}
            >
              <Plus className="size-[10.5px]" strokeWidth={2.5} />
            </button>
          </div>

          <nav className={cx('flex flex-col pb-1', dash ? 'gap-[2px] pb-2' : 'gap-1')}>
            {playlists.map((p) => {
              const active = p.id === activePlaylistId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onOpenPlaylist(p.id)}
                  className={cx(
                    'flex w-full items-center gap-2 overflow-hidden px-3 text-left text-[14px] leading-5 transition-colors',
                    dash ? 'py-[6px]' : 'py-2',
                    active
                      ? 'font-medium text-primary'
                      : dash
                        ? 'text-dash-dim hover:text-dash-ink'
                        : 'text-dim hover:text-ink',
                  )}
                >
                  {active && <span className="size-[6px] shrink-0 bg-primary" />}
                  <span className="truncate">{p.name}</span>
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={onCreatePlaylist}
            className={cx(
              'flex w-[215px] items-center justify-center gap-2 border px-px',
              dash
                ? 'border-dash-line py-[9px] text-[12px] font-semibold text-dash-muted'
                : 'border-dashed border-line py-[7px] text-[12px] font-medium text-muted',
              'transition-colors hover:border-primary hover:text-primary',
            )}
          >
            <Plus className="size-[9.3px]" strokeWidth={3} />
            Create Playlist
          </button>
        </div>

        {/* Friend activity */}
        <div className={cx('mt-3 shrink-0', dash ? 'border-t border-dash-line/40 px-4 pb-3 pt-[13px]' : 'border-t border-line/40 px-4 pb-4 pt-[33px]')}>
          <div className={cx('flex items-center justify-between', dash ? 'px-1 pb-[14px]' : 'px-3 pb-2')}>
            <span
              className={cx(
                'uppercase',
                dash
                  ? 'text-[11px] font-bold leading-[16.5px] tracking-[0.55px] text-dash-muted'
                  : 'text-[11px] font-semibold leading-[16.5px] tracking-[0.55px] text-muted/80',
              )}
            >
              FRIEND ACTIVITY
            </span>
            {dash ? (
              <Users className="size-[14.6px] text-dash-muted" strokeWidth={2} />
            ) : (
              <span className="size-2 bg-primary" />
            )}
          </div>

          <div className={cx('flex flex-col gap-2', !dash && 'px-2')}>
            {friendActivity.map((f) => (
              <div key={f.id} className={cx('flex items-start gap-[10px]', dash ? 'p-[6px]' : 'items-center py-1')}>
                <div
                  className={cx(
                    'flex size-7 shrink-0 items-center justify-center border text-[12px] font-bold',
                    dash ? 'border-dash-line bg-dash-line' : 'border-line/60 bg-line',
                    f.highlight ? (dash ? 'text-primary' : 'text-primary-soft') : dash ? 'text-dash-ink' : 'text-ink',
                  )}
                >
                  {f.initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={cx('text-[12px] leading-4', dash ? 'font-semibold text-dash-ink' : 'font-medium text-ink')}>
                      {f.name}
                    </span>
                    {dash && f.live ? (
                      <span className="flex items-center gap-[2px] text-[10px] font-medium leading-[15px] text-primary">
                        <span className="flex h-[10px] items-end gap-[1px]">
                          <i className="h-[6px] w-[2px] bg-primary" />
                          <i className="h-[10px] w-[2px] bg-primary" />
                          <i className="h-[4px] w-[2px] bg-primary" />
                        </span>
                        LIVE
                      </span>
                    ) : (
                      <span className={cx('text-[10px] leading-[15px]', dash ? 'text-dash-muted' : f.time === 'Now' ? 'text-primary-soft' : 'text-muted')}>
                        {f.time}
                      </span>
                    )}
                  </div>
                  <p className={cx('truncate', dash ? 'text-[11px] leading-[16.5px] text-dash-muted' : 'text-[10px] leading-[15px] text-muted')}>
                    {dash ? `${f.artist} — ${f.track}` : `${f.track} • ${f.artist}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profile */}
      <div
        className={cx(
          'shrink-0 border-t px-4 pb-4 pt-[17px]',
          dash ? 'border-dash-line/60 bg-dash-side' : 'border-line/40 bg-sunken',
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cx(
                'flex items-center justify-center',
                dash
                  ? 'size-9 bg-dash-line text-dash-dim'
                  : 'size-8 border border-primary-soft/30 bg-primary-soft/20 text-primary-soft',
              )}
            >
              <User className="size-[13px]" strokeWidth={2} />
            </div>
            <div>
              <p className={cx('-mt-px text-[14px] leading-[17.5px]', dash ? 'font-semibold text-dash-ink' : 'font-medium text-ink')}>
                {user.name}
              </p>
              <p className={cx('text-[12px] leading-4', dash ? 'text-dash-muted' : 'text-muted')}>
                {dash ? user.handle : user.plan}
              </p>
            </div>
          </div>
          <div className={cx('flex items-center gap-1', dash ? 'text-dash-muted' : 'text-muted')}>
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
