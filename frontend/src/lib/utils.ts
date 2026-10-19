import type { MusicSearchResult, Track } from '../types';

export const cx = (...parts: Array<string | false | null | undefined>): string => parts.filter(Boolean).join(' ');

// "3:45" / "1:02:33" / "3.45" — kolom album kadang ikut terbaca duration saat scraping.
const DURATION_LIKE = /^\d+([:.]\d{2})+$/;

export const toTrack = (result: MusicSearchResult): Track => {
  const album = result.album?.trim() ?? '';
  return {
    id: result.video_id,
    videoId: result.video_id,
    title: result.title,
    artist: result.artist,
    album: album && !DURATION_LIKE.test(album) ? album : '-',
    duration: result.duration,
    explicit: false,
    added: '',
    thumbnail: result.thumbnail,
  };
};

/** "3:20" / "1:02:33" -> detik */
export const toSeconds = (mmss = '0:00'): number => {
  const parts = mmss.split(':').map(Number);
  if (parts.some(Number.isNaN)) return 0;
  const [hours, minutes, seconds] =
    parts.length === 3 ? parts : [0, parts[0] ?? 0, parts[1] ?? 0];
  return hours * 3600 + minutes * 60 + seconds;
};

/** 200 -> "3:20" */
export const toClock = (total = 0): string => {
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

/** total detik -> "48 min" / "1 hr 05 min" */
export const toDurationLabel = (totalSeconds: number): string => {
  const mins = Math.round(totalSeconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} hr ${String(mins % 60).padStart(2, '0')} min`;
};

export const initialsOf = (artist = ''): string => {
  const words = artist.split(/[\s,]+/).filter(Boolean);
  if (words.length === 0) return '??';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};
