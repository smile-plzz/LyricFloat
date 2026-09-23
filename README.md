# LyricFloat

A lightweight, open-source Windows desktop widget that shows **time-synced lyrics for whatever is currently playing**.

LyricFloat reads the active Windows media session (SMTC), looks up synced lyrics, and renders the current line in a frameless, transparent, always-on-top overlay.

## MVP features

- 🎵 Detects the current Windows media session — Spotify, YouTube Music/browser players, and other SMTC-compatible apps
- 🕒 Uses the playback timeline to keep lyrics synchronized
- 📝 Fetches timestamped LRC lyrics from [LRCLIB](https://lrclib.net)
- 🪟 Frameless, transparent, always-on-top Windows widget
- 🖱️ Drag anywhere and resize
- 👻 Fades previous/next lyric lines around the active lyric
- 🫥 Optional click-through mode
- 🔐 No Spotify account, OAuth token, or API key required
- 🧪 Browser preview mode for frontend contributors

## Stack

- **Tauri 2** — lightweight desktop shell
- **React + TypeScript + Vite** — widget UI
- **Rust** — Windows SMTC integration and lyric requests
- **Windows `GlobalSystemMediaTransportControlsSessionManager`** — now-playing metadata and timeline
- **LRCLIB** — synchronized lyrics provider

## Run locally

### Windows prerequisites

1. Node.js 20+
2. Rust stable (`rustup`)
3. Microsoft C++ Build Tools / Visual Studio Build Tools with the Desktop development with C++ workload
4. WebView2 (normally already present on Windows 10/11)

Then:

```powershell
npm install
npm run tauri dev
```

For UI-only work on any OS:

```bash
npm install
npm run dev
```

The browser preview uses demo playback/lyrics so the interface can be developed without Windows media APIs.

## How it works

```text
Windows media player / Spotify / browser
                 │
                 ▼
          Windows SMTC session
        metadata + playback time
                 │
                 ├──────────────► LRCLIB lookup (once per new song)
                 │                         │
                 │                         ▼
                 │                   timestamped LRC
                 │                         │
                 └──────────────┬──────────┘
                                ▼
                        LyricFloat overlay
```

LyricFloat polls the active media session for the current timeline. A lyric lookup only happens when the track identity changes, which avoids repeatedly hitting the lyrics provider.

## Current scope

This first release is **Windows-first**. The UI and lyrics pipeline are intentionally separated from the media adapter so macOS/Linux backends can be added later.

### Known MVP limitations

- Lyrics depend on LRCLIB coverage and timing quality.
- Players that do not expose Windows SMTC metadata cannot be detected.
- The first MVP uses line-level LRC timing, not word-by-word karaoke timing.
- Widget position persistence and tray/settings UI are planned next.

## Roadmap

- [ ] Persistent widget position and size
- [ ] System tray controls
- [ ] Font size / opacity / blur settings
- [ ] Manual lyric offset adjustment
- [ ] Better multi-session selection when several media apps are open
- [ ] Word-by-word karaoke lyrics when timing data is available
- [ ] Offline LRC cache
- [ ] Auto-start with Windows
- [ ] macOS/Linux media adapters

## Contributing

Issues and pull requests are welcome. Keep player-specific code behind an adapter boundary where possible so LyricFloat can remain player-agnostic.

## Lyrics provider etiquette

LRCLIB asks clients to avoid unnecessary requests and to respect rate limits. LyricFloat requests lyrics only when a track changes and does not batch-scan libraries.

## License

MIT
