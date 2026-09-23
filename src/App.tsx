import { useEffect, useMemo, useRef, useState } from "react";
import { EyeOff, GripHorizontal, Lock, Unlock, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getLyrics, getNowPlaying } from "./backend";
import { findCurrentLine, parseLrc } from "./lrc";
import type { LyricLine, NowPlaying } from "./types";
import "./styles.css";

const POLL_MS = 700;
const isTauri = () => "__TAURI_INTERNALS__" in window;

function trackKey(track: NowPlaying | null) {
  return track ? `${track.title}\u0000${track.artist}\u0000${track.album}` : "";
}

export default function App() {
  const [track, setTrack] = useState<NowPlaying | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  const [message, setMessage] = useState("Waiting for music…");
  const [locked, setLocked] = useState(false);
  const [clickThrough, setClickThrough] = useState(false);
  const lastTrackKey = useRef("");

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const next = await getNowPlaying();
        if (cancelled) return;
        setTrack(next);

        if (!next) {
          setLyrics([]);
          setPlainLyrics(null);
          setMessage("Play something to show synced lyrics");
          lastTrackKey.current = "";
          return;
        }

        const nextKey = trackKey(next);
        if (nextKey !== lastTrackKey.current) {
          lastTrackKey.current = nextKey;
          setMessage("Finding synced lyrics…");
          const result = await getLyrics(next);
          if (cancelled) return;

          const parsed = parseLrc(result?.syncedLyrics);
          setLyrics(parsed);
          setPlainLyrics(result?.plainLyrics ?? null);

          if (result?.instrumental) setMessage("Instrumental track");
          else if (!result) setMessage("No lyrics found");
          else if (!parsed.length) setMessage("Lyrics found, but they are not time-synced");
          else setMessage("");
        }
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Unable to read playback");
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const currentIndex = useMemo(
    () => findCurrentLine(lyrics, track?.positionMs ?? 0),
    [lyrics, track?.positionMs],
  );

  const visible = useMemo(() => {
    if (!lyrics.length) return [];
    const anchor = currentIndex < 0 ? 0 : currentIndex;
    const start = Math.max(0, anchor - 2);
    const end = Math.min(lyrics.length, anchor + 3);
    return lyrics.slice(start, end).map((line, localIndex) => ({
      ...line,
      absoluteIndex: start + localIndex,
    }));
  }, [lyrics, currentIndex]);

  const toggleClickThrough = async () => {
    const next = !clickThrough;
    setClickThrough(next);
    if (isTauri()) {
      await getCurrentWindow().setIgnoreCursorEvents(next);
    }
  };

  const close = async () => {
    if (isTauri()) await getCurrentWindow().close();
  };

  return (
    <main className={`widget-shell ${locked ? "locked" : ""}`}>
      <div className="glass" />

      <header className="toolbar">
        <button className="drag-handle" data-tauri-drag-region aria-label="Drag LyricFloat">
          <GripHorizontal size={17} />
        </button>
        <div className="track-meta" data-tauri-drag-region>
          <strong>{track?.title ?? "LyricFloat"}</strong>
          <span>{track ? track.artist : "desktop synced lyrics"}</span>
        </div>
        <div className="toolbar-actions">
          <button
            onClick={() => setLocked((value) => !value)}
            aria-label={locked ? "Unlock widget" : "Lock widget"}
            title={locked ? "Unlock widget" : "Lock widget"}
          >
            {locked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          <button onClick={toggleClickThrough} aria-label="Click-through mode" title="Click-through mode">
            <EyeOff size={14} />
          </button>
          <button onClick={close} aria-label="Close" title="Close">
            <X size={14} />
          </button>
        </div>
      </header>

      <section className="lyrics" aria-live="polite">
        {visible.length ? (
          visible.map((line) => {
            const distance = Math.abs(line.absoluteIndex - currentIndex);
            return (
              <div
                key={`${line.timeMs}-${line.absoluteIndex}`}
                className={`lyric-line ${line.absoluteIndex === currentIndex ? "current" : ""}`}
                data-distance={Math.min(distance, 2)}
              >
                {line.text || "♪"}
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <div className="pulse-dot" />
            <p>{message}</p>
            {plainLyrics && <small>Plain lyrics are available for this track.</small>}
          </div>
        )}
      </section>

      {track && lyrics.length > 0 && (
        <div className="progress" aria-hidden="true">
          <div
            className="progress-fill"
            style={{
              transform: `scaleX(${Math.min(1, Math.max(0, track.positionMs / Math.max(track.durationMs, 1)))})`,
            }}
          />
        </div>
      )}
    </main>
  );
}
