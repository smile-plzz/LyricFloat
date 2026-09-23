# Contributing to LyricFloat

Thanks for helping build LyricFloat.

## Development priorities

1. Keep the overlay fast and visually quiet.
2. Prefer system media APIs over player-specific integrations.
3. Never require account credentials when the OS already exposes the required metadata.
4. Cache external lyric lookups and respect provider rate limits.
5. Keep lyrics-provider and media-session code replaceable behind small interfaces.

## Pull requests

- Keep changes focused.
- Explain Windows-specific behavior when relevant.
- Include screenshots/video for visible UI changes.
- Avoid committing generated `dist`, `target`, or `node_modules` files.

## Reporting bugs

Include:

- Windows version
- Player (Spotify desktop, Chrome/YouTube Music, etc.)
- Whether Windows' own media controls show the correct title/artist
- LyricFloat behavior and expected behavior
