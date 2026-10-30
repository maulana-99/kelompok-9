import { useEffect } from 'react';
import { CircleAlert, Repeat, Repeat1, Shuffle } from 'lucide-react';
import type { RepeatMode } from '../types';

/** Notifikasi singkat (tombol Acak/Ulangi, lagu gagal dimuat). `id` naik tiap kali supaya timer mulai ulang. */
export type PlayerNoticeData = { id: number } & (
  | { kind: 'shuffle'; on: boolean }
  | { kind: 'repeat'; mode: RepeatMode }
  | { kind: 'error'; text: string }
);

const NOTICE_MS = 2200;
const ERROR_NOTICE_MS = 5000;

const REPEAT_TEXT: Record<RepeatMode, string> = {
  off: 'Ulangi mati — mix baru disambung setelah antrean habis',
  all: 'Ulangi semua — antrean diputar lagi dari awal',
  one: 'Ulangi satu lagu — lagu ini diputar terus',
};

export default function PlayerNotice({ notice, onDone }: { notice: PlayerNoticeData | null; onDone: () => void }) {
  const id = notice?.id;
  const kind = notice?.kind;
  useEffect(() => {
    if (id === undefined) return undefined;
    const timer = window.setTimeout(onDone, kind === 'error' ? ERROR_NOTICE_MS : NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [id, kind, onDone]);

  let text = '';
  let icon = null;
  if (notice?.kind === 'shuffle') {
    text = notice.on ? 'Acak aktif — sisa antrean diacak' : 'Acak mati — urutan asli kembali';
    icon = <Shuffle className="size-4 shrink-0" />;
  } else if (notice?.kind === 'repeat') {
    text = REPEAT_TEXT[notice.mode];
    icon = notice.mode === 'one' ? <Repeat1 className="size-4 shrink-0" /> : <Repeat className="size-4 shrink-0" />;
  } else if (notice?.kind === 'error') {
    text = notice.text;
    icon = <CircleAlert className="size-4 shrink-0" />;
  }

  // Live region selalu ada di DOM supaya pembaca layar ikut mengumumkan perubahan.
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[92px] z-[70] flex justify-center px-4">
      {notice && (
        <div
          key={notice.id}
          className="flex max-w-full items-center gap-2 border border-line/60 bg-raised px-4 py-2 text-[13px] font-semibold text-ink shadow-card"
        >
          <span
            className={
              (notice.kind === 'error' ||
              (notice.kind === 'shuffle' ? notice.on : notice.mode !== 'off'))
                ? 'text-primary'
                : 'text-muted'
            }
          >
            {icon}
          </span>
          <span className="min-w-0">{text}</span>
        </div>
      )}
    </div>
  );
}
