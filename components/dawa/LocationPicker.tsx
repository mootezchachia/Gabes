"use client";

import { useEffect, useRef, useState } from "react";
import { GABES } from "@/lib/tokens";
import type { LonLat } from "@/lib/dawa/types";

/**
 * Minimal location picker. Uses Mapbox GL JS if `NEXT_PUBLIC_MAPBOX_TOKEN`
 * is set, otherwise falls back to a simple coordinate entry + preview grid.
 *
 * Emits a committed [lon, lat] on confirm.
 */
export function LocationPicker({
  open,
  title,
  initial,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  initial: LonLat | null;
  onCancel: () => void;
  onConfirm: (p: LonLat) => void;
}) {
  const [picked, setPicked] = useState<LonLat | null>(initial);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    setPicked(initial);
  }, [initial, open]);

  useEffect(() => {
    if (!open) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !containerRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        type MarkerInst = {
          setLngLat: (c: [number, number]) => MarkerInst;
          addTo: (m: unknown) => MarkerInst;
          remove: () => void;
        };
        type MapInst = {
          on: (ev: string, fn: (...a: unknown[]) => void) => void;
          remove: () => void;
        };
        type MapboxModule = {
          accessToken: string;
          Map: new (opts: {
            container: HTMLElement;
            style: string;
            center: [number, number];
            zoom: number;
            attributionControl?: boolean;
          }) => MapInst;
          Marker: new (opts?: { color?: string }) => MarkerInst;
        };
        const mod = await import("mapbox-gl");
        const mapboxgl = mod.default as unknown as MapboxModule;
        if (cancelled) return;
        mapboxgl.accessToken = token;
        const center: [number, number] =
          (initial as [number, number] | null) ||
          (GABES.center as [number, number]);
        const map = new mapboxgl.Map({
          container: containerRef.current!,
          style: "mapbox://styles/mapbox/dark-v11",
          center,
          zoom: 12,
          attributionControl: false,
        });
        let marker: MarkerInst | null = null;
        if (initial) {
          marker = new mapboxgl.Marker({ color: "#3EC99A" })
            .setLngLat([initial[0], initial[1]])
            .addTo(map);
        }
        map.on("click", (e: unknown) => {
          const ev = e as { lngLat: { lng: number; lat: number } };
          const p: LonLat = [ev.lngLat.lng, ev.lngLat.lat];
          setPicked(p);
          if (marker) {
            marker.setLngLat([p[0], p[1]]);
          } else {
            marker = new mapboxgl.Marker({ color: "#3EC99A" })
              .setLngLat([p[0], p[1]])
              .addTo(map);
          }
        });
        mapRef.current = { remove: () => map.remove() };
      } catch {
        /* silently fall back to coord entry */
      }
    })();
    return () => {
      cancelled = true;
      try {
        mapRef.current?.remove();
      } catch {
        /* noop */
      }
      mapRef.current = null;
    };
  }, [open, initial]);

  if (!open) return null;

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-[460px] rounded-xl border border-white/[0.08] bg-[color:var(--nafas-bg2)] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <h3
            className="italic font-light text-[15px] text-[color:var(--nafas-surface)]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fermer"
            className="text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)]"
          >
            ×
          </button>
        </div>
        {token ? (
          <div
            ref={containerRef}
            className="h-[320px] w-full bg-[color:var(--nafas-bg3)]"
          />
        ) : (
          <FallbackPicker picked={picked} setPicked={setPicked} />
        )}
        <div className="px-4 py-3 flex items-center justify-between gap-3 border-t border-white/[0.06]">
          <div
            className="text-[10.5px] tabular-nums text-[color:var(--nafas-ink3)]"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            {picked
              ? `${picked[1].toFixed(4)}° N, ${picked[0].toFixed(4)}° E`
              : "Touche la carte pour choisir"}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-9 px-3 rounded-md border border-white/[0.08] text-[13px] text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)]"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={!picked}
              onClick={() => picked && onConfirm(picked)}
              className="h-9 px-3 rounded-md bg-[color:var(--nafas-accent)] hover:bg-[color:var(--nafas-accent2)] text-black text-[13px] font-medium disabled:opacity-40"
            >
              Confirmer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FallbackPicker({
  picked,
  setPicked,
}: {
  picked: LonLat | null;
  setPicked: (p: LonLat) => void;
}) {
  const [lon, setLon] = useState(String(picked?.[0] ?? GABES.center[0]));
  const [lat, setLat] = useState(String(picked?.[1] ?? GABES.center[1]));
  return (
    <div className="p-4 space-y-3">
      <div
        className="text-[11px] text-[color:var(--nafas-amber)] border border-[color:var(--nafas-amber)]/30 rounded px-2.5 py-1.5"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        Carte indisponible (NEXT_PUBLIC_MAPBOX_TOKEN manquant). Saisie manuelle.
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[10.5px] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]">
            Longitude
          </span>
          <input
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full h-9 rounded-md border border-white/[0.08] bg-[color:var(--nafas-bg3)] px-2 text-[13px] text-[color:var(--nafas-surface)] tabular-nums"
          />
        </label>
        <label className="block">
          <span className="block text-[10.5px] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]">
            Latitude
          </span>
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full h-9 rounded-md border border-white/[0.08] bg-[color:var(--nafas-bg3)] px-2 text-[13px] text-[color:var(--nafas-surface)] tabular-nums"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => {
          const n1 = Number(lon);
          const n2 = Number(lat);
          if (Number.isFinite(n1) && Number.isFinite(n2)) setPicked([n1, n2]);
        }}
        className="h-9 px-3 rounded-md border border-white/[0.08] text-[12.5px] text-[color:var(--nafas-surface)] hover:bg-white/[0.04]"
      >
        Valider les coordonnées
      </button>
    </div>
  );
}
