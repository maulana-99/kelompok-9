import {
  Home,
  Search,
  Library,
  Heart,
  Plus,
  Bell,
  Play,
  ChevronRight,
  Shuffle,
  SkipBack,
  SkipForward,
  Repeat,
  Volume2,
  ListMusic,
  Settings,
  Music2,
  MoreHorizontal,
} from "lucide-react";

import { Link } from "react-router-dom";

/* =========================
   DATA
========================= */

const recentlyPlayed = [
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
  {
    title: "Beautiful Things",
    artist: "Benson Boone",
    duration: "3:00",
    image:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500",
  },
];

const madeForYou = [
  {
    title: "Daily Mix 1",
    description: "Favorite artists, new and familiar",
    image:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500",
  },
  {
    title: "Chill Mix",
    description: "Relaxing songs for your day",
    image:
      "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=500",
  },
  {
    title: "Focus Flow",
    description: "Focus, study, create",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=500",
  },
  {
    title: "Indie Vibes",
    description: "For the dreamers",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=500",
  },
  {
    title: "K-Pop Mix",
    description: "K-Pop hits and more",
    image:
      "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=500",
  },
  {
    title: "Mood Booster",
    description: "Good vibes only",
    image:
      "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?w=500",
  },
];

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
  {
    title: "Late Night",
    songs: 28,
    image:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=500",
  },
  {
    title: "Workout",
    songs: 42,
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500",
  },
];

/* =========================
   MUSIC CARD
========================= */

function MusicCard({
  title,
  artist,
  duration,
  image,
}: {
  title: string;
  artist: string;
  duration: string;
  image: string;
}) {
  return (
    <div className="group min-w-0 cursor-pointer">
      <div className="relative overflow-hidden rounded-xl bg-[#252525]">
        <img
          src={image}
          alt={title}
          className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
        />

        <button className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#E9204F] text-white opacity-0 shadow-lg transition-all duration-200 group-hover:opacity-100 hover:scale-105">
          <Play size={16} fill="currentColor" />
        </button>
      </div>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-[#F3F3F3]">
            {title}
          </h3>

          <p className="mt-1 truncate text-xs text-gray-500">{artist}</p>
        </div>

        <span className="text-[11px] text-gray-600">{duration}</span>
      </div>
    </div>
  );
}

/* =========================
   PLAYLIST CARD
========================= */

function PlaylistCard({
  title,
  description,
  image,
}: {
  title: string;
  description: string;
  image: string;
}) {
  return (
    <div className="group min-w-0 cursor-pointer">
      <div className="relative overflow-hidden rounded-xl">
        <img
          src={image}
          alt={title}
          className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
        />

        <button className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#E9204F] text-white opacity-0 shadow-lg transition-all duration-200 group-hover:opacity-100">
          <Play size={16} fill="currentColor" />
        </button>
      </div>

      <h3 className="mt-3 truncate text-sm font-semibold text-[#F3F3F3]">
        {title}
      </h3>

      <p className="mt-1 truncate text-xs text-gray-500">{description}</p>
    </div>
  );
}

/* =========================
   SIDEBAR
========================= */

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 border-r border-[#303030] bg-[#151515] px-5 py-6 lg:block">

      {/* LOGO */}
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E9204F] text-white">
          <Music2 size={21} />
        </div>

        <h1 className="text-2xl font-bold text-[#F3F3F3]">
          Melodi
        </h1>
      </div>

      {/* MENU */}
      <nav className="space-y-2">

        {/* HOME */}
        <Link
          to="/home"
          className="flex w-full items-center gap-3 rounded-lg bg-[#E9204F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d91b48]"
        >
          <Home size={19} />
          Home
        </Link>

        {/* SEARCH */}
        <Link
          to="/search"
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-gray-400 transition hover:bg-[#252525] hover:text-white"
        >
          <Search size={19} />
          Search
        </Link>

        {/* LIBRARY */}
        <Link
          to="/library"
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-gray-400 transition hover:bg-[#252525] hover:text-white"
        >
          <Library size={19} />
          Library
        </Link>

        {/* LIKED SONGS */}
        <Link
          to="/liked-songs"
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-gray-400 transition hover:bg-[#252525] hover:text-white"
        >
          <Heart size={19} />
          Liked Songs
        </Link>

      </nav>

      <div className="my-7 border-t border-[#303030]" />

      {/* PLAYLIST */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#F3F3F3]">
          Your Playlists
        </h2>

        <button className="text-gray-400 transition hover:text-white">
          <Plus size={20} />
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {playlists.slice(0, 4).map((playlist) => (
          <div
            key={playlist.title}
            className="flex cursor-pointer items-center gap-3"
          >
            <img
              src={playlist.image}
              alt={playlist.title}
              className="h-11 w-11 rounded-md object-cover"
            />

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#F3F3F3]">
                {playlist.title}
              </p>

              <p className="text-xs text-gray-500">
                {playlist.songs} songs
              </p>
            </div>
          </div>
        ))}
      </div>

      <button className="mt-6 flex items-center gap-2 text-xs text-gray-500 hover:text-white">
        More
        <ChevronRight size={14} />
      </button>

    </aside>
  );
}

/* =========================
   PROFILE
========================= */

function ProfileSidebar() {
  return (
    <aside className="fixed right-0 top-0 hidden h-screen w-[300px] overflow-y-auto border-l border-[#303030] bg-[#151515] p-5 lg:block">

      {/* PROFILE CARD */}
      <div className="rounded-2xl border border-[#303030] bg-[#1B1B1B] p-5">

        <div className="flex justify-end">
          <button className="text-gray-400 hover:text-white">
            <Settings size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center">

          <img
            src="https://i.pinimg.com/736x/a9/bf/7b/a9bf7b46ae0c1585dba85b2c181e83d2.jpg"
            alt="Nana"
            className="h-28 w-28 rounded-full border-4 border-[#E9204F] object-cover"
          />

          <h2 className="mt-4 text-xl font-bold text-[#F3F3F3]">
            Nana
          </h2>

          <p className="text-sm text-gray-500">
            @nana@gmail.com
          </p>

          <p className="mt-4 text-center text-sm leading-6 text-gray-400">
            Just a girl who loves music, coffee, and a better tomorrow.
          </p>

          {/* STATS */}
          <div className="mt-5 grid w-full grid-cols-3 border-t border-[#303030] pt-5 text-center">

            <div>
              <p className="font-bold text-[#F3F3F3]">
                12
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Playlists
              </p>
            </div>

            <div>
              <p className="font-bold text-[#F3F3F3]">
                1.2K
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Followers
              </p>
            </div>

            <div>
              <p className="font-bold text-[#F3F3F3]">
                86
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Following
              </p>
            </div>

          </div>

          <button className="mt-5 w-full rounded-full bg-[#E9204F] py-3 text-sm font-semibold text-white transition hover:bg-[#c91843]">
            View Profile
          </button>

        </div>
      </div>

      {/* RECENTLY PLAYED */}
      <div className="mt-5 rounded-2xl border border-[#303030] bg-[#1B1B1B] p-5">

        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-semibold text-[#F3F3F3]">
            Recently Played
          </h3>

          <button className="text-gray-500 hover:text-white">
            <ChevronRight size={17} />
          </button>
        </div>

        <div className="space-y-4">
          {recentlyPlayed.slice(0, 5).map((song) => (
            <div
              key={song.title}
              className="flex items-center gap-3"
            >
              <img
                src={song.image}
                alt={song.title}
                className="h-10 w-10 rounded-lg object-cover"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#F3F3F3]">
                  {song.title}
                </p>

                <p className="truncate text-xs text-gray-500">
                  {song.artist}
                </p>
              </div>

              <button className="text-[#E9204F]">
                <Play size={15} fill="currentColor" />
              </button>
            </div>
          ))}
        </div>

      </div>

      {/* QUOTE */}
      <div className="mt-5 rounded-2xl border border-[#303030] bg-[#1B1B1B] p-5">

        <Music2
          size={20}
          className="text-[#E9204F]"
        />

        <p className="mt-3 text-sm leading-6 text-gray-400">
          "Good music makes everything feel a little brighter."
        </p>

        <div className="mt-3 flex justify-end">
          <Heart
            size={17}
            fill="currentColor"
            className="text-[#E9204F]"
          />
        </div>

      </div>

    </aside>
  );
}

/* =========================
   MUSIC PLAYER
========================= */

function MusicPlayer() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-20 border-t border-[#303030] bg-[#151515]/95 px-5 backdrop-blur-md">

      <div className="mx-auto flex h-full max-w-[1600px] items-center gap-5">

        {/* CURRENT SONG */}
        <div className="flex w-[260px] items-center gap-3">

          <img
            src={recentlyPlayed[0].image}
            alt="Snooze"
            className="h-12 w-12 rounded-lg object-cover"
          />

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#F3F3F3]">
              Snooze
            </p>

            <p className="truncate text-xs text-gray-500">
              SZA
            </p>
          </div>

          <button className="ml-auto text-[#E9204F]">
            <Heart
              size={18}
              fill="currentColor"
            />
          </button>

          <button className="text-gray-500 hover:text-white">
            <MoreHorizontal size={18} />
          </button>

        </div>

        {/* CONTROLS */}
        <div className="flex flex-1 flex-col items-center">

          <div className="flex items-center gap-6">

            <button className="text-gray-400 transition hover:text-white">
              <Shuffle size={17} />
            </button>

            <button className="text-gray-400 transition hover:text-white">
              <SkipBack
                size={18}
                fill="currentColor"
              />
            </button>

            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E9204F] text-white transition hover:scale-105">
              <Play
                size={17}
                fill="currentColor"
              />
            </button>

            <button className="text-gray-400 transition hover:text-white">
              <SkipForward
                size={18}
                fill="currentColor"
              />
            </button>

            <button className="text-gray-400 transition hover:text-white">
              <Repeat size={17} />
            </button>

          </div>

          {/* PROGRESS */}
          <div className="mt-1 flex w-full max-w-xl items-center gap-3">

            <span className="text-[10px] text-gray-500">
              1:24
            </span>

            <div className="h-1 flex-1 rounded-full bg-[#444]">
              <div className="h-1 w-[42%] rounded-full bg-[#E9204F]" />
            </div>

            <span className="text-[10px] text-gray-500">
              3:20
            </span>

          </div>

        </div>

        {/* RIGHT CONTROL */}
        <div className="hidden w-[220px] items-center justify-end gap-4 md:flex">

          <Volume2
            size={19}
            className="text-gray-400"
          />

          <div className="h-1 w-24 rounded-full bg-[#444]">
            <div className="h-1 w-[65%] rounded-full bg-[#E9204F]" />
          </div>

          <ListMusic
            size={19}
            className="text-gray-400"
          />

        </div>

      </div>
    </div>
  );
}

/* =========================
   MAIN DASHBOARD
========================= */

export default function MelodiMusicDashboard() {
  return (
    <div className="min-h-screen bg-[#1B1B1B] pb-24 text-[#F3F3F3]">

      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <main className="lg:ml-60 lg:mr-[300px]">

        <div className="px-5 py-6 md:px-8">

          {/* SEARCH BAR */}
          <div className="mb-6 flex items-center gap-3">

            <Link
              to="/search"
              className="flex flex-1 items-center gap-3 rounded-full bg-[#252525] px-5 py-3"
            >
              <Search
                size={19}
                className="text-gray-400"
              />

              <span className="text-sm text-gray-500">
                Search songs, artists, albums, or playlists...
              </span>
            </Link>

            <button className="flex h-11 w-11 items-center justify-center rounded-full bg-[#252525] text-gray-400 hover:text-white">
              <Bell size={19} />
            </button>

          </div>

          {/* HERO */}
          <section className="relative mb-9 overflow-hidden rounded-2xl bg-gradient-to-r from-[#35121d] via-[#E9204F] to-[#35121d] p-7">

            <div className="relative z-10">

              <p className="text-xs uppercase tracking-widest text-gray-200">
                Good Evening
              </p>

              <h2 className="mt-2 text-3xl font-bold text-white">
                Hello, Nana
                <span className="ml-2 text-white">
                  ♥
                </span>
              </h2>

              <p className="mt-2 text-sm text-gray-200">
                Find your next favorite song.
              </p>

              <button className="mt-5 flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#E9204F] transition hover:scale-105">
                <Play
                  size={15}
                  fill="currentColor"
                />
                Play Something
              </button>

            </div>
          </section>

          {/* RECENTLY PLAYED */}
          <section className="mb-10">

            <div className="mb-5 flex items-center justify-between">

              <div>
                <h2 className="text-xl font-bold">
                  Recently Played
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Pick up where you left off
                </p>
              </div>

              <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-white">
                See all
                <ChevronRight size={16} />
              </button>

            </div>

            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-6">

              {recentlyPlayed.map((song) => (
                <MusicCard
                  key={song.title}
                  title={song.title}
                  artist={song.artist}
                  duration={song.duration}
                  image={song.image}
                />
              ))}

            </div>
          </section>

          {/* MADE FOR YOU */}
          <section className="mb-10">

            <div className="mb-5 flex items-center justify-between">

              <div>
                <h2 className="text-xl font-bold">
                  Made For You
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Personalized playlists, just for you
                </p>
              </div>

              <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-white">
                See all
                <ChevronRight size={16} />
              </button>

            </div>

            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-6">

              {madeForYou.map((playlist) => (
                <PlaylistCard
                  key={playlist.title}
                  title={playlist.title}
                  description={playlist.description}
                  image={playlist.image}
                />
              ))}

            </div>
          </section>

          {/* POPULAR SONGS */}
          <section className="mb-10">

            <div className="mb-5 flex items-center justify-between">

              <h2 className="text-xl font-bold">
                Popular Songs
              </h2>

              <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-white">
                See all
                <ChevronRight size={16} />
              </button>

            </div>

            <div className="space-y-1">

              {recentlyPlayed.slice(0, 5).map((song, index) => (
                <div
                  key={song.title}
                  className="group flex items-center gap-4 rounded-xl p-3 transition hover:bg-[#252525]"
                >

                  <span className="w-5 text-sm text-gray-600">
                    {index + 1}
                  </span>

                  <img
                    src={song.image}
                    alt={song.title}
                    className="h-12 w-12 rounded-md object-cover"
                  />

                  <div className="min-w-0 flex-1">

                    <p className="truncate text-sm font-semibold">
                      {song.title}
                    </p>

                    <p className="truncate text-xs text-gray-500">
                      {song.artist}
                    </p>

                  </div>

                  <span className="hidden text-xs text-gray-500 sm:block">
                    {song.duration}
                  </span>

                  <button className="text-gray-500 opacity-0 transition group-hover:opacity-100 hover:text-[#E9204F]">
                    <Plus size={18} />
                  </button>

                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E9204F] text-white opacity-0 transition group-hover:opacity-100">
                    <Play
                      size={13}
                      fill="currentColor"
                    />
                  </button>

                </div>
              ))}

            </div>
          </section>

          {/* YOUR PLAYLISTS */}
          <section>

            <div className="mb-5 flex items-center justify-between">

              <div>
                <h2 className="text-xl font-bold">
                  Your Playlists
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Your personal music collection
                </p>
              </div>

              <Link
                to="/library"
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
              >
                See all
                <ChevronRight size={16} />
              </Link>

            </div>

            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-6">

              {playlists.map((playlist) => (
                <div
                  key={playlist.title}
                  className="group cursor-pointer rounded-xl bg-[#222222] p-3 transition hover:bg-[#2A2A2A]"
                >

                  <div className="relative overflow-hidden rounded-lg">

                    <img
                      src={playlist.image}
                      alt={playlist.title}
                      className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                    />

                    <button className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#E9204F] text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                      <Play
                        size={14}
                        fill="currentColor"
                      />
                    </button>

                  </div>

                  <h3 className="mt-3 truncate text-sm font-semibold">
                    {playlist.title}
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    {playlist.songs} songs
                  </p>

                </div>
              ))}

            </div>
          </section>

        </div>
      </main>

      {/* PROFILE */}
      <ProfileSidebar />

      {/* PLAYER */}
      <MusicPlayer />

    </div>
  );
}