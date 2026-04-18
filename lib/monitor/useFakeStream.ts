"use client";

import { useEffect, useRef, useState } from "react";

/**
 * useFakeStream — reveals `text` char-by-char at `charsPerSec`.
 *
 * Uses requestAnimationFrame so the reveal is smooth and respects
 * browser frame timing. Resets whenever `text` changes. Once fully
 * revealed, keeps returning the full text (no further state churn).
 */
export function useFakeStream(text: string, charsPerSec = 30): string {
  const [out, setOut] = useState<string>("");
  const rafRef = useRef<number | null>(null);
  const startedRef = useRef<number>(0);
  const lastLenRef = useRef<number>(0);

  useEffect(() => {
    // Reset on text change
    setOut("");
    lastLenRef.current = 0;
    startedRef.current =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    if (!text) {
      return;
    }

    const total = text.length;
    const msPerChar = 1000 / Math.max(1, charsPerSec);

    const tick = (now: number) => {
      const elapsed = now - startedRef.current;
      const target = Math.min(total, Math.floor(elapsed / msPerChar));
      if (target !== lastLenRef.current) {
        lastLenRef.current = target;
        setOut(text.slice(0, target));
      }
      if (target < total) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Ensure final state is exactly the full text
        setOut(text);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [text, charsPerSec]);

  return out;
}
