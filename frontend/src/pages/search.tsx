import { Search as SearchIcon, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function Search() {
  return (
    <div className="min-h-screen bg-[#1B1B1B] px-8 py-6 text-[#F3F3F3]">

      <Link
        to="/home"
        className="mb-8 flex w-fit items-center gap-2 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft size={18} />
        Back to Home
      </Link>

      <h1 className="text-3xl font-bold">
        Search
      </h1>

      <p className="mt-2 text-sm text-gray-500">
        Search for songs, artists, albums, or playlists.
      </p>

      <div className="mt-8 flex max-w-3xl items-center gap-3 rounded-full bg-[#252525] px-5 py-4">
        <SearchIcon size={20} className="text-gray-400" />

        <input
          type="text"
          placeholder="What do you want to listen to?"
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
        />
      </div>

      <h2 className="mt-10 text-xl font-bold">
        Browse All
      </h2>

      <div className="mt-5 grid grid-cols-2 gap-5 md:grid-cols-4">
        <div className="rounded-xl bg-[#E9204F] p-6">
          <h3 className="text-lg font-bold">Music</h3>
          <p className="mt-2 text-sm text-white/70">
            Find your favorite music
          </p>
        </div>

        <div className="rounded-xl bg-[#252525] p-6">
          <h3 className="text-lg font-bold">Artists</h3>
          <p className="mt-2 text-sm text-gray-400">
            Search your favorite artists
          </p>
        </div>

        <div className="rounded-xl bg-[#252525] p-6">
          <h3 className="text-lg font-bold">Albums</h3>
          <p className="mt-2 text-sm text-gray-400">
            Explore albums
          </p>
        </div>

        <div className="rounded-xl bg-[#252525] p-6">
          <h3 className="text-lg font-bold">Playlists</h3>
          <p className="mt-2 text-sm text-gray-400">
            Discover playlists
          </p>
        </div>
      </div>

    </div>
  );
}