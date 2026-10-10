import { LayoutGrid, List, Plus } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import RecentTrackList from '../components/RecentTrackList';
import PlaylistCard from '../components/PlaylistCard';
import ArtistCard from '../components/ArtistCard';
import { recentlyPlayed, topArtists } from '../data/mock';

/** Home/Dashboard View. */
export default function HomeView({ playlists, currentTrackId, isPlaying, onPlayTrack, onOpenPlaylist, onCreatePlaylist }) {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-10 p-8">
      <section>
        <SectionHeading title="Recently Played" action="See all" />
        <RecentTrackList items={recentlyPlayed} currentTrackId={currentTrackId} isPlaying={isPlaying} onPlay={onPlayTrack} />
      </section>

      <section>
        <SectionHeading title="Your Playlists">
          <div className="flex items-center gap-[6px]">
            <button type="button" aria-label="Grid view" className="flex size-8 items-center justify-center bg-dash-card text-dash-dim hover:text-primary">
              <LayoutGrid className="size-[13.5px]" />
            </button>
            <button type="button" aria-label="Create playlist" onClick={onCreatePlaylist} className="flex size-8 items-center justify-center bg-dash-card text-dash-dim hover:text-primary">
              <Plus className="size-[10.5px]" strokeWidth={3} />
            </button>
          </div>
        </SectionHeading>

        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {playlists.slice(0, 4).map((p) => (
            <PlaylistCard key={p.id} playlist={p} onOpen={onOpenPlaylist} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="Top Artists" />
        <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
          {topArtists.map((a) => (
            <ArtistCard key={a.id} artist={a} />
          ))}
        </div>
      </section>
    </div>
  );
}
