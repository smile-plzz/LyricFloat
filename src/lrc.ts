import type { LyricLine } from "./types";

// LRC timestamps may use hundredths ([01:23.45]) or milliseconds ([01:23.456]).
// Multiple timestamps on one line are allowed.
const TIME_TAG = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

export function parseLrc(input: string | null | undefined): LyricLine[] {
  if (!input) return [];
  const lines: LyricLine[] = [];
  const offsetTag = input.match(/\[offset:([+-]?\d+)\]/i);
  const fileOffset = offsetTag ? Number(offsetTag[1]) : 0;

  for (const rawLine of input.split(/\r?\n/)) {
    const matches = [...rawLine.matchAll(TIME_TAG)];
    if (!matches.length) continue;
    const text = rawLine.replace(TIME_TAG, "").trim();
    for (const match of matches) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      if (seconds >= 60) continue;
      const fraction = match[3] ?? "0";
      const fractionMs = Number(fraction.padEnd(3, "0").slice(0, 3));
      const timeMs = minutes * 60_000 + seconds * 1000 + fractionMs + fileOffset;
      lines.push({ timeMs: Math.max(0, timeMs), text });
    }
  }
  return lines.sort((a, b) => a.timeMs - b.timeMs);
}

export function findCurrentLine(lines: LyricLine[], positionMs: number): number {
  let low = 0;
  let high = lines.length - 1;
  let best = -1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (lines[mid].timeMs <= positionMs) {
      best = mid;
      low = mid + 1;
    } else high = mid - 1;
  }
  return best;
}
