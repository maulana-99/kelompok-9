import { useState } from 'react';

// Data dummy lagu untuk dicari
const DUMMY_SONGS = [
  { id: 1, title: 'Still With You', artist: 'Jung Kook', album: 'Single' },
  { id: 2, title: 'Seven', artist: 'Jung Kook', album: 'Golden' },
  { id: 3, title: 'Night Dancer', artist: 'imase', album: 'POP' },
  { id: 4, title: 'Ditto', artist: 'NewJeans', album: 'OMG' },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');

  // Filter lagu berdasarkan input pencarian
  const filteredSongs = DUMMY_SONGS.filter(
    (song) =>
      song.title.toLowerCase().includes(query.toLowerCase()) ||
      song.artist.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-6 text-white space-y-6">
      <h1 className="text-2xl font-bold">Pencarian Musik</h1>
      
      {/* Input Search */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Cari lagu, artis, atau album..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-2 rounded-full bg-[#1e1b2e] border border-gray-700 text-sm focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Hasil Pencarian */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-400">Hasil</h2>
        {filteredSongs.length > 0 ? (
          <div className="grid gap-3">
            {filteredSongs.map((song) => (
              <div
                key={song.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[#181524] hover:bg-[#231f36] transition cursor-pointer"
              >
                <div>
                  <p className="font-medium text-white">{song.title}</p>
                  <p className="text-xs text-gray-400">{song.artist}</p>
                </div>
                <span className="text-xs text-gray-500">{song.album}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Lagu tidak ditemukan.</p>
        )}
      </div>
    </div>
  );
}