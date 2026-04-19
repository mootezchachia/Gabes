"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

// ── Frame sequence ───────────────────────────────────────────────────────────
const FRAME_COUNT = 240;
const FRAME_DIR   = "/videos/algae-scrub-topng/ezgif-frame-";

function frameSrc(i: number) {          // i: 1-based
  return `${FRAME_DIR}${String(i).padStart(3, "0")}.jpg`;
}

// ── Layout constants (% of viewport height) ──────────────────────────────────
const LINE_TOP = 0.30;
const LINE_BOT = 0.87;
const LINE_LEN = LINE_BOT - LINE_TOP;

const NODE_Y = [0.42, 0.62, 0.80] as const;

function lineFractionAtNode(yPct: number) {
  return (yPct - LINE_TOP) / LINE_LEN;
}

function clamp(x: number, a = 0, b = 1) {
  return Math.max(a, Math.min(b, x));
}
function linearstep(e0: number, e1: number, x: number) {
  return clamp((x - e0) / (e1 - e0));
}
function smoothstep(e0: number, e1: number, x: number) {
  const t = linearstep(e0, e1, x);
  return t * t * (3 - 2 * t);
}

// ── Cover-draw onto canvas (mirrors CSS object-fit: cover) ───────────────────
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  const iw = img.naturalWidth,  ih = img.naturalHeight;
  if (!iw || !ih) return;
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale, dh = ih * scale;
  ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}

// ── Portal data ──────────────────────────────────────────────────────────────
const PORTALS = [
  {
    id: "monitor",
    side: "left" as const,
    label: "01 · Surveillance",
    title: "Moniteur NAFAS",
    body: "42 capteurs SO₂/PM, satellite TROPOMI et modélisation de panache en temps réel.",
    href: "/app/carte",
    cta: "Ouvrir le moniteur",
    accent: "#3EC99A",
  },
  {
    id: "sante",
    side: "right" as const,
    label: "02 · Santé",
    title: "Module médical",
    body: "Prévision 48h des admissions, triage IA sous supervision médicale.",
    href: "#sante",
    cta: "Découvrir",
    accent: "#378ADD",
  },
  {
    id: "architecture",
    side: "left" as const,
    label: "03 · Architecture",
    title: "Catalogue ORACLE",
    body: "Façades Mashrabiyya, corridor végétal et phycoremédiation.",
    href: "#architecture",
    cta: "Explorer",
    accent: "#3EC9D0",
  },
] as const;

// ── Component ────────────────────────────────────────────────────────────────
export function JourneySection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const frames     = useRef<HTMLImageElement[]>([]);
  const introRef   = useRef<HTMLDivElement>(null);
  const lineRef    = useRef<HTMLDivElement>(null);
  const tipRef     = useRef<HTMLDivElement>(null);
  const cardRefs   = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs    = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas  = canvasRef.current;
    if (!section || !canvas) return;

    // ── Size canvas to viewport ───────────────────────────────────
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Preload all frames ────────────────────────────────────────
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = frameSrc(i + 1);
      frames.current[i] = img;
    }

    // ── Draw frame 0 immediately (before any scroll) ──────────────
    const drawFirst = () => {
      const ctx = canvas.getContext("2d");
      if (ctx) drawCover(ctx, frames.current[0]);
    };
    if (frames.current[0].complete && frames.current[0].naturalWidth) {
      drawFirst();
    } else {
      frames.current[0].addEventListener("load", drawFirst, { once: true });
    }

    // ── RAF loop ──────────────────────────────────────────────────
    let target = 0;
    let lastIdx = -1;
    let rafId = 0;

    const getProgress = () => {
      const scrollable = section.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return 0;
      return clamp((window.scrollY - section.offsetTop) / scrollable);
    };

    const tick = () => {
      const p  = target;
      const vh = window.innerHeight;

      // ── Frame draw ─────────────────────────────────────────────
      const idx = Math.round(p * (FRAME_COUNT - 1));
      if (idx !== lastIdx) {
        lastIdx = idx;
        const img = frames.current[idx];
        if (img?.complete && img.naturalWidth) {
          const ctx = canvas.getContext("2d");
          if (ctx) drawCover(ctx, img);
        }
      }

      // ── Intro text ─────────────────────────────────────────────
      if (introRef.current) {
        const o = 1 - smoothstep(0.12, 0.24, p);
        introRef.current.style.opacity   = String(o);
        introRef.current.style.transform = `translateY(${(1 - o) * -20}px)`;
      }

      // ── Line ───────────────────────────────────────────────────
      const lp = linearstep(0.18, 0.92, p);
      if (lineRef.current) {
        lineRef.current.style.transform = `scaleY(${lp})`;
      }

      // ── Glowing tip ────────────────────────────────────────────
      if (tipRef.current) {
        const tipY = (LINE_TOP + lp * LINE_LEN) * vh;
        tipRef.current.style.top     = `${tipY}px`;
        tipRef.current.style.opacity = lp > 0.015 && lp < 0.985 ? "1" : "0";
      }

      // ── Portal cards ───────────────────────────────────────────
      PORTALS.forEach((portal, i) => {
        const fraction = lineFractionAtNode(NODE_Y[i]);
        const past     = clamp((lp - fraction) / 0.12);
        const card = cardRefs.current[i];
        const dot  = dotRefs.current[i];

        if (card) {
          const dx = (1 - smoothstep(0, 1, past)) * (portal.side === "left" ? -22 : 22);
          card.style.opacity   = String(past);
          card.style.transform = `translateX(${dx}px)`;
        }
        if (dot) {
          dot.style.transform = `translate(-50%,-50%) scale(${0.4 + smoothstep(0, 1, past) * 0.6})`;
          dot.style.boxShadow = past > 0.05 ? `0 0 ${10 * past}px 2px ${portal.accent}55` : "none";
        }
      });

      rafId = requestAnimationFrame(tick);
    };

    const onScroll = () => { target = getProgress(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={sectionRef} data-section="journey" style={{ height: "400vh" }}>
      <div className="sticky top-0 overflow-hidden" style={{ height: "100vh" }}>

        {/* ── Frame canvas background ──────────────────────────────── */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 0 }}
        />

        {/* ── Overlay ──────────────────────────────────────────────── */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(6,10,14,0.68) 0%, rgba(6,10,14,0.46) 40%, rgba(6,10,14,0.65) 100%)",
            zIndex: 1,
          }}
        />

        {/* ── Intro text ───────────────────────────────────────────── */}
        <div
          ref={introRef}
          className="absolute inset-x-0 text-center px-6"
          style={{ top: `${(LINE_TOP - 0.16) * 100}%`, willChange: "opacity, transform", zIndex: 2 }}
        >
          <div
            className="text-[10px] font-[family-name:var(--font-jetbrains)] tracking-[0.28em] uppercase mb-4"
            style={{ color: "#8FC87A" }}
          >
            NAFAS · Plateforme
          </div>
          <h2
            className="font-[family-name:var(--font-fraunces)] font-normal tracking-[-0.025em] leading-[1.0] text-[clamp(28px,4.5vw,54px)] mb-4"
            style={{ color: "#EEE8DC" }}
          >
            Un seul outil.{" "}
            <em className="not-italic italic font-light" style={{ color: "#8FC87A" }}>
              Trois décisions.
            </em>
          </h2>
          <p
            className="text-[14.5px] leading-[1.6] max-w-[38ch] mx-auto"
            style={{ color: "#9A998F" }}
          >
            Défilez pour explorer les trois modules de la plateforme.
          </p>
          <div className="mt-8 flex justify-center" aria-hidden>
            <svg width="14" height="24" viewBox="0 0 14 24" fill="none" style={{ opacity: 0.35 }}>
              <path d="M7 0v20M1 14l6 6 6-6" stroke="#8FC87A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* ── Vertical line ────────────────────────────────────────── */}
        <div
          ref={lineRef}
          className="absolute left-1/2 -translate-x-px"
          style={{
            top: `${LINE_TOP * 100}%`,
            height: `${LINE_LEN * 100}%`,
            width: "1px",
            transformOrigin: "top center",
            transform: "scaleY(0)",
            willChange: "transform",
            zIndex: 2,
            background: "linear-gradient(to bottom, #3EC99A 0%, #3EC99A 30%, #378ADD 60%, #3EC9D0 100%)",
          }}
        />

        {/* ── Glowing tip ──────────────────────────────────────────── */}
        <div
          ref={tipRef}
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            top: `${LINE_TOP * 100}%`,
            transform: "translate(-50%, -50%)",
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: "#3EC99A",
            boxShadow: "0 0 10px 3px rgba(62,201,154,0.55)",
            willChange: "top, opacity",
            opacity: 0,
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        {/* ── Portal nodes ─────────────────────────────────────────── */}
        {PORTALS.map((portal, i) => (
          <div
            key={portal.id}
            className="absolute"
            style={{ top: `${NODE_Y[i] * 100}%`, left: "50%", zIndex: 2 }}
          >
            <div
              ref={(el) => { dotRefs.current[i] = el; }}
              style={{
                position: "absolute",
                top: 0, left: 0,
                transform: "translate(-50%,-50%) scale(0.4)",
                width: "9px", height: "9px",
                borderRadius: "50%",
                background: portal.accent,
                willChange: "transform, box-shadow",
              }}
            />

            <div
              ref={(el) => { cardRefs.current[i] = el; }}
              style={{
                position: "absolute",
                top: "-30px",
                opacity: 0,
                willChange: "opacity, transform",
                ...(portal.side === "left"
                  ? { right: "22px", textAlign: "right" as const }
                  : { left: "22px" }),
                width: "clamp(190px, 25vw, 270px)",
              }}
            >
              <div
                className="p-5 rounded-xl border"
                style={{
                  background: "color-mix(in srgb, #111821 88%, transparent)",
                  borderColor: `color-mix(in srgb, ${portal.accent} 20%, rgba(255,255,255,0.04))`,
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                }}
              >
                <div
                  className="h-px w-full mb-3"
                  style={{
                    background:
                      portal.side === "left"
                        ? `linear-gradient(90deg, transparent, ${portal.accent})`
                        : `linear-gradient(90deg, ${portal.accent}, transparent)`,
                  }}
                />
                <div
                  className="text-[9.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.24em] uppercase mb-1.5"
                  style={{ color: portal.accent }}
                >
                  {portal.label}
                </div>
                <h3
                  className="font-[family-name:var(--font-fraunces)] font-light text-[20px] leading-[1.1] tracking-tight mb-2"
                  style={{ color: "#EEE8DC" }}
                >
                  {portal.title}
                </h3>
                <p
                  className="text-[12.5px] leading-[1.5] mb-4"
                  style={{ color: "#9A998F" }}
                >
                  {portal.body}
                </p>
                <Link
                  href={portal.href}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium"
                  style={{ color: portal.accent }}
                >
                  {portal.cta} →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
