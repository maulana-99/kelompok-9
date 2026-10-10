export const cx = (...parts) => parts.filter(Boolean).join(' ');

/** "3:20" -> 200 */
export const toSeconds = (mmss = '0:00') => {
  const [m, s] = mmss.split(':').map(Number);
  return m * 60 + (s || 0);
};

/** 200 -> "3:20" */
export const toClock = (total = 0) => {
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

/** total detik -> "48 min" / "1 hr 05 min" */
export const toDurationLabel = (totalSeconds) => {
  const mins = Math.round(totalSeconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} hr ${String(mins % 60).padStart(2, '0')} min`;
};

export const initialsOf = (artist = '') => {
  const words = artist.split(/[\s,]+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};
