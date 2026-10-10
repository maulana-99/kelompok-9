import { ListMusic } from 'lucide-react';

/** Kartu playlist di Home (cover placeholder + judul + info). */
export default function PlaylistCard({ playlist, onOpen }) {
  const count = playlist.trackCount ?? playlist.trackIds.length;
  return (
    <button
      type="button"
      onClick={() => onOpen(playlist.id)}
      className="flex min-w-0 flex-1 flex-col border border-dash-line/40 bg-dash-card p-[17px] text-left transition-colors hover:bg-dash-hover"
    >
      <div className="mb-[14px] flex w-full items-center justify-center bg-dash-line py-[73.5px]">
        <ListMusic className="h-[25.7px] w-[34.8px] text-dash-muted" strokeWidth={1.5} />
      </div>
      <p className="w-full truncate text-[14px] font-semibold leading-5 text-dash-ink">{playlist.name}</p>
      <p className="w-full pt-[2px] text-[12px] leading-4 text-dash-muted">
        {count} tracks • {playlist.durationLabel}
      </p>
    </button>
  );
}
