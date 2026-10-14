// Seed data — dipakai sebagai fallback sampai endpoint playlist tersedia.
import { toClock, toDurationLabel, toSeconds } from '../lib/utils';
import type { Playlist, Track } from '../types';

export const tracks: Track[] = [
  { id: 't1', title: 'Nights', artist: 'Frank Ocean', album: 'Blonde', duration: '5:07', explicit: true, added: '5 days ago' },
  { id: 't2', title: 'After Dark', artist: 'Mr.Kitty', album: 'Time', duration: '4:18', explicit: false, added: '1 week ago' },
  { id: 't3', title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', duration: '3:20', explicit: false, added: '2 weeks ago' },
  { id: 't4', title: 'Slow Dancing in the Dark', artist: 'Joji', album: 'BALLADS 1', duration: '3:29', explicit: true, added: '2 weeks ago' },
  { id: 't5', title: 'FE!N', artist: 'Travis Scott, Playboi Carti', album: 'UTOPIA', duration: '3:11', explicit: true, added: '3 weeks ago' },
  { id: 't6', title: 'Starboy', artist: 'The Weeknd, Daft Punk', album: 'Starboy', duration: '3:50', explicit: false, added: '1 month ago' },
  { id: 't7', title: 'Lost', artist: 'Frank Ocean', album: 'Channel Orange', duration: '3:54', explicit: false, added: '1 month ago' },
  { id: 't8', title: 'Thinkin Bout You', artist: 'Frank Ocean', album: 'Channel Orange', duration: '3:20', explicit: false, added: '1 month ago' },
  { id: 't9', title: 'Pink + White', artist: 'Frank Ocean', album: 'Blonde', duration: '3:04', explicit: false, added: '1 month ago' },
  { id: 't10', title: 'White Ferrari', artist: 'Frank Ocean', album: 'Blonde', duration: '4:08', explicit: false, added: '1 month ago' },
  { id: 't11', title: 'Out of Time', artist: 'The Weeknd', album: 'Dawn FM', duration: '3:34', explicit: false, added: '2 months ago' },
  { id: 't12', title: 'Sanctuary', artist: 'Joji', album: 'Nectar', duration: '3:00', explicit: false, added: '3 months ago' },
];

/** Hitung jumlah lagu + durasi dari trackIds supaya tidak ada label yang berbohong. */
const seed = (playlist: Omit<Playlist, 'trackCount' | 'durationLabel'>): Playlist => {
  const total = playlist.trackIds.reduce((sum, id) => {
    const track = tracks.find((t) => t.id === id);
    return sum + (track ? toSeconds(track.duration) : 0);
  }, 0);

  return {
    ...playlist,
    trackCount: playlist.trackIds.length,
    durationLabel: toDurationLabel(total),
    meta: playlist.meta
      ? { ...playlist.meta, length: `${toClock(total)} / ${playlist.trackIds.length} TRKS` }
      : undefined,
  };
};

export const playlists: Playlist[] = [
  seed({
    id: 'p1',
    name: 'Late Night Drive',
    description: 'No traffic expressways, neon reflections, and low-frequency introspection.',
    trackIds: ['t1', 't2', 't3', 't4', 't5', 't6'],
    meta: { volume: 'VOL. 04', code: 'LND', format: 'FLAC 24B', length: '' },
  }),
  seed({ id: 'p2', name: 'After Hours', description: '', trackIds: ['t3', 't11', 't6'] }),
  seed({ id: 'p3', name: 'Gym Mode', description: '', trackIds: ['t5', 't6', 't3'] }),
  seed({ id: 'p4', name: 'Rainy Days', description: '', trackIds: ['t12', 't4', 't9'] }),
];
