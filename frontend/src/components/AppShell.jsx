import Sidebar from './Sidebar';
import Header from './Header';
import PlayerFooter from './PlayerFooter';
import { cx } from '../lib/utils';

/**
 * Kerangka halaman setelah login: Sidebar + Header + konten + Player bar.
 * Semua state diterima dari App (lihat App.jsx).
 */
export default function AppShell({ variant = 'base', navLabel, children, app, headerRight, autoFocusSearch }) {
  const dash = variant === 'dash';
  const footerHeight = dash ? 72 : 76;

  return (
    <div className={cx('min-h-screen', dash ? 'bg-dash-bg' : 'bg-base')}>
      <Sidebar
        variant={variant}
        navLabel={navLabel}
        view={app.view}
        playlists={app.playlists}
        activePlaylistId={app.view === 'playlist' ? app.activePlaylistId : null}
        user={app.user}
        footerHeight={footerHeight}
        onNavigate={app.navigate}
        onOpenPlaylist={app.openPlaylist}
        onCreatePlaylist={app.openCreate}
        onLogout={app.logout}
      />

      <Header
        variant={variant}
        query={app.query}
        onQueryChange={app.setQuery}
        onBack={app.back}
        onForward={app.forward}
        canBack={app.canBack}
        canForward={app.canForward}
        rightSlot={headerRight}
        autoFocus={autoFocusSearch}
      />

      <main className="min-h-screen pl-64 pt-16" style={{ paddingBottom: footerHeight + 36 }}>
        {children}
      </main>

      <PlayerFooter
        variant={variant}
        track={app.currentTrack}
        isPlaying={app.isPlaying}
        progress={app.progress}
        volume={app.volume}
        liked={app.likedIds.includes(app.currentTrack.id)}
        onToggleLike={() => app.toggleLike(app.currentTrack.id)}
        onTogglePlay={app.togglePlay}
        onPrev={app.prevTrack}
        onNext={app.nextTrack}
        onSeek={app.seek}
        onVolume={app.setVolume}
      />
    </div>
  );
}
