import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import PlayerFooter from './PlayerFooter';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import type { AppContext, AppUser } from '../types';

interface AppShellProps {
  navLabel?: string;
  children: ReactNode;
  headerRight?: ReactNode;
  autoFocusSearch?: boolean;
}

/**
 * Kerangka halaman setelah login: Sidebar + Header + konten + Player bar.
 * State diambil dari usePlayer() (ada di atas <Routes>, jadi musik tetap jalan).
 */
export default function AppShell({ navLabel, children, headerRight, autoFocusSearch }: AppShellProps) {
  const player = usePlayer();
  const { user } = useAuth();
  const footerHeight = 76;

  const appUser: AppUser = user
    ? {
        id: user.id,
        name: user.name,
        username: user.username,
        created_at: user.created_at,
      }
    : { name: '', username: '' };

  const app: AppContext = {
    view: player.view,
    user: appUser,
    query: player.query,
    setQuery: player.setQuery,
    playlists: player.playlists,
    activePlaylistId: player.view === 'playlist' ? player.activePlaylistId : null,
    navigate: player.navigate,
    openPlaylist: player.openPlaylist,
    openCreate: player.openCreate,
    logout: () => {
      void player.logout();
    },
    back: player.back,
    forward: player.forward,
    canBack: player.canBack,
    canForward: player.canForward,
    currentTrack: player.currentTrack,
    trackDuration: player.trackDuration,
    isPlaying: player.isPlaying,
    progress: player.progress,
    volume: player.volume,
    likedIds: player.likedIds,
    toggleLike: player.toggleLike,
    togglePlay: player.togglePlay,
    prevTrack: player.prevTrack,
    nextTrack: player.nextTrack,
    seek: player.seek,
    setVolume: player.setVolume,
  };

  return (
    <div className="min-h-screen bg-base">
      <Sidebar
        navLabel={navLabel}
        view={app.view}
        playlists={app.playlists}
        activePlaylistId={app.activePlaylistId}
        user={app.user}
        footerHeight={footerHeight}
        onNavigate={app.navigate}
        onOpenPlaylist={app.openPlaylist}
        onCreatePlaylist={app.openCreate}
        onLogout={app.logout}
      />

      <Header
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
        track={app.currentTrack}
        total={app.trackDuration}
        isPlaying={app.isPlaying}
        progress={app.progress}
        volume={app.volume}
        liked={app.currentTrack ? app.likedIds.includes(app.currentTrack.id) : false}
        onToggleLike={() => {
          if (app.currentTrack) app.toggleLike(app.currentTrack.id);
        }}
        onTogglePlay={app.togglePlay}
        onPrev={app.prevTrack}
        onNext={app.nextTrack}
        onSeek={app.seek}
        onVolume={app.setVolume}
      />
    </div>
  );
}
