export default function UserProfile() {
  return (
    <div className="space-y-5">

      {/* PROFILE CARD */}
      <div className="rounded-2xl border border-[#303030] bg-[#1B1B1B] p-5">

        <div className="flex justify-end">
          <button className="text-gray-400 hover:text-white">
            ⚙
          </button>
        </div>

        <div className="flex flex-col items-center">

          <img
            src="https://i.pinimg.com/736x/a9/bf/7b/a9bf7b46ae0c1585dba85b2c181e83d2.jpg"
            alt="Nana"
            className="h-28 w-28 rounded-full border-4 border-[#E9204F] object-cover"
          />

          <h2 className="mt-4 text-xl font-bold">
            Nana
          </h2>

          <p className="text-sm text-gray-500">
            @im'not_nana@gmail.com
          </p>

          <p className="mt-4 text-center text-sm leading-6 text-gray-400">
            Just a girl who loves music, coffee,
            and a better tomorrow.
          </p>

          {/* STATS */}
          <div className="mt-5 grid w-full grid-cols-3 border-t border-[#303030] pt-5 text-center">

            <div>
              <p className="font-bold">12</p>
              <p className="mt-1 text-xs text-gray-500">
                Playlists
              </p>
            </div>

            <div>
              <p className="font-bold">1.2K</p>
              <p className="mt-1 text-xs text-gray-500">
                Followers
              </p>
            </div>

            <div>
              <p className="font-bold">86</p>
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
      <div className="rounded-2xl border border-[#303030] bg-[#1B1B1B] p-5">

        <div className="mb-4 flex items-center justify-between">

          <h3 className="font-semibold">
            Recently Played
          </h3>

          <button className="text-xs text-gray-500">
            See all
          </button>

        </div>

        <div className="space-y-4">

          {[
            ["Snooze", "SZA"],
            ["Die With A Smile", "Lady Gaga"],
            ["Too Sweet", "Hozier"],
            ["APT.", "ROSÉ"],
            ["Beautiful Things", "Benson Boone"],
          ].map(([title, artist]) => (

            <div
              key={title}
              className="flex items-center gap-3"
            >

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E9204F]/20 text-[#E9204F]">
                ♪
              </div>

              <div className="flex-1 overflow-hidden">

                <p className="truncate text-sm font-medium">
                  {title}
                </p>

                <p className="truncate text-xs text-gray-500">
                  {artist}
                </p>

              </div>

              <button className="text-[#E9204F]">
                ▶
              </button>

            </div>

          ))}

        </div>

      </div>

      {/* QUOTE */}
      <div className="rounded-2xl border border-[#303030] bg-[#1B1B1B] p-5">

        <div className="text-[#E9204F]">
          ♫
        </div>

        <p className="mt-3 text-sm leading-6 text-gray-400">
          "Good music makes everything feel
          a little brighter."
        </p>

        <div className="mt-3 text-right text-[#E9204F]">
          ♥
        </div>

      </div>

    </div>
  );
}