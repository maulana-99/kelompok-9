import { useState } from 'react';

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0f0d1b] border-t border-gray-800 px-6 py-3 flex items-center justify-between text-white z-50">
      <div className="flex items-center space-x-3 min-w-[200px]">
        <div className="w-12 h-12 bg-purple-900/40 rounded-lg flex items-center justify-center font-bold text-xs text-purple-300 border border-purple-800/40">
          Song
        </div>
        <div>
          <h4 className="text-sm font-semibold truncate">Still With You</h4>
          <p className="text-xs text-gray-400">Jung Kook</p>
        </div>
      </div>

      <div className="flex flex-col items-center space-y-1 max-w-md w-full">
        <div className="flex items-center space-x-4">
          <button className="text-gray-400 hover:text-white text-xs">🔀</button>
          <button className="text-gray-400 hover:text-white text-sm">⏮</button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center text-white text-xs font-bold transition"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="text-gray-400 hover:text-white text-sm">⏭</button>
          <button className="text-gray-400 hover:text-white text-xs">🔁</button>
        </div>

        <div className="w-full flex items-center space-x-2 text-[10px] text-gray-400">
          <span>1:42</span>
          <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden cursor-pointer">
            <div className="w-1/3 h-full bg-purple-500"></div>
          </div>
          <span>3:59</span>
        </div>
      </div>

      <div className="flex items-center space-x-3 min-w-[150px] justify-end">
        <button className="text-gray-400 hover:text-white text-xs">🎧</button>
        <button className="text-gray-400 hover:text-white text-xs">🔊</button>
        <input
          type="range"
          min="0"
          max="100"
          className="w-16 h-1 bg-gray-800 accent-purple-500 rounded-lg cursor-pointer"
        />
      </div>
    </div>
  );
}