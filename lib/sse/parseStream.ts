/**
 * Minimal SSE parser for `event: <name>\ndata: <json>\n\n` streams.
 *
 * The previous inline parser in `PlacementAIDialog` read only `data:` lines
 * and discriminated on a `.type` field inside the JSON, but the
 * `ai_placement` edge function emits the event name on a separate `event:`
 * line and never sets `.type` on the payload. That mismatch is what made
 * the "Lancer le scan" button appear to do nothing — the stream arrived,
 * every filter matched zero items, and the UI rendered no progress.
 *
 * This module is deliberately tiny (no third-party SSE dep) and covers the
 * formats our two AI endpoints emit. If we add comments, `id:` reflection,
 * or retry fields later, grow this module rather than re-inlining parse
 * logic in components.
 */
export interface SseEvent {
  /** The dispatched event name, e.g. "placement". `null` for unnamed events. */
  event: string | null;
  /** Parsed JSON payload, or `null` if the payload couldn't be parsed. */
  data: unknown;
}

/** Split a ReadableStream into SSE events. Yields in-order, lazily. */
export async function* parseSseStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SseEvent, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      // Events are separated by a blank line ("\n\n" or "\r\n\r\n").
      const normalised = buf.replace(/\r\n/g, "\n");
      const parts = normalised.split("\n\n");
      buf = parts.pop() ?? "";
      for (const part of parts) {
        const ev = parseSseChunk(part);
        if (ev) yield ev;
      }
    }
    if (buf.trim()) {
      const ev = parseSseChunk(buf);
      if (ev) yield ev;
    }
  } finally {
    reader.releaseLock();
  }
}

/** Parse one SSE event block. Exported for tests. */
export function parseSseChunk(chunk: string): SseEvent | null {
  let event: string | null = null;
  const dataLines: string[] = [];
  for (const rawLine of chunk.split("\n")) {
    if (!rawLine || rawLine.startsWith(":")) continue; // comment or blank
    const sep = rawLine.indexOf(":");
    const field = sep === -1 ? rawLine : rawLine.slice(0, sep);
    // Per spec, a single leading space after the colon is stripped.
    let value = sep === -1 ? "" : rawLine.slice(sep + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") dataLines.push(value);
  }
  if (dataLines.length === 0 && event === null) return null;
  const joined = dataLines.join("\n");
  let data: unknown = null;
  if (joined.length > 0) {
    try {
      data = JSON.parse(joined);
    } catch {
      data = joined; // keep raw text so callers can inspect malformed payloads
    }
  }
  return { event, data };
}
