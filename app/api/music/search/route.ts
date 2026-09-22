import { NextResponse } from "next/server";

import { searchTracks } from "@/lib/youtube";

// `youtubei.js` needs Node APIs (it evaluates YouTube's player script), so this
// cannot run on the edge runtime.
export const runtime = "nodejs";

/**
 * GET /api/music/search?q=... — search YouTube Music.
 *
 * UNOFFICIAL: results come from YouTube's private InnerTube endpoints via
 * `youtubei.js`, not from a supported API. No key is required, but this falls
 * outside YouTube's Terms of Service and can break whenever those endpoints
 * change. The scraping stays here on the server; the client only ever sees this
 * normalised JSON.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  try {
    return NextResponse.json({ tracks: await searchTracks(query) });
  } catch (error) {
    console.error("[music/search] failed", error);
    return NextResponse.json(
      { error: "Could not reach YouTube Music. Please try again." },
      { status: 502 },
    );
  }
}
