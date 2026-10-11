export default function MusicPlayer() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-20 border-t border-[#303030] bg-[#151515]/95 px-5 backdrop-blur-md">

      <div className="mx-auto flex h-full max-w-[1600px] items-center gap-5">

        {/* SONG */}
        <div className="flex w-[250px] items-center gap-3">

          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E9204F] text-xl">
            🎵
          </div>

          <div className="min-w-0">

            <p className="truncate text-sm font-semibold">
              Snooze
            </p>

            <p className="truncate text-xs text-gray-500">
              SZA
            </p>

          </div>

          <button className="ml-auto text-[#E9204F]">
            ♥
          </button>

        </div>

        {/* CONTROLS */}
        <div className="flex flex-1 flex-col items-center">

          <div className="flex items-center gap-6">

            <button className="text-gray-400 hover:text-white">
              🔀
            </button>

            <button className="text-gray-400 hover:text-white">
              ◀
            </button>

            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E9204F] text-white">
              ▶
            </button>

            <button className="text-gray-400 hover:text-white">
              ▶
            </button>

            <button className="text-gray-400 hover:text-white">
              🔁
            </button>

          </div>

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

        {/* VOLUME */}
        <div className="hidden w-[180px] items-center justify-end gap-3 md:flex">

          <span className="text-gray-400">
            🔊
          </span>

          <div className="h-1 w-24 rounded-full bg-[#444]">

            <div className="h-1 w-[65%] rounded-full bg-[#E9204F]" />

          </div>

          <span className="text-gray-400">
            ☰
          </span>

        </div>

      </div>

    </div>
  );
}