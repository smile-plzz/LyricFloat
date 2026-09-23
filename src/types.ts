export type NowPlaying = {
  title: string;
  artist: string;
  album: string;
  source: string;
  positionMs: number;
  durationMs: number;
  playing: boolean;
};

export type LyricsPayload = {
  syncedLyrics: string | null;
  plainLyrics: string | null;
  instrumental: boolean;
};

export type LyricLine = {
  timeMs: number;
  text: string;
};
