"use client";

import { useEffect, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { AlertTriangle, Check, MapPin } from "lucide-react";
import { useSim } from "@/lib/sim/store";
import { GABES } from "@/lib/tokens";

interface AminaData {
  warning: CardData;
  clean: CardData;
}

interface CardData {
  title: string;
  subtitle: string;
  body: string;
  action: string;
  tone: "danger" | "accent";
  time: string;
}

interface Props {
  map: MapboxMap | null;
}

/**
 * Floats an "Amina's phone" notification card over her marked home.
 * Projected to screen coords each frame via map.project.
 */
export function AminaCard({ map }: Props) {
  const notif = useSim((s) => s.aminaNotification);
  const [data, setData] = useState<AminaData | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    fetch("/data/amina.json")
      .then((r) => r.json())
      .then(setData);
  }, []);

  useEffect(() => {
    if (!map) return;
    let raf = 0;

    const update = () => {
      try {
        const p = map.project(GABES.aminaHome);
        setPos({ x: p.x, y: p.y });
      } catch {
        /* map destroyed */
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [map]);

  if (!data || notif === "none" || !pos) return null;
  const card = notif === "warning" ? data.warning : data.clean;
  const Icon = card.tone === "danger" ? AlertTriangle : Check;
  const tone =
    card.tone === "danger"
      ? { ring: "border-[color:var(--nafas-danger)]/50", glow: "rgba(226,75,74,0.35)", accent: "text-[color:var(--nafas-danger)]" }
      : { ring: "border-[color:var(--nafas-accent2)]/50", glow: "rgba(62,201,154,0.35)", accent: "text-[color:var(--nafas-accent2)]" };

  return (
    <div
      className="pointer-events-none absolute z-20 transition-all duration-500"
      style={{
        left: pos.x,
        top: pos.y,
        transform: "translate(12px, -100%)",
      }}
    >
      {/* pointer line to home */}
      <svg
        className="absolute"
        style={{ left: -14, bottom: -2, width: 14, height: 30 }}
        viewBox="0 0 14 30"
      >
        <line
          x1="0"
          y1="30"
          x2="14"
          y2="0"
          stroke={card.tone === "danger" ? "#E24B4A" : "#3EC99A"}
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity="0.7"
        />
      </svg>

      <div
        className={`relative w-[240px] p-4 rounded-xl bg-[color:var(--nafas-bg2)]/95 backdrop-blur-xl border ${tone.ring}`}
        style={{ boxShadow: `0 10px 40px ${tone.glow}, 0 1px 0 rgba(255,255,255,0.04) inset` }}
        key={notif /* forces re-render with small animation via CSS key-change */}
      >
        {/* header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[10px] font-[family-name:var(--font-jetbrains)] tracking-widest uppercase text-[color:var(--nafas-ink3)]">
            <MapPin className="size-3" strokeWidth={1.5} />
            Ghannouch · {card.time}
          </div>
          <div className="text-[10px] font-[family-name:var(--font-jetbrains)] tracking-wider text-[color:var(--nafas-ink3)]">
            Amina
          </div>
        </div>

        {/* body */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`size-9 rounded-full grid place-items-center shrink-0 ${tone.accent} bg-white/5 border border-white/10`}>
            <Icon className="size-4" strokeWidth={1.5} />
          </div>
          <div>
            <div className={`text-[14.5px] font-medium ${tone.accent} leading-tight`}>
              {card.title}
            </div>
            <div className="text-[11.5px] text-[color:var(--nafas-ink3)] mt-0.5">
              {card.subtitle}
            </div>
          </div>
        </div>

        <p className="text-[13px] text-[color:var(--nafas-surface)] leading-snug mb-3">
          {card.body}
        </p>

        <div className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-wider uppercase text-[color:var(--nafas-ink3)]">
          → {card.action}
        </div>
      </div>
    </div>
  );
}
