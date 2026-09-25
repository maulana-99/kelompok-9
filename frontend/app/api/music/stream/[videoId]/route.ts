import { NextResponse } from "next/server";

import { openAudioStream } from "@/lib/youtube";

// `youtubei.js` evaluates YouTube's player script with Node APIs; it cannot run
// on the edge runtime.
export const runtime = "nodejs";

/** Parses a single-range `bytes=start-end` header. Multi-range is not supported. */
function parseRange(header: string | null): { start: number; end?: number } | null {
  const match = header?.match(/^bytes=(\d+)-(\d*)$/);
  if (!match) return null;

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : undefined;
  if (!Number.isSafeInteger(start) || start < 0) return null;
  if (end !== undefined && (!Number.isSafeInteger(end) || end < start)) return null;

  return { start, end };
}

/**
 * GET /api/music/stream/[videoId] — proxy the audio track for one video.
 *
 * UNOFFICIAL: the audio URL comes from YouTube's private InnerTube endpoints via
 * `youtubei.js`, which falls outside YouTube's Terms of Service and can break at
 * any time. All scraping and URL resolution stays server-side; the client only
 * ever sees this byte stream.
 *
 * The upstream body is piped straight through — never buffered — so playback
 * starts immediately and memory stays flat regardless of track length. See
 * `openAudioStream` for why the client identity matters to range support.
 */
export async function GET(
  request: Request,
  context: RouteContext<"/api/music/stream/[videoId]">,
) {
  const { videoId } = await context.params;

  if (!/^[\w-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: "Invalid video id" }, { status: 400 });
  }

  try {
    const audio = await openAudioStream(videoId, parseRange(request.headers.get("range")) ?? undefined);

    if (!audio) {
      return NextResponse.json(
        { error: "This track is unavailable, age-restricted, or region-locked." },
        { status: 404 },
      );
    }

    const headers = new Headers({
      "Content-Type": audio.contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    });
    if (audio.contentLength) headers.set("Content-Length", String(audio.contentLength));
    if (audio.contentRange) headers.set("Content-Range", audio.contentRange);

    return new Response(audio.body, { status: audio.partial ? 206 : 200, headers });
  } catch (error) {
    console.error("[music/stream] failed", videoId, error);
    return NextResponse.json(
      { error: "Could not start playback for this track." },
      { status: 502 },
    );
  }
}
