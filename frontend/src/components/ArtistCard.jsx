/** Kartu artis (Top Artists di Home). */
export default function ArtistCard({ artist }) {
  return (
    <div className="flex h-[164px] min-w-0 flex-1 flex-col items-center border border-dash-line/40 bg-dash-card px-2 pt-4 transition-colors hover:bg-dash-hover">
      <div className="mb-3 flex size-20 shrink-0 items-center justify-center bg-dash-line text-[24px] font-bold leading-8 text-dash-muted">
        {artist.name[0]}
      </div>
      <p className="max-w-full truncate text-[14px] font-semibold leading-5 text-dash-ink">{artist.name}</p>
      <p className="pt-[2px] text-[12px] leading-4 text-dash-muted">{artist.tracks} tracks</p>
    </div>
  );
}
