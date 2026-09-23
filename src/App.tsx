import { useEffect, useMemo, useRef, useState } from "react";
import { GripHorizontal, Minus, Plus, RotateCcw, RefreshCw, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getLyrics, getNowPlaying } from "./backend";
import { findCurrentLine, parseLrc } from "./lrc";
import type { LyricLine, NowPlaying } from "./types";
import "./styles.css";

const POLL_MS = 700;
const OFFSET_KEY = "lyricfloat:offset-ms";
const isTauri = () => "__TAURI_INTERNALS__" in window;

function trackKey(track: NowPlaying | null): string {
  return track ? JSON.stringify([track.title, track.artist, track.album, track.durationMs]) : "";
}

function initialOffset(): number {
  try {
    const saved = Number(localStorage.getItem(OFFSET_KEY));
    return Number.isFinite(saved) ? Math.max(-5000, Math.min(5000, saved)) : 0;
  } catch {
    return 0;
  }
}

export default function App() {
  const [track, setTrack] = useState<NowPlaying | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  const [message, setMessage] = useState("Waiting for music…");
  const [offsetMs, setOffsetMs] = useState(initialOffset);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const requestedKey = useRef("");
  const latestKey = useRef("");
  const requestId = useRef(0);

  useEffect(() => {
    try { localStorage.setItem(OFFSET_KEY, String(offsetMs)); } catch { /* storage optional */ }
  }, [offsetMs]);

  useEffect(() => {
    let cancelled = false;
    requestedKey.current = "";
    let polling = false;
    let timer: number | undefined;

    const poll = async () => {
      // Never overlap media-session polls. Lyric requests run independently.
      if (polling || cancelled) return;
      polling = true;
      try {
        const next = await getNowPlaying();
        if (cancelled) return;
        setTrack(next);
        const nextKey = trackKey(next);
        latestKey.current = nextKey;

        if (!next) {
          requestId.current += 1;
          requestedKey.current = "";
          setLyrics([]);
          setPlainLyrics(null);
          setLoading(false);
          setMessage("Play music to show synced lyrics");
          return;
        }

        if (nextKey === requestedKey.current) return;
        requestedKey.current = nextKey;
        const id = ++requestId.current;
        setLyrics([]);
        setPlainLyrics(null);
        setLoading(true);
        setMessage("Finding synced lyrics…");

        // Do not block playback updates while the provider is responding.
        void getLyrics(next).then((result) => {
          if (cancelled || id !== requestId.current || nextKey !== latestKey.current) return;
          const parsed = parseLrc(result?.syncedLyrics);
          setLyrics(parsed);
          setPlainLyrics(result?.plainLyrics ?? null);
          setLoading(false);
          if (result?.instrumental) setMessage("Instrumental track");
          else if (!result) setMessage("Synced lyrics unavailable");
          else if (!parsed.length) setMessage("Only unsynchronized lyrics available");
          else setMessage("");
        }).catch((error: unknown) => {
          if (cancelled || id !== requestId.current || nextKey !== latestKey.current) return;
          setLoading(false);
          setMessage(error instanceof Error ? error.message : "Unable to fetch lyrics");
        });
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Unable to read playback");
      } finally {
        polling = false;
        if (!cancelled) timer = window.setTimeout(() => void poll(), POLL_MS);
      }
    };

    void poll();
    return () => {
      cancelled = true;
      requestId.current += 1;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [retry]);

  const currentIndex = useMemo(
    () => findCurrentLine(lyrics, Math.max(0, (track?.positionMs ?? 0) + offsetMs)),
    [lyrics, track?.positionMs, offsetMs],
  );

  const visible = useMemo(() => {
    if (!lyrics.length) return [];
    const anchor = currentIndex < 0 ? 0 : currentIndex;
    const start = Math.max(0, anchor - 1);
    const end = Math.min(lyrics.length, anchor + 2);
    return lyrics.slice(start, end).map((line, index) => ({ ...line, absoluteIndex: start + index }));
  }, [lyrics, currentIndex]);

  const close = () => {
    if (isTauri()) void getCurrentWindow().close();
  };

  return (
    <main className="widget-shell">
      <div className="glass" aria-hidden="true" />
      <header className="toolbar">
        <div className="drag-handle" data-tauri-drag-region title="Drag window">
          <GripHorizontal size={17} data-tauri-drag-region />
        </div>
        <div className="track-meta" data-tauri-drag-region>
          <strong data-tauri-drag-region>{track?.title ?? "LyricFloat"}</strong>
          <span data-tauri-drag-region>{track ? track.artist : "desktop synced lyrics"}</span>
        </div>
        <div className="toolbar-actions">
          <button onClick={() => setOffsetMs(value => Math.max(-5000, value - 250))} title="Show lyrics 0.25s later" aria-label="Lyrics later"><Minus size={14} /></button>
          <span className="offset" title="Lyrics timing adjustment">{offsetMs > 0 ? "+" : ""}{(offsetMs / 1000).toFixed(2)}s</span>
          <button onClick={() => setOffsetMs(value => Math.min(5000, value + 250))} title="Show lyrics 0.25s earlier" aria-label="Lyrics earlier"><Plus size={14} /></button>
          <button onClick={() => setOffsetMs(0)} title="Reset timing offset" aria-label="Reset timing"><RotateCcw size={14} /></button>
          {track && !loading && !!message && <button onClick={() => setRetry(value => value + 1)} title="Retry lyrics lookup" aria-label="Retry lyrics lookup"><RefreshCw size={14} /></button>}
          <button onClick={close} title="Close LyricFloat" aria-label="Close"><X size={14} /></button>
        </div>
      </header>
      <section className="lyrics" aria-label="Synchronized lyrics">
        {visible.length ? (
          <>
            {!track?.playing && <span className="paused-badge">Paused</span>}
            {visible.map(line => (
              <div
                key={line.absoluteIndex}
                className={`lyric-line ${line.absoluteIndex === currentIndex ? "current" : ""}`}
                data-distance={Math.min(2, Math.abs(line.absoluteIndex - currentIndex))}
              >{line.text || "♪"}</div>
            ))}
          </>
        ) : (
          <div className="empty-state">
            {loading && <div className="pulse-dot" aria-hidden="true" />}
            <p>{message}</p>
            {plainLyrics && <small>Lyrics exist, but line timing is unavailable.</small>}
          </div>
        )}
      </section>
      {track && lyrics.length > 0 && track.durationMs > 0 && (
        <div className="progress" aria-hidden="true">
          <div className="progress-fill" style={{
            transform: `scaleX(${Math.min(1, Math.max(0, track.positionMs / track.durationMs))})`,
          }} />
        </div>
      )}
    </main>
  );
}
