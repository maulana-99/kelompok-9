import "server-only";

import { Innertube } from "youtubei.js";

import type { Track } from "@/lib/music";

/**
 * One client for both search and playback.
 *
 * UNOFFICIAL: everything here talks to YouTube's private InnerTube endpoints
 * through `youtubei.js`. That is not a public API, is not permitted by
 * YouTube's Terms of Service, and can break whenever YouTube changes those
 * endpoints. No API key is involved, and there is no supported alternative —
 * treat failures as expected rather than exceptional.
 *
 * `Innertube.create()` downloads and evaluates YouTube's player script, which
 * resolves the signature cipher and `n` transform. That is expensive, so the
 * instance is created once per server process and the promise is shared, making
 * concurrent callers await the same handshake instead of racing to start their
 * own. The previously recommended `@distube/ytdl-core` cannot do this at all:
 * its cipher parser fails, so no format it returns has a usable URL.
 */
let clientPromise: Promise<Innertube> | undefined;

function getClient(): Promise<Innertube> {
  clientPromise ??= Innertube.create().catch((error) => {
    // Drop the rejected promise so the next request retries instead of
    // inheriting this failure forever.
    clientPromise = undefined;
    throw error;
  });
  return clientPromise;
}

export async function searchTracks(query: string): Promise<Track[]> {
  const client = await getClient();
  const results = await client.music.search(query, { type: "song" });
  const songs = results.songs?.contents ?? [];

  return songs.flatMap((song) => {
    // A song without an id cannot be streamed, so it is dropped rather than
    // rendered as a dead row.
    if (!song.id) return [];

    const thumbnails = song.thumbnail?.contents ?? song.thumbnails ?? [];
    // `MusicThumbnail.contents` is ordered largest-first; `thumbnails` on other
    // item types is smallest-first. Sorting makes both paths agree.
    const largest = [...thumbnails].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];

    return [
      {
        videoId: song.id,
        title: song.title || "Unknown title",
        artist: song.artists?.map((artist) => artist.name).join(", ") || "Unknown artist",
        thumbnail: largest?.url ?? `https://i.ytimg.com/vi/${song.id}/mqdefault.jpg`,
        duration: song.duration?.seconds ?? null,
      },
    ];
  });
}

export type AudioStream = {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  /** Size of the slice being sent, taken from the upstream response. */
  contentLength: number | null;
  /** Upstream `Content-Range`, echoed back on 206. */
  contentRange: string | null;
  partial: boolean;
};

/**
 * Resolves a playable audio URL for `videoId` and returns the upstream response
 * for the requested byte slice. The body is returned untouched, so the caller
 * can pipe it straight to the client.
 *
 * The VISIONOS client is load-bearing. Every other client yields a URL whose
 * signature is throttled: IOS and ANDROID_VR serve only the first 1 MiB of a
 * track and answer every later byte with 403, and WEB, ANDROID, MWEB and
 * TV_SIMPLY return formats with `url === null`. VISIONOS serves the whole
 * track — bounded ranges, open-ended ranges, and un-ranged requests alike.
 * The previously recommended `@distube/ytdl-core` cannot do this at all: its
 * cipher parser fails outright, so none of its formats carry a usable URL.
 *
 * Returns null when the track itself cannot be played — unavailable, removed,
 * age-restricted or region-locked. Those are ordinary outcomes for any single
 * video, not server faults, so the caller answers 404 for them.
 */
export async function openAudioStream(
  videoId: string,
  range?: { start: number; end?: number },
): Promise<AudioStream | null> {
  const client = await getClient();

  let format;
  try {
    const info = await client.getInfo(videoId, { client: "VISIONOS" });
    format = info.chooseFormat({ type: "audio", quality: "best" });
  } catch {
    // The library throws for videos with no streaming data (private, deleted,
    // premieres, most live streams).
    return null;
  }

  if (!format.url) return null;

  const headers: Record<string, string> = {};
  if (range) headers.Range = `bytes=${range.start}-${range.end ?? ""}`;

  const upstream = await fetch(format.url, { headers });
  if (!upstream.ok && upstream.status !== 206) {
    // Most often a signature that expired between resolving it and using it.
    console.error(`[music/stream] ${videoId} upstream responded ${upstream.status}`);
    return null;
  }
  if (!upstream.body) return null;

  return {
    body: upstream.body,
    contentType: format.mime_type.split(";")[0] ?? "audio/mp4",
    contentLength: Number(upstream.headers.get("content-length")) || null,
    contentRange: upstream.headers.get("content-range"),
    partial: upstream.status === 206,
  };
}
