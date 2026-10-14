import { Plus } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import RecentTrackList from '../components/RecentTrackList';
import PlaylistCard from '../components/PlaylistCard';
import { usePlayer } from '../context/PlayerContext';

/** Home/Dashboard View. */
export default function HomeView() {
  const { playlists, recentTracks, currentTrackId, isPlaying, playTrack, openPlaylist, openCreate } = usePlayer();

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-10 p-8">
      <section>
        <SectionHeading title="Recently Played" />
        <RecentTrackList
          items={recentTracks}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          onPlay={(id) => playTrack(id, recentTracks)}
        />
      </section>

      <section>
        <SectionHeading title="Your Playlists">
          <button
            type="button"
            aria-label="Create playlist"
            onClick={openCreate}
            className="flex size-8 items-center justify-center bg-card text-dim hover:text-primary"
          >
            <Plus className="size-[10.5px]" strokeWidth={3} />
          </button>
        </SectionHeading>

        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {playlists.slice(0, 4).map((p) => (
            <PlaylistCard key={p.id} playlist={p} onOpen={openPlaylist} />
          ))}
        </div>
      </section>
    </div>
  );
}
