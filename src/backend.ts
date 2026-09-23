import type { LyricsPayload, NowPlaying } from "./types";

const isTauri = () => "__TAURI_INTERNALS__" in window;

async function invokeTauri<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

export async function getNowPlaying(): Promise<NowPlaying | null> {
  if (isTauri()) {
    return invokeTauri<NowPlaying | null>("get_now_playing");
  }

  const elapsed = (Date.now() % 180_000) + 12_000;
  return {
    title: "Dreams",
    artist: "Fleetwood Mac",
    album: "Rumours",
    source: "browser-preview",
    positionMs: elapsed,
    durationMs: 257_000,
    playing: true,
  };
}

export async function getLyrics(track: NowPlaying): Promise<LyricsPayload | null> {
  if (isTauri()) {
    return invokeTauri<LyricsPayload | null>("get_lyrics", {
      title: track.title,
      artist: track.artist,
      album: track.album,
      durationMs: track.durationMs,
    });
  }

  return {
    instrumental: false,
    plainLyrics: null,
    syncedLyrics: `[00:00.00] LyricFloat preview mode
[00:04.00] Start Spotify, YouTube Music, or another SMTC player
[00:08.00] The Windows build reads the active media session
[00:12.00] Synced lyrics appear here automatically
[00:16.00] Drag this widget anywhere on your desktop
[00:20.00] Current lines stay sharp while nearby lines fade
[00:24.00] Open source, lightweight, and distraction-free`,
  };
}
