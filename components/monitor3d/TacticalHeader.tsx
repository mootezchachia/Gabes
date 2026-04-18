"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Maximize2, Volume2, VolumeX, X } from "lucide-react";
import { useMonitor } from "@/lib/monitor/store";

/**
 * Top-center tactical header. Narrow horizontal strip with classification
 * banner + live telemetry + right-side mini toolbar.
 */
export function TacticalHeader() {
  const audioMuted = useMonitor((s) => s.audioMuted);
  const setAudioMuted = useMonitor((s) => s.setAudioMuted);
  const [clock, setClock] = useState(() => utcString());
  const [fs, setFs] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setClock(utcString()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  };

  return (
    <header className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-stretch">
      {/* classification + telemetry */}
      <div className="tac-panel flex items-center divide-x divide-white/[0.08]">
        <Segment>
          <span className="tac-dot tac-dot--amber" />
          <span className="tac-label text-[9px] text-[color:var(--nafas-amber)]">
            UNCLASSIFIED · OPEN DATA
          </span>
        </Segment>
        <Segment>
          <span className="tac-label text-[8.5px] text-[color:var(--nafas-ink3)]/80">
            SENSORS
          </span>
          <span className="tac-readout text-[11px] text-[color:var(--nafas-surface)]">
            42
          </span>
          <span className="tac-label text-[8.5px] text-[color:var(--nafas-accent2)]">
            ONLINE
          </span>
        </Segment>
        <Segment>
          <span className="tac-label text-[8.5px] text-[color:var(--nafas-ink3)]/80">
            SO₂ PEAK
          </span>
          <span className="tac-readout text-[11px] text-[color:var(--nafas-danger)]">
            340 µg/m³
          </span>
        </Segment>
        <Segment>
          <span className="tac-label text-[8.5px] text-[color:var(--nafas-ink3)]/80">
            SRC
          </span>
          <span className="tac-readout text-[11px] text-[color:var(--nafas-surface)]">
            GCT · GHN
          </span>
        </Segment>
        <Segment>
          <span className="tac-label text-[8.5px] text-[color:var(--nafas-ink3)]/80">
            UTC
          </span>
          <span className="tac-readout text-[11px] text-[color:var(--nafas-surface)]">
            {clock}
          </span>
        </Segment>
      </div>

      {/* right mini toolbar */}
      <div className="ml-3 tac-panel flex items-center">
        <ToolButton
          onClick={() => setAudioMuted(!audioMuted)}
          label={audioMuted ? "Activer le son" : "Couper le son"}
        >
          {audioMuted ? (
            <VolumeX className="size-[13px]" strokeWidth={1.6} />
          ) : (
            <Volume2 className="size-[13px]" strokeWidth={1.6} />
          )}
        </ToolButton>
        <div className="tac-divider-v" />
        <ToolButton onClick={toggleFullscreen} label={fs ? "Quitter plein écran" : "Plein écran"}>
          <Maximize2 className="size-[12px]" strokeWidth={1.6} />
        </ToolButton>
        <div className="tac-divider-v" />
        <ToolButton as="link" href="/" label="Retour">
          <X className="size-[13px]" strokeWidth={1.8} />
        </ToolButton>
      </div>
    </header>
  );
}

function Segment({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 min-h-[34px]">
      {children}
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  label,
  href,
  as,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
  href?: string;
  as?: "link";
}) {
  const cls =
    "inline-flex items-center justify-center size-[34px] text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-cyan)] hover:bg-[color:var(--nafas-cyan)]/6 transition-colors cursor-pointer";
  if (as === "link" && href) {
    return (
      <Link href={href} aria-label={label} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className={cls}>
      {children}
    </button>
  );
}

function utcString(): string {
  const d = new Date();
  const hh = d.getUTCHours().toString().padStart(2, "0");
  const mm = d.getUTCMinutes().toString().padStart(2, "0");
  const ss = d.getUTCSeconds().toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}Z`;
}
