"use client";

import { useEffect, useRef } from "react";

const CAPTIONS = [
  {
    id: 1,
    range: [0, 0.35] as [number, number],
    title: "L'algue en milieu naturel",
    sub: "Ulva lactuca · Golfe de Gabès",
  },
  {
    id: 2,
    range: [0.35, 0.68] as [number, number],
    title: "Absorption des contaminants",
    sub: "Phosphore · Cadmium · Fluorure",
  },
  {
    id: 3,
    range: [0.68, 1.0] as [number, number],
    title: "Du toxique au filtre vivant",
    sub: "NAFAS · Catalogue ORACLE",
  },
];

function captionOpacity(p: number, [from, to]: [number, number]): number {
  const fade = 0.07;
  if (p < from - fade || p > to + fade) return 0;
  if (p < from) return (p - (from - fade)) / fade;
  if (p > to) return 1 - (p - to) / fade;
  return 1;
}

export function ScrollVideoSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const captionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    video.pause();

    // Target progress is written by scroll events, consumed by RAF
    let targetProgress = 0;
    let rafId = 0;

    const computeProgress = (): number => {
      const scrollable = section.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return 0;
      return Math.max(0, Math.min(1, (window.scrollY - section.offsetTop) / scrollable));
    };

    const seek = (p: number) => {
      if (!video.duration || video.readyState < 2) return;
      const t = p * video.duration;
      // fastSeek is optimised for scrubbing (nearest keyframe, no interpolation wait)
      if ("fastSeek" in (video as object)) {
        (video as HTMLVideoElement & { fastSeek(t: number): void }).fastSeek(t);
      } else if (Math.abs(video.currentTime - t) > 1 / 30) {
        video.currentTime = t;
      }
    };

    const tick = () => {
      const p = targetProgress;

      seek(p);

      // Direct DOM updates — zero React re-renders
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${p * 100}%`;
      }
      if (counterRef.current) {
        counterRef.current.textContent = `${Math.round(p * 100)} %`;
      }
      captionRefs.current.forEach((el, i) => {
        if (!el) return;
        const o = captionOpacity(p, CAPTIONS[i].range);
        el.style.opacity = String(o);
        el.style.transform = `translateY(${(1 - o) * 20}px)`;
      });

      rafId = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      targetProgress = computeProgress();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // seed initial position
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={sectionRef} style={{ height: "500vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* video */}
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/algae-scrub.mp4" type="video/mp4" />
        </video>

        {/* overlay — darker so captions are legible */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(6,10,14,0.62) 0%, rgba(6,10,14,0.38) 35%, rgba(6,10,14,0.55) 70%, rgba(6,10,14,0.78) 100%)",
          }}
        />

        {/* section label */}
        <div className="absolute top-8 left-8 z-10">
          <div
            className="text-[10px] font-[family-name:var(--font-jetbrains)] tracking-[0.28em] uppercase"
            style={{ color: "rgba(150,200,130,0.65)" }}
          >
            NAFAS · Phycoremédiation
          </div>
        </div>

        {/* captions — all rendered, opacity driven by RAF */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none px-6">
          {CAPTIONS.map((c, i) => (
            <div
              key={c.id}
              ref={(el) => { captionRefs.current[i] = el; }}
              className="absolute text-center max-w-[640px] px-4"
              style={{ opacity: 0, willChange: "opacity, transform" }}
            >
              <h2
                className="font-[family-name:var(--font-fraunces)] font-normal tracking-[-0.02em] leading-[1.0] text-[clamp(30px,5vw,62px)] mb-3"
                style={{ color: "#EEE8DC" }}
              >
                {c.title}
              </h2>
              <p
                className="text-[11.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.24em] uppercase"
                style={{ color: "rgba(140,195,120,0.8)" }}
              >
                {c.sub}
              </p>
            </div>
          ))}
        </div>

        {/* progress bar */}
        <div className="absolute bottom-0 inset-x-0 z-10 h-px" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div
            ref={progressBarRef}
            className="h-full"
            style={{ width: "0%", background: "rgba(140,195,120,0.7)", willChange: "width" }}
          />
        </div>

        {/* counter */}
        <div className="absolute bottom-5 right-8 z-10 text-[9.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>
          <span ref={counterRef}>0 %</span>
        </div>
      </div>
    </div>
  );
}
