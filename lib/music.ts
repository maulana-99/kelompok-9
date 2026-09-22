/**
 * Official-looking metadata shape shared by the server routes and the client
 * components. Kept dependency-free so both sides can import it.
 */
export type Track = {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  /** Seconds; `null` when YouTube Music does not report one. */
  duration: number | null;
};
