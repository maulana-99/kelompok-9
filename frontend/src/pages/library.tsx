import { Library as LibraryIcon, ArrowLeft, Plus } from "lucide-react";
import { Link } from "react-router-dom";

const playlists = [
  {
    title: "Chill Vibes",
    songs: 32,
    image:
      "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=500",
  },
  {
    title: "Study Focus",
    songs: 48,
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=500",
  },
  {
    title: "Indie & Alternative",
    songs: 67,
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=500",
  },
  {
    title: "K-Pop Hits",
    songs: 54,
    image:
      "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=500",
  },
];

export default function Library() {
  return (
    <div className="min-h-screen bg-[#1B1B1B] px-8 py-6 text-[#F3F3F3]">

      <Link
        to="/home"
        className="mb-8 flex w-fit items-center gap-2 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft size={18} />
        Back to Home
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <LibraryIcon size={28} className="text-[#E9204F]" />
            <h1 className="text-3xl font-bold">
              Your Library
            </h1>
          </div>

          <p className="mt-2 text-sm text-gray-500">
            Your music collection
          </p>
        </div>

        <button className="flex items-center gap-2 rounded-full bg-[#E9204F] px-5 py-3 text-sm font-semibold">
          <Plus size={18} />
          Create Playlist
        </button>
      </div>

      <div className="mt-10 flex gap-3">
        <button className="rounded-full bg-[#E9204F] px-5 py-2 text-sm">
          Playlists
        </button>

        <button className="rounded-full bg-[#252525] px-5 py-2 text-sm text-gray-400">
          Albums
        </button>

        <button className="rounded-full bg-[#252525] px-5 py-2 text-sm text-gray-400">
          Artists
        </button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
        {playlists.map((playlist) => (
          <div
            key={playlist.title}
            className="cursor-pointer rounded-xl bg-[#222222] p-3 transition hover:bg-[#2A2A2A]"
          >
            <img
              src={playlist.image}
              alt={playlist.title}
              className="aspect-square w-full rounded-lg object-cover"
            />

            <h3 className="mt-3 truncate text-sm font-semibold">
              {playlist.title}
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              {playlist.songs} songs
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}