# LyricFloat — first Windows acceptance test

## Setup

- Windows 10 or 11 with WebView2.
- Rust stable + MSVC C++ build tools and Node.js 20+.
- Run `npm install` and `npm run tauri dev`.
- Start Spotify desktop or a browser player that participates in Windows media controls.

## Acceptance checklist

- [ ] A frameless, transparent dark lyric window opens and remains on top.
- [ ] You can drag it by the grip or track-title bar, and resize it.
- [ ] Current song and artist match the Windows media controls.
- [ ] The active lyric advances along with the song without window switching.
- [ ] Pausing shows a paused label; resuming continues the same lyric timeline.
- [ ] Seeking forward/backward updates the active lyric.
- [ ] Switching songs while a lyrics request is in progress never flashes the prior song's lyrics.
- [ ] ± controls shift lyrics by 0.25 seconds; reset restores zero.
- [ ] The timing offset survives closing and reopening the app.
- [ ] Instrumental, missing, and unsynced songs show an appropriate empty state.
- [ ] The retry button becomes available if a lookup fails.
- [ ] No mouse interaction is trapped behind an irreversible click-through mode.
- [ ] `npm run build` and `cargo check --manifest-path src-tauri/Cargo.toml` succeed.

## Known first-release boundaries

- Only the Windows current SMTC media session is used.
- Timing comes from the player-reported timeline, so players with inaccurate SMTC positions may drift.
- Line-level lyrics only; karaoke-style per-word coloring is out of scope.
- If LRCLIB doesn't have a synced match, the widget explains that rather than inventing lyrics.
- Clicking the X closes the window; tray restore and autostart are future improvements.

File reproducible issues with the media player, Windows version, track title/artist, and steps to reproduce. Do not include login information or private playback history.
