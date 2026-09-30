export default function Home() {
  const playlists = [
    { id: 1, title: 'Chill Vibes', tracks: '41 songs' },
    { id: 2, title: 'Study Time', tracks: '38 songs' },
    { id: 3, title: 'Late Night', tracks: '29 songs' },
    { id: 4, title: 'Workout Mix', tracks: '52 songs' },
  ];

  return (
    <div className="p-6 text-white space-y-6">
      {/* Banner / Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900">
        <h1 className="text-3xl font-bold mb-2">Selamat Datang Kembali!</h1>
        <p className="text-sm text-gray-300">Dengarkan lagu favoritmu hari ini.</p>
      </div>

      {/* Section Playlists */}
      <div>
        <h2 className="text-xl font-bold mb-4">My Playlists</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              className="p-4 rounded-xl bg-[#181524] hover:bg-[#231f36] transition cursor-pointer"
            >
              <div className="w-full h-32 bg-gray-800 rounded-lg mb-3 flex items-center justify-center text-gray-500">
                Cover
              </div>
              <h3 className="font-semibold text-sm">{pl.title}</h3>
              <p className="text-xs text-gray-400">{pl.tracks}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}