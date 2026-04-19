"use client";

import { useEffect, useRef } from "react";

const FRAME_COUNT = 240;
const FRAME_DIR   = "/videos/bio%20based%20planch/ezgif-frame-";
const FPS         = 24;

function frameSrc(i: number) {
  return `${FRAME_DIR}${String(i).padStart(3, "0")}.jpg`;
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  const iw = img.naturalWidth,  ih = img.naturalHeight;
  if (!iw || !ih) return;
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale, dh = ih * scale;
  ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frames    = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Preload all frames
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = frameSrc(i + 1);
      frames.current[i] = img;
    }

    // Loop at FPS using RAF + elapsed time
    let rafId   = 0;
    let lastTs  = 0;
    let frameIdx = 0;
    const interval = 1000 / FPS;

    const tick = (ts: number) => {
      if (ts - lastTs >= interval) {
        lastTs = ts;
        const img = frames.current[frameIdx];
        if (img?.complete && img.naturalWidth) {
          const ctx = canvas.getContext("2d");
          if (ctx) drawCover(ctx, img);
        }
        frameIdx = (frameIdx + 1) % FRAME_COUNT;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
