'use client';

import { useState } from 'react';

export default function MelodiMusicDashboard() {
  const [profile] = useState({
    displayName: 'nananana',
    username: 'nanana',
    location: 'Jakarta, Indonesia',
    joinDate: 'September 2026',
    bio: 'Music makes everything better; From chill vibes to late night talks, I\'m always here for good songs. 🎵',
    avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=NandaHijab',
  });

  return (
    <main className="min-h-screen bg-[#060813] text-gray-100 flex flex-col font-sans">
      <header className="h-20 border-b border-gray-800 flex items-center justify-between px-6 bg-[#060813] sticky top-0 z-50">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
            <input 
              type="search" 
              placeholder="Search songs, artists, albums..." 
              className="w-full bg-[#111421] border border-gray-700 rounded-full py-2.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-gray-400 hover:text-white text-xl">🔔</button>
          <div className="flex items-center gap-3">
            <img src={profile.avatarUrl} alt="User" className="w-10 h-10 rounded-full border border-gray-700" />
            <span className="font-medium text-sm">{profile.displayName}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r border-gray-800 bg-[#060813] p-6 flex flex-col gap-10 overflow-y-auto">
          <div className="flex items-center gap-2 text-2xl font-bold text-purple-400">
            <span>🎵</span> Melodi
          </div>
          
          <nav className="space-y-3">
            {[ {name: 'Home', icon: '🏠'}, {name: 'Search', icon: '🔍'}, {name: 'Your Library', icon: '📚'} ].map(item => (
              <a key={item.name} href="#" className="flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-gray-400 hover:bg-[#111421] hover:text-white transition text-sm">
                <span>{item.icon}</span> {item.name}
              </a>
            ))}
          </nav>

          <div className="space-y-3 flex-1">
            <h2 className="px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Playlists</h2>
            {[ 'Liked Songs', 'Chill Vibes', 'Study Time', 'Workout', 'Indie & Alternative' ].map(playlist => (
              <a key={playlist} href="#" className="flex items-center gap-3.5 px-4 py-2 text-gray-400 hover:text-white text-sm">
                <span>♥️</span> {playlist}
              </a>
            ))}
          </div>
        </aside>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 bg-[#090B18] overflow-y-auto p-8 space-y-12">
            <section className="relative bg-gradient-to-r from-purple-900/40 to-orange-900/40 rounded-3xl p-10 flex items-center gap-8 border border-gray-800">
              <div className="relative">
                <img src={profile.avatarUrl} alt="Profile" className="w-36 h-36 rounded-full border-4 border-[#060813] shadow-2xl" />
                <button className="absolute bottom-1 right-1 bg-white/10 p-2 rounded-full text-xs hover:bg-white/20">📷</button>
              </div>
              <div className="flex-1 space-y-3">
                <p className="text-sm text-gray-400">@{profile.username}</p>
                <h1 className="text-4xl font-extrabold">{profile.displayName}</h1>
                <p className="text-sm text-gray-300 max-w-xl">{profile.bio}</p>
                <div className="flex items-center gap-6 pt-2 text-xs text-gray-400">
                  <span>📍 {profile.location}</span>
                  <span>📅 Joined {profile.joinDate}</span>
                </div>
                <div className="flex gap-3 pt-4">
                  <button className="px-6 py-2.5 bg-white/10 rounded-full text-sm font-semibold hover:bg-white/20">Share Profile</button>
                  <button className="px-4 py-2.5 bg-white/10 rounded-full text-sm hover:bg-white/20">...</button>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">My Playlists</h2>
                <a href="#" className="text-purple-400 text-sm hover:underline">See all →</a>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {[ 
                  { title: 'Chill Vibes', details: '41 songs • 3h 12m' },
                  { title: 'Study Time', details: '38 songs • 2h 45m' },
                  { title: 'Late Night', details: '29 songs • 1h 50m' },
                  { title: 'Workout Mix', details: '52 songs • 3h 5m' },
                  { title: 'Indie Picks', details: '35 songs • 2h 20m' }
                ].map((item, index) => (
                  <div key={index} className="bg-[#111421] p-5 rounded-2xl border border-gray-800 group hover:border-gray-700 transition space-y-4">
                    <img src={`https://placehold.co/150x150/111421/gray?text=Playlist+${index+1}`} className="w-full aspect-square rounded-xl mb-2" alt={item.title} />
                    <h3 className="font-semibold text-base truncate group-hover:text-purple-400">{item.title}</h3>
                    <p className="text-xs text-gray-500">{item.details}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="w-[380px] border-l border-gray-800 bg-[#060813] p-8 space-y-12 overflow-y-auto">
            <section className="bg-[#111421] p-6 rounded-2xl border border-gray-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">👤 About Me</h3>
                <button className="text-gray-500 hover:text-white">🤍</button>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{profile.bio}</p>
            </section>

            <section className="space-y-5">
              <h3 className="font-bold">Favorite Genres</h3>
              <div className="flex flex-wrap gap-2.5">
                {[ {name: 'Pop', color: 'bg-red-500/20 text-red-300'}, {name: 'Indie', color: 'bg-purple-500/20 text-purple-300'}, {name: 'R&B', color: 'bg-blue-500/20 text-blue-300'}, {name: 'Lo-fi', color: 'bg-cyan-500/20 text-cyan-300'}, {name: 'K-Pop', color: 'bg-orange-500/20 text-orange-300'}].map(genre => (
                  <span key={genre.name} className={`px-4 py-1.5 rounded-full text-xs font-medium ${genre.color}`}>{genre.name}</span>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <footer className="h-24 border-t border-gray-800 bg-[#0B0D1B] flex items-center px-6 sticky bottom-0 z-50">
        <div className="flex items-center gap-4 w-64">
          <img src="https://placehold.co/56x56/111421/gray?text=Song" className="w-14 h-14 rounded-lg" alt="Cover" />
          <div>
            <p className="font-semibold text-sm">Still With You</p>
            <p className="text-xs text-gray-500">Jung Kook</p>
          </div>
          <button className="text-gray-500 hover:text-white ml-2">🤍</button>
        </div>
        <div className="flex-1 flex flex-col items-center gap-2 px-10">
          <div className="flex items-center gap-6 text-gray-400 text-lg">
            <button className="hover:text-white">🔀</button>
            <button className="hover:text-white">⏮️</button>
            <button className="text-4xl text-white">⏸️</button>
            <button className="hover:text-white">⏭️</button>
            <button className="hover:text-white">🔁</button>
          </div>
          <div className="w-full flex items-center gap-3 text-xs text-gray-600">
            <span>1:42</span>
            <div className="flex-1 h-1 bg-gray-800 rounded-full relative">
              <div className="absolute inset-y-0 left-0 w-1/3 bg-purple-500 rounded-full"></div>
            </div>
            <span>3:59</span>
          </div>
        </div>
        <div className="w-64 flex justify-end gap-4 text-gray-400">
          <span>🎧</span> <span>🔊</span> <span>💻</span>
        </div>
      </footer>
    </main>
  );
}