import {
  Heart,
  ArrowLeft,
  Play,
} from "lucide-react";

import { Link } from "react-router-dom";

const likedSongs = [
  {
    title: "Snooze",
    artist: "SZA",
    duration: "3:20",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500",
  },
  {
    title: "Die With A Smile",
    artist: "Lady Gaga, Bruno Mars",
    duration: "4:12",
    image:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=500",
  },
  {
    title: "Too Sweet",
    artist: "Hozier",
    duration: "4:11",
    image:
      "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=500",
  },
  {
    title: "BIRDS OF A FEATHER",
    artist: "Billie Eilish",
    duration: "3:30",
    image:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500",
  },
  {
    title: "APT.",
    artist: "ROSÉ, Bruno Mars",
    duration: "2:49",
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500",
  },
];

export default function LikedSongs() {
  return (
    <div className="min-h-screen bg-[#1B1B1B] px-8 py-6 text-[#F3F3F3]">

      <Link
        to="/home"
        className="mb-8 flex w-fit items-center gap-2 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft size={18} />
        Back to Home
      </Link>

      <div className="flex items-center gap-5">

        <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-gradient-to-br from-[#E9204F] to-[#6b1028]">
          <Heart
            size={50}
            fill="currentColor"
            className="text-white"
          />
        </div>

        <div>
          <p className="text-sm text-gray-400">
            Playlist
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Liked Songs
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Your favorite songs
          </p>
        </div>

      </div>

      <div className="mt-8">
        <button className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E9204F] text-white">
          <Play size={20} fill="currentColor" />
        </button>
      </div>

      <div className="mt-8">

        <div className="grid grid-cols-[40px_1fr_150px] border-b border-[#303030] px-4 pb-3 text-xs text-gray-500">
          <span>#</span>
          <span>Song</span>
          <span>Duration</span>
        </div>

        <div className="mt-2">

          {likedSongs.map((song, index) => (
            <div
              key={song.title}
              className="group grid grid-cols-[40px_1fr_150px] items-center rounded-lg px-4 py-3 transition hover:bg-[#252525]"
            >

              <span className="text-sm text-gray-500">
                {index + 1}
              </span>

              <div className="flex items-center gap-4">

                <img
                  src={song.image}
                  alt={song.title}
                  className="h-12 w-12 rounded-md object-cover"
                />

                <div>
                  <p className="text-sm font-semibold">
                    {song.title}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {song.artist}
                  </p>
                </div>

              </div>

              <span className="text-xs text-gray-500">
                {song.duration}
              </span>

            </div>
          ))}

        </div>
      </div>

    </div>
  );
}