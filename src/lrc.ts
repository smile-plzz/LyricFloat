import type { LyricLine } from "./types";

const TIME_TAG = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

export function parseLrc(input: string | null | undefined): LyricLine[] {
  if (!input) return [];

  const lines: LyricLine[] = [];

  for (const rawLine of input.split(/\r?\n/)) {
    const matches = [...rawLine.matchAll(TIME_TAG)];
    if (!matches.length) continue;

    const text = rawLine.replace(TIME_TAG, "").trim();

    for (const match of matches) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fractionRaw = match[3] ?? "0";
      const fractionMs =
        fractionRaw.length === 1
          ? Number(fractionRaw) * 100
          : fractionRaw.length === 2
            ? Number(fractionRaw) * 10
            : Number(fractionRaw.slice(0, 3));

      lines.push({
        timeMs: minutes * 60_000 + seconds * 1_000 + fractionMs,
        text,
      });
    }
  }

  return lines.sort((a, b) => a.timeMs - b.timeMs);
}

export function findCurrentLine(lines: LyricLine[], positionMs: number): number {
  if (!lines.length) return -1;

  let low = 0;
  let high = lines.length - 1;
  let best = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lines[mid].timeMs <= positionMs) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}
