"use client";

import { formatAlt, formatDMS, formatHeading, useCesiumCamera } from "@/lib/monitor3d/useCesiumCamera";

/**
 * Top-left identity + live camera telemetry.
 * HealiX mark, DMS coords, altitude, heading, zoom — all tabular-nums mono.
 */
export function TacticalStatus() {
  const cam = useCesiumCamera();

  return (
    <div className="tac-panel absolute top-4 left-4 z-40 w-[248px] p-3">
      {/* brand stripe */}
      <div className="flex items-center gap-2 mb-3">
        <div
          aria-hidden
          className="size-6 grid place-items-center bg-[color:var(--nafas-cyan)] text-[color:var(--nafas-bg)] shadow-[0_0_12px_-2px_rgba(62,201,208,0.8)]"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 72%, 78% 100%, 0 100%)" }}
        >
          <span className="font-[family-name:var(--font-fraunces)] text-[14px] leading-none italic font-medium">
            N
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="tac-label text-[color:var(--nafas-surface)] tracking-[0.32em]">
            HealiX · 3D
          </div>
          <div className="mt-1 tac-label text-[8px] text-[color:var(--nafas-ink3)]/80 tracking-[0.26em]">
            Gabès sector · tactical
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="tac-dot tac-dot--accent tac-blink" />
          <span className="tac-label text-[8px] text-[color:var(--nafas-accent2)]">LIVE</span>
        </div>
      </div>

      <div className="tac-divider-h mb-3" />

      {/* camera telemetry block */}
      <div className="space-y-1.5 text-[color:var(--nafas-surface)]">
        <TelRow label="LAT" value={cam ? formatDMS(cam.lat, "lat") : "—"} />
        <TelRow label="LON" value={cam ? formatDMS(cam.lon, "lon") : "—"} />
        <TelRow label="ALT" value={cam ? formatAlt(cam.alt) : "—"} tone="amber" />
        <TelRow label="HDG" value={cam ? formatHeading(cam.heading) : "—"} />
        <TelRow
          label="ZOOM"
          value={cam ? `Z ${cam.zoom.toFixed(1).padStart(4, " ")}` : "—"}
        />
        <TelRow
          label="TILT"
          value={cam ? `${cam.pitch.toFixed(1).padStart(5, " ")}°` : "—"}
        />
      </div>

      <div className="tac-divider-h my-3" />

      {/* reticle note */}
      <div className="flex items-center justify-between">
        <span className="tac-label text-[8.5px] text-[color:var(--nafas-ink3)]/70">
          Tgt · GCT Ghannouch
        </span>
        <span className="tac-readout text-[9.5px] text-[color:var(--nafas-danger)]">
          340 µg/m³
        </span>
      </div>
    </div>
  );
}

function TelRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "amber" | "cyan";
}) {
  const valueCls =
    tone === "amber"
      ? "text-[color:var(--nafas-amber)]"
      : tone === "cyan"
        ? "text-[color:var(--nafas-cyan)]"
        : "text-[color:var(--nafas-surface)]";
  return (
    <div className="flex items-baseline gap-2">
      <span className="tac-label w-10 shrink-0 text-[8.5px] text-[color:var(--nafas-ink3)]/70 tracking-[0.32em]">
        {label}
      </span>
      <span className={`tac-readout text-[10.5px] ${valueCls} truncate`}>
        {value}
      </span>
    </div>
  );
}
