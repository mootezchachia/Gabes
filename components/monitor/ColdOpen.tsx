"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { Map as MapboxMap } from "mapbox-gl";
import { useMonitor } from "@/lib/monitor/store";

const MONO = "var(--font-jetbrains), ui-monospace, monospace";
const DISPLAY = "var(--font-fraunces), Georgia, serif";

const STORAGE_KEY = "nafas:intro-played";

const GCT: [number, number] = [10.1178, 33.9312];
const PULLBACK_CENTER: [number, number] = [10.09, 33.88];

interface ColdOpenProps {
  map: MapboxMap | null;
}

/**
 * 7-second cold-open on first visit. Black overlay + captions + camera choreo.
 * Uses gsap.matchMedia for prefers-reduced-motion fallback.
 * Marks introPlayed in the monitor store + localStorage so it only runs once.
 */
export function ColdOpen({ map }: ColdOpenProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cap1Ref = useRef<HTMLDivElement>(null);
  const cap2Ref = useRef<HTMLDivElement>(null);
  const cap3Ref = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const introPlayed = useMonitor((s) => s.introPlayed);
  const setIntroPlayed = useMonitor((s) => s.setIntroPlayed);

  // If already played this visit (SSR hydration default is false; localStorage check
  // happens client-side in effect below), render nothing. This also covers the
  // "already marked in store" case after skip.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY) === "1") {
      setIntroPlayed(true);
    }
  }, [setIntroPlayed]);

  useEffect(() => {
    if (introPlayed) return;
    if (!map) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        full: "(prefers-reduced-motion: no-preference)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      (ctx) => {
        const { reduced } = ctx.conditions as { full: boolean; reduced: boolean };

        // reduced-motion path — skip animation, just mark played after 800ms
        if (reduced) {
          gsap.set(overlayRef.current, { autoAlpha: 0.85 });
          gsap.set([cap1Ref.current, eyebrowRef.current], { autoAlpha: 1 });
          const t = window.setTimeout(() => {
            window.localStorage.setItem(STORAGE_KEY, "1");
            setIntroPlayed(true);
          }, 800);
          return () => window.clearTimeout(t);
        }

        // Full-motion path — 7 second choreographed timeline
        const tl = gsap.timeline({
          defaults: { ease: "power2.out" },
          onComplete: () => {
            window.localStorage.setItem(STORAGE_KEY, "1");
            setIntroPlayed(true);
          },
        });
        tlRef.current = tl;

        // Beat 0 — initial state
        gsap.set(overlayRef.current, { autoAlpha: 0 });
        gsap.set([cap1Ref.current, cap2Ref.current, cap3Ref.current, eyebrowRef.current, skipRef.current], {
          autoAlpha: 0,
          y: 8,
        });

        // Beat 1 (0.0–1.0s) — overlay + eyebrow + caption 1
        tl.to(overlayRef.current, { autoAlpha: 1, duration: 0.7 }, 0)
          .to(eyebrowRef.current, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.25)
          .to(cap1Ref.current, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.35)
          .to(skipRef.current, { autoAlpha: 0.7, y: 0, duration: 0.5 }, 0.5);

        // Beat 2 (1.0s) — camera descends toward GCT
        tl.call(
          () => {
            map.easeTo({
              center: GCT,
              zoom: 12.4,
              pitch: 58,
              bearing: -24,
              duration: 2800,
              essential: true,
            });
          },
          [],
          1.0,
        );

        // Beat 3 (2.6–3.4s) — swap caption 1 → 2
        tl.to(cap1Ref.current, { autoAlpha: 0, y: -6, duration: 0.5 }, 2.6)
          .to(cap2Ref.current, { autoAlpha: 1, y: 0, duration: 0.6 }, 3.0);

        // Beat 4 (4.4s) — camera pulls out
        tl.call(
          () => {
            map.easeTo({
              center: PULLBACK_CENTER,
              zoom: 10.6,
              pitch: 46,
              bearing: -10,
              duration: 2200,
              essential: true,
            });
          },
          [],
          4.4,
        );

        // Beat 5 (5.0–5.8s) — swap caption 2 → 3
        tl.to(cap2Ref.current, { autoAlpha: 0, y: -6, duration: 0.5 }, 5.0)
          .to(cap3Ref.current, { autoAlpha: 1, y: 0, duration: 0.6 }, 5.4);

        // Beat 6 (6.4–7.1s) — fade overlay away
        tl.to(
          [cap3Ref.current, eyebrowRef.current, skipRef.current],
          { autoAlpha: 0, y: -4, duration: 0.5, stagger: 0.05 },
          6.4,
        ).to(overlayRef.current, { autoAlpha: 0, duration: 0.6 }, 6.5);

        return () => {
          tl.kill();
        };
      },
    );

    return () => {
      mm.revert();
    };
  }, [map, introPlayed, setIntroPlayed]);

  const handleSkip = () => {
    if (tlRef.current) {
      tlRef.current.progress(1).kill();
      tlRef.current = null;
    }
    // Snap camera to final pullback so the user lands on the useful frame.
    map?.easeTo({
      center: PULLBACK_CENTER,
      zoom: 10.6,
      pitch: 46,
      bearing: -10,
      duration: 900,
      essential: true,
    });
    window.localStorage.setItem(STORAGE_KEY, "1");
    setIntroPlayed(true);
  };

  if (introPlayed) return null;

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-[60] grid place-items-center pointer-events-auto"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 52%, rgba(10,15,20,0.5) 0%, rgba(10,15,20,0.88) 55%, rgba(10,15,20,0.96) 100%)",
      }}
      aria-hidden
    >
      {/* skip */}
      <button
        ref={skipRef}
        type="button"
        onClick={handleSkip}
        className="absolute top-5 right-5 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl px-3.5 py-1.5 hover:bg-black/60 hover:border-white/20 transition-colors cursor-pointer"
        style={{ fontFamily: MONO }}
        aria-label="Ignorer l'intro"
      >
        <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--nafas-ink3)]">
          Ignorer ›
        </span>
      </button>

      {/* content column */}
      <div className="relative flex flex-col items-center gap-6 max-w-[720px] px-8 text-center">
        {/* eyebrow */}
        <div
          ref={eyebrowRef}
          className="inline-flex items-center gap-3"
          style={{ fontFamily: MONO }}
        >
          <span className="size-1.5 rounded-full bg-[color:var(--nafas-danger)] animate-pulse" />
          <span className="text-[10.5px] uppercase tracking-[0.28em] text-[color:var(--nafas-danger)]">
            Alerte · 14h32 · Ghannouch
          </span>
          <span className="size-1.5 rounded-full bg-[color:var(--nafas-danger)] animate-pulse" />
        </div>

        {/* caption stage — three captions overlap at same origin */}
        <div className="relative min-h-[220px] w-full flex items-center justify-center">
          <div ref={cap1Ref} className="absolute inset-0 flex items-center justify-center">
            <h1
              style={{ fontFamily: DISPLAY }}
              className="font-light tracking-[-0.025em] leading-[1.04] text-[clamp(36px,5.5vw,72px)] text-[color:var(--nafas-surface)]"
            >
              14h32, aujourd&apos;hui.<br />
              <em className="italic font-light text-[color:var(--nafas-accent2)]">
                Gabès respire.
              </em>
            </h1>
          </div>
          <div ref={cap2Ref} className="absolute inset-0 flex items-center justify-center">
            <h2
              style={{ fontFamily: DISPLAY }}
              className="font-light tracking-[-0.02em] leading-[1.1] text-[clamp(28px,4.2vw,52px)] text-[color:var(--nafas-surface)]"
            >
              42 capteurs. 3 couches IA.<br />
              <em className="italic font-light text-[color:var(--nafas-accent2)]">
                Une seule carte.
              </em>
            </h2>
          </div>
          <div ref={cap3Ref} className="absolute inset-0 flex items-center justify-center">
            <h2
              style={{ fontFamily: DISPLAY }}
              className="font-light tracking-[-0.02em] leading-[1.1] text-[clamp(28px,4.2vw,52px)] text-[color:var(--nafas-surface)]"
            >
              Cliquez.{" "}
              <em className="italic font-light text-[color:var(--nafas-amber)]">Scrutez.</em>{" "}
              <em className="italic font-light text-[color:var(--nafas-accent2)]">Agissez.</em>
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}
