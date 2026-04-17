"use client";

import { useEffect, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useSim } from "@/lib/sim/store";

/**
 * Lazy-loaded ambient loop via plain HTMLAudio.
 * We use <audio> not Tone.js for the MVP — same UX, fewer deps.
 *
 * Audio files are OPTIONAL: if /audio/ambient.mp3 is absent, the element
 * fails silently and the mute toggle still works. Drop a royalty-free
 * CC0 loop at public/audio/ambient.mp3 to activate it.
 */
export function AudioControl() {
  const muted = useSim((s) => s.audioMuted);
  const setMuted = useSim((s) => s.setAudioMuted);
  const beat = useSim((s) => s.beat);
  const aminaNotif = useSim((s) => s.aminaNotification);
  const ref = useRef<HTMLAudioElement | null>(null);
  const pingRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (muted) {
      el.pause();
    } else {
      el.volume = 0.35;
      el.play().catch(() => {
        /* autoplay blocked — user will unmute via button */
      });
    }
  }, [muted]);

  // trigger ping on Amina notification change
  useEffect(() => {
    if (muted) return;
    if (aminaNotif === "none") return;
    const p = pingRef.current;
    if (!p) return;
    p.currentTime = 0;
    p.volume = 0.5;
    p.play().catch(() => {});
  }, [aminaNotif, muted]);

  return (
    <>
      <button
        onClick={() => setMuted(!muted)}
        aria-label={muted ? "Activer le son" : "Couper le son"}
        className="absolute top-5 right-36 z-30 size-10 grid place-items-center rounded-full bg-black/45 hover:bg-black/70 backdrop-blur-md border border-white/10 text-[color:var(--nafas-surface)] transition-colors"
        title={muted ? "Son · recommandé" : "Couper le son"}
      >
        {muted ? <VolumeX className="size-4" strokeWidth={1.5} /> : <Volume2 className="size-4" strokeWidth={1.5} />}
      </button>

      {/* Gentle hint to unmute, visible only at beat b1 if still muted */}
      {muted && beat === "b1" && (
        <div className="pointer-events-none absolute top-[4.1rem] right-32 z-30 text-[10px] font-[family-name:var(--font-jetbrains)] tracking-wider uppercase text-[color:var(--nafas-ink3)]/80 whitespace-nowrap">
          Son recommandé
        </div>
      )}

      <audio ref={ref} src="/audio/ambient.mp3" loop preload="none" />
      <audio ref={pingRef} src="/audio/ping.mp3" preload="none" />
    </>
  );
}
