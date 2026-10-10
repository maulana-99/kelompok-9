// Mock data — isi teks mengikuti yang ada di desain Figma.

export const currentUser = {
  name: 'Zeika',
  handle: '@zeika',
  email: 'zeika@melodi.audio',
  plan: 'Free Plan',
};

export const tracks = [
  { id: 't1', title: 'Nights', artist: 'Frank Ocean', album: 'Blonde', duration: '5:07', explicit: true, added: '5 days ago' },
  { id: 't2', title: 'After Dark', artist: 'Mr.Kitty', album: 'Time', duration: '4:18', explicit: false, added: '1 week ago' },
  { id: 't3', title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', duration: '3:20', explicit: false, added: '2 weeks ago' },
  { id: 't4', title: 'Slow Dancing in the Dark', artist: 'Joji', album: 'BALLADS 1', duration: '3:29', explicit: true, added: '2 weeks ago' },
  { id: 't5', title: 'FE!N', artist: 'Travis Scott, Playboi Carti', album: 'UTOPIA', duration: '3:11', explicit: true, added: '3 weeks ago' },
  { id: 't6', title: 'Starboy', artist: 'The Weeknd, Daft Punk', album: 'Starboy', duration: '3:50', explicit: false, added: '1 month ago' },
  { id: 't7', title: 'Lost', artist: 'Frank Ocean', album: 'Channel Orange', duration: '3:54', explicit: false, added: '1 month ago' },
  { id: 't8', title: 'Thinkin Bout You', artist: 'Frank Ocean', album: 'Channel Orange', duration: '3:20', explicit: false, added: '1 month ago' },
  { id: 't9', title: 'Pink + White', artist: 'Frank Ocean', album: 'Blonde', duration: '3:04', explicit: false, added: '2 months ago' },
  { id: 't10', title: 'White Ferrari', artist: 'Frank Ocean', album: 'Blonde', duration: '4:08', explicit: false, added: '2 months ago' },
  { id: 't11', title: 'Out of Time', artist: 'The Weeknd', album: 'Dawn FM', duration: '3:34', explicit: false, added: '2 months ago' },
  { id: 't12', title: 'Sanctuary', artist: 'Joji', album: 'Nectar', duration: '3:00', explicit: false, added: '3 months ago' },
];

export const getTrack = (id) => tracks.find((t) => t.id === id);

export const playlists = [
  {
    id: 'p1',
    name: 'Late Night Drive',
    description: 'No traffic expressways, neon reflections, and low-frequency introspection.',
    trackCount: 12,
    durationLabel: '48 min',
    trackIds: ['t1', 't2', 't3', 't4', 't5', 't6'],
    meta: { volume: 'VOL. 04', code: 'LND', format: 'FLAC 24B', length: '48:12 / 12 TRKS' },
  },
  { id: 'p2', name: 'After Hours', description: '', trackCount: 28, durationLabel: '1 hr 42 min', trackIds: ['t3', 't11', 't6'] },
  { id: 'p3', name: 'Gym Mode', description: '', trackCount: 45, durationLabel: '2 hr 19 min', trackIds: ['t5', 't6', 't3'] },
  { id: 'p4', name: 'Rainy Days', description: '', trackCount: 19, durationLabel: '1 hr 05 min', trackIds: ['t12', 't4', 't9'] },
];

export const recentlyPlayed = [
  { trackId: 't3', subtitle: 'The Weeknd — After Hours' },
  { trackId: 't2', subtitle: 'Mr.Kitty — Time' },
  { trackId: 't1', subtitle: 'Frank Ocean — Blonde' },
  { trackId: 't4', subtitle: 'Joji — BALLADS 1' },
  { trackId: 't5', subtitle: 'Travis Scott ft. Playboi Carti — UTOPIA' },
];

export const topArtists = [
  { id: 'a1', name: 'The Weeknd', tracks: 14 },
  { id: 'a2', name: 'Frank Ocean', tracks: 9 },
  { id: 'a3', name: 'Travis Scott', tracks: 7 },
  { id: 'a4', name: 'Tyler, The Creator', tracks: 6 },
  { id: 'a5', name: 'Joji', tracks: 5 },
  { id: 'a6', name: 'SZA', tracks: 5 },
];

export const friendActivity = [
  { id: 'f1', name: 'Alex', initial: 'A', live: true, time: 'Now', track: 'White Ferrari', artist: 'Frank Ocean', highlight: true },
  { id: 'f2', name: 'Sarah', initial: 'S', live: false, time: '12m', track: 'Out of Time', artist: 'The Weeknd' },
  { id: 'f3', name: 'David', initial: 'D', live: false, time: '45m', track: 'Sanctuary', artist: 'Joji' },
  { id: 'f4', name: 'Elena', initial: 'E', live: true, time: '1h', track: 'Snooze', artist: 'SZA', highlight: true },
];

// ---- Search view ----
export const searchFilters = ['ALL', 'TRACKS', 'ARTISTS', 'PLAYLISTS', 'ALBUMS', 'PEOPLE'];

export const topResult = {
  initials: 'FO',
  name: 'Frank Ocean',
  type: 'ARTIST',
  listeners: '13.8M monthly listeners',
};

export const relevantPlaylists = [
  { id: 'r1', kind: 'wave', badge: 'COLLECTION', title: 'Frank Ocean Essentials', subtitle: 'By Melodi' },
  { id: 'r2', kind: 'text', big: 'B // CO', small: '2012-2016', title: 'Blonde & Channel Orange', subtitle: 'Complete discography' },
  { id: 'r3', kind: 'icon', small: 'R&B VIBES', title: 'Late Night R&B Vibe', subtitle: 'Ocean & Contemporaries' },
];

export const people = [
  { id: 'u1', initials: 'FO', name: 'Frank Ocean Fanclub', handle: '@frankoceanfan', followers: '14.2k followers', following: false },
  { id: 'u2', initials: 'FR', name: 'Frank O. Rodriguez', handle: '@frocean', followers: '3.8k followers', following: true },
  { id: 'u3', initials: 'OF', name: 'Ocean Frankie', handle: '@frankie_o', followers: '1.2k followers', following: false },
];
